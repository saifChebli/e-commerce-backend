const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { generateInvoice } = require('../utils/invoice');
const path = require('path');
const fs = require('fs');

// Helper to compute totals based on items and shipping method
async function computeTotals(items, shippingMethod, paymentMethod) {
  // Compute subtotal from items
  const subtotal = items.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);

  // Load settings dynamically
  let taxPercent = 0;
  try {
    const settingsRoute = require('../routes/settings');
    if (settingsRoute && settingsRoute.__getSettings) {
      const s = settingsRoute.__getSettings();
      taxPercent = Number(s.globalTaxPercent) || 0;
    }
  } catch (_) {}

  // Determine shipping cost
  let resolvedShippingMethod = shippingMethod || (paymentMethod === 'local_pickup' ? 'local_pickup' : 'standard');
  let shippingCost = 0;
  if (resolvedShippingMethod === 'local_pickup') {
    shippingCost = 0;
  } else {
    // Determine tier cost by max tier among items
    const productIds = items.map(it => it.product).filter(Boolean);
    let tierCost = 0;
    if (productIds.length) {
      const prods = await Product.find({ _id: { $in: productIds } }).select('shippingTier');
      const tierToCost = { T2: 15, T4: 20, T6: 25, T8PLUS: 35 };
      for (const p of prods) tierCost = Math.max(tierCost, tierToCost[p.shippingTier] || 0);
    }
    // If no product shipping tier set, fallback by weight/dimensions if provided in items
    if (!tierCost) {
      const estimateFromItem = (it) => {
        const w = Number(it.weight || 0);
        const d = it.dimensions || {};
        const L = Number(d.length || 0), W = Number(d.width || 0), H = Number(d.height || 0);
        if (w <= 2 && L <= 30 && W <= 30 && H <= 20) return 15;
        if (w <= 4 && L <= 40 && W <= 40 && H <= 25) return 20;
        if (w <= 6 && L <= 40 && W <= 40 && H <= 25) return 25;
        return 35;
      };
      tierCost = items.reduce((max, it) => Math.max(max, estimateFromItem(it)), 0);
    }
    shippingCost = tierCost;
  }

  const taxAmount = (taxPercent / 100) * (subtotal + shippingCost);
  const amount = subtotal + shippingCost + taxAmount;
  return { subtotal, shippingCost, taxPercent, taxAmount, amount, shippingMethod: resolvedShippingMethod };
}

// create order
router.post('/', auth, async (req, res) => {
  try {
    const { items = [], shipping, shippingMethod, paymentMethod, paymentIntentId, paymentStatus } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items in order' });
    const { subtotal, shippingCost, taxPercent, taxAmount, amount, shippingMethod: resolvedShippingMethod } = await computeTotals(items, shippingMethod, paymentMethod);

    const order = new Order({
      user: req.user._id,
      items,
      subtotal,
      taxPercent,
      taxAmount,
      shippingCost,
      amount,
      shipping,
      shippingMethod: resolvedShippingMethod,
      paymentMethod,
      paymentIntentId: paymentIntentId || undefined,
      paymentStatus: paymentStatus || (paymentMethod === 'card' ? 'paid' : 'pending')
    });
    await order.save();
    // populate for invoice context
    await order.populate('user', 'name email');
    // Generate invoice PDF
    const inv = await generateInvoice(order.toObject());
    order.invoiceUrl = inv.urlPath;
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// quote totals without creating order
router.post('/quote', auth, async (req, res) => {
  try {
    const { items = [], shippingMethod, paymentMethod } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items in order' });
    const totals = await computeTotals(items, shippingMethod, paymentMethod);
    res.json(totals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get all orders (admin)
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// download invoice (owner or admin)
router.get('/:id/invoice', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!order.invoiceUrl) return res.status(404).json({ error: 'Invoice not available' });
    const filePath = path.join(__dirname, '..', '..', order.invoiceUrl.replace('/uploads', 'uploads'));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Invoice file missing' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // allow owner or admin
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
