const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  storeName: { type: String, default: 'Boutique 2V Technologies' },
  storeEmail: { type: String, default: 'admin@boutique2v.com' },
  storePhone: { type: String, default: '+1 (555) 123-4567' },
  storeAddress: { type: String, default: '123 Business Street, City, State 12345' },
  taxNumber: { type: String, default: 'TAX-000000' },
  globalTaxPercent: { type: Number, default: 0, min: 0, max: 100 },
  currency: { type: String, default: 'USD' },
  timezone: { type: String, default: 'America/New_York' },
  language: { type: String, default: 'en' },
  maintenanceMode: { type: Boolean, default: false },
  allowRegistration: { type: Boolean, default: true },
  requireEmailVerification: { type: Boolean, default: true },
  lowStockThreshold: { type: Number, default: 10 },
  orderNotificationEmail: { type: String, default: 'orders@boutique2v.com' },
  supportEmail: { type: String, default: 'support@boutique2v.com' },
  facebookUrl: { type: String, default: 'https://facebook.com/boutique2v' },
  twitterUrl: { type: String, default: 'https://twitter.com/boutique2v' },
  instagramUrl: { type: String, default: 'https://instagram.com/boutique2v' },
  youtubeUrl: { type: String, default: 'https://youtube.com/boutique2v' },
}, { timestamps: true });

module.exports = mongoose.model('Setting', SettingSchema);
