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
  
  // Homepage Configuration
  featuredProductNames: [{ type: String }],
  newArrivalProductNames: [{ type: String }],
  heroSlides: [{
    type: { type: String, enum: ['product', 'custom'], default: 'custom' },
    productName: { type: String },
    customImage: { type: String },
    title: { type: String },
    subtitle: { type: String },
    buttonText: { type: String, default: 'Shop Now' },
    buttonLink: { type: String },
    searchKeyword: { type: String },
  }],
  announcementText: { type: String, default: 'Summer Sale For All Swim Suits And Free Express Delivery - OFF 50%!' },
  
  // Footer Content
  footerFreeShippingText: { type: String, default: 'Free and fast shipping over 140$' },
  footerFreeShippingSubtext: { type: String, default: 'Enjoy free shipping on orders over $140' },
  footerCustomerServiceText: { type: String, default: '24/7 customer service' },
  footerCustomerServiceSubtext: { type: String, default: 'We are here to help you anytime' },
  footerMoneyBackText: { type: String, default: 'Money back guarantee' },
  footerMoneyBackSubtext: { type: String, default: 'We return money within 30 days' },
  footerAboutText: { type: String, default: 'Subscribe to our newsletter for exclusive offers and updates.' },
  footerCopyright: { type: String, default: '© 2024 Boutique 2V Technologies. All rights reserved.' },
}, { timestamps: true });

module.exports = mongoose.model('Setting', SettingSchema);
