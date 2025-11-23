const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { generateInvoice } = require('../utils/invoice');

// Update order status
// PATCH /api/admin/orders/:id/status { status }
router.patch('/orders/:id/status', auth, admin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const oldStatus = order.status;
    
    // If changing to 'completed', reduce stock
    if (status === 'completed' && oldStatus !== 'completed') {
      const items = order.items || [];
      for (const it of items) {
        if (it.product && it.quantity) {
          await Product.findByIdAndUpdate(it.product, { $inc: { stock: -Number(it.quantity) } });
        }
      }
    }
    
    // If changing from 'completed' back to another status, restore stock
    if (oldStatus === 'completed' && status !== 'completed') {
      const items = order.items || [];
      for (const it of items) {
        if (it.product && it.quantity) {
          await Product.findByIdAndUpdate(it.product, { $inc: { stock: Number(it.quantity) } });
        }
      }
    }
    
    order.status = status;
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin cancel order (restock items if needed)
router.patch('/orders/:id/cancel', auth, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'cancelled') return res.status(400).json({ error: 'Order already cancelled' });

    // Restock products for items
    const items = order.items || [];
    for (const it of items) {
      if (it.product && it.quantity) {
        await Product.findByIdAndUpdate(it.product, { $inc: { stock: Number(it.quantity) } });
      }
    }

    order.status = 'cancelled';
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Regenerate order invoice PDF with current settings
router.post('/orders/:id/regenerate-invoice', auth, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const inv = await generateInvoice(order.toObject());
    order.invoiceUrl = inv.urlPath;
    await order.save();
    res.json({ invoiceUrl: order.invoiceUrl });
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
    const Category = require('../models/Category');
    const ManualInvoice = require('../models/ManualInvoice');
    
    // Exclude cancelled orders from metrics
    const [users, products, orders, revenueAgg, categories, manualInvoices] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments({ status: { $ne: 'cancelled' } }),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: "$amount" } } }
      ]),
      Category.countDocuments(),
      ManualInvoice.countDocuments()
    ]);
    
    const revenue = revenueAgg[0]?.revenue || 0;
    
    // Calculate Average Order Value (excluding cancelled)
    const avgOrderValue = orders > 0 ? revenue / orders : 0;
    
    // Get orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: "$status", count: { $count: {} } } }
    ]);
    
    // Get revenue by month for current year (excluding cancelled)
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = await Order.aggregate([
      { 
        $match: { 
          status: { $ne: 'cancelled' },
          createdAt: { 
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$amount" },
          count: { $count: {} }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get products by category
    const productsByCategory = await Product.aggregate([
      { 
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$categoryInfo.name',
          count: { $count: {} },
          totalStock: { $sum: '$stock' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get low stock products count
    const lowStockProducts = await Product.countDocuments({
      $expr: { $lte: ['$stock', 10] }
    });
    
    // Get recent orders (last 7 days, excluding cancelled)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $count: {} },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({ 
      users, 
      products, 
      orders, 
      revenue,
      avgOrderValue,
      categories,
      manualInvoices,
      lowStockProducts,
      ordersByStatus,
      monthlyRevenue,
      productsByCategory,
      recentOrders
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual Invoice Management
const ManualInvoice = require('../models/ManualInvoice');

// GET /api/admin/manual-invoices - Get all manual invoices
router.get('/manual-invoices', auth, admin, async (req, res) => {
  try {
    const invoices = await ManualInvoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/manual-invoices - Create manual invoice
router.post('/manual-invoices', auth, admin, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, customerAddress, items, notes, status, dueDate } = req.body;
    
    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    // Get tax settings
    let taxPercent = 0;
    try {
      const settingsRoute = require('./settings');
      if (settingsRoute && settingsRoute.__getSettings) {
        const settings = settingsRoute.__getSettings();
        taxPercent = Number(settings.globalTaxPercent) || 0;
      }
    } catch (_) {}
    
    // Calculate tax and total
    const taxAmount = (taxPercent / 100) * subtotal;
    const total = subtotal + taxAmount;
    
    // Generate invoice number
    const count = await ManualInvoice.countDocuments();
    const invoiceNumber = `INV-${Date.now()}-${count + 1}`;
    
    const invoice = new ManualInvoice({
      invoiceNumber,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      items,
      subtotal,
      taxPercent,
      taxAmount,
      total,
      notes,
      status: status || 'draft',
      dueDate,
      createdBy: req.user._id
    });
    
    await invoice.save();
    
    // Generate PDF invoice
    try {
      const { filePath, urlPath } = await generateInvoice({
        _id: invoice._id,
        amount: total,
        subtotal,
        taxPercent,
        taxAmount,
        shippingCost: 0,
        items,
        user: { name: customerName, email: customerEmail },
        shipping: { address: customerAddress, phone: customerPhone },
        createdAt: invoice.createdAt
      });
      invoice.invoiceUrl = urlPath;
      await invoice.save();
    } catch (pdfErr) {
      console.error('PDF generation failed:', pdfErr);
    }
    
    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/manual-invoices/:id - Update manual invoice
router.put('/manual-invoices/:id', auth, admin, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const invoice = await ManualInvoice.findByIdAndUpdate(
      req.params.id,
      { status, notes },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/manual-invoices/:id - Delete manual invoice
router.delete('/manual-invoices/:id', auth, admin, async (req, res) => {
  try {
    const invoice = await ManualInvoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/clients - Create client profile
router.post('/clients', auth, admin, async (req, res) => {
  try {
    const { name, email, phone, address, city, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Generate random password if not provided
    const rawPassword = password || Math.random().toString(36).slice(-8);
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);
    
    const user = new User({
      name,
      email,
      phone,
      address,
      city,
      password: hashedPassword,
      role: 'user' // Set as 'user' (customer role)
    });
    
    await user.save();
    
    // Don't send password back, but include the raw password in response if it was auto-generated
    const userObj = user.toObject();
    delete userObj.password;
    
    // If password was auto-generated, return it so admin can share with client
    if (!password) {
      userObj.generatedPassword = rawPassword;
    }
    
    res.status(201).json(userObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
