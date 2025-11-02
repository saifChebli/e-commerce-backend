const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const { generateInvoice } = require('../utils/invoice');
const path = require('path');
const fs = require('fs');

// create order
router.post('/', auth, async (req, res) => {
  try {
    const { items, amount, shipping, paymentMethod, paymentIntentId, paymentStatus } = req.body;
    const order = new Order({
      user: req.user._id,
      items,
      amount,
      shipping,
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
