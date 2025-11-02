const express = require('express');
const router = express.Router();
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
