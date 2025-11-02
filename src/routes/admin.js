const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// Update order status
// PATCH /api/admin/orders/:id/status { status }
router.patch('/orders/:id/status', auth, admin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle product featured or status
// PATCH /api/admin/products/:id/meta { featured?, status? }
router.patch('/products/:id/meta', auth, admin, async (req, res) => {
  try {
    const { featured, status } = req.body;
    const updates = {};
    if (typeof featured === 'boolean') updates.featured = featured;
    if (typeof status === 'boolean') updates.status = status;
    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Basic stats for dashboard
// GET /api/admin/stats
router.get('/stats', auth, admin, async (req, res) => {
  try {
    const [users, products, orders, revenueAgg] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([
        { $group: { _id: null, revenue: { $sum: "$amount" } } }
      ])
    ]);
    const revenue = revenueAgg[0]?.revenue || 0;
    res.json({ users, products, orders, revenue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
