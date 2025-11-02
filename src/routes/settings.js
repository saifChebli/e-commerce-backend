const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// In-memory fallback; for production, store in a collection
let settings = {
  storeName: 'Boutique 2V Technologies',
  storeEmail: 'admin@boutique2v.com',
  storePhone: '+1 (555) 123-4567',
  storeAddress: '123 Business Street, City, State 12345',
  currency: 'USD',
  timezone: 'America/New_York',
  language: 'en',
  maintenanceMode: false,
  allowRegistration: true,
  requireEmailVerification: true,
  lowStockThreshold: 10,
  orderNotificationEmail: 'orders@boutique2v.com',
  supportEmail: 'support@boutique2v.com',
  facebookUrl: 'https://facebook.com/boutique2v',
  twitterUrl: 'https://twitter.com/boutique2v',
  instagramUrl: 'https://instagram.com/boutique2v',
  youtubeUrl: 'https://youtube.com/boutique2v'
};

// GET settings
router.get('/', auth, admin, async (req, res) => {
  res.json(settings);
});

// PUT settings
router.put('/', auth, admin, async (req, res) => {
  try {
    settings = { ...settings, ...req.body };
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
