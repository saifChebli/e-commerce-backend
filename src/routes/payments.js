const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Stripe setup
let stripe = null;
try {
  const key = process.env.STRIPE_SECRET_KEY;
  if (key) {
    stripe = require('stripe')(key);
  }
} catch (e) {
  console.warn('Stripe not initialized:', e.message);
}

// Create Payment Intent
router.post('/create-intent', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured on server' });
    const { amount, currency = 'usd' } = req.body || {};
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // amount in cents
      currency,
      metadata: { userId: req.user._id.toString() }
    });
    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// Stripe webhook handler (mount with express.raw in index.js)
async function webhookHandler(req, res) {
  try {
    const sig = req.headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !secret) {
      // In dev, allow early 200 to avoid retries
      return res.status(200).send();
    }
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        try {
          await Order.findOneAndUpdate(
            { paymentIntentId: pi.id },
            { $set: { paymentStatus: 'paid' } },
            { new: true }
          );
        } catch (_) {}
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        try {
          await Order.findOneAndUpdate(
            { paymentIntentId: pi.id },
            { $set: { paymentStatus: 'failed' } },
            { new: true }
          );
        } catch (_) {}
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (e) {
    res.status(500).send('Webhook handler error');
  }
}

// Attach as property so index.js can import it directly
router.webhook = webhookHandler;
module.exports.webhook = webhookHandler;
