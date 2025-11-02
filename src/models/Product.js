const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shortDescription: { type: String },
  description: { type: String },
  price: { type: Number, required: true },
  comparePrice: { type: Number },
  sku: { type: String },
  barcode: { type: String },
  images: [{ type: String }],
  stock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  trackQuantity: { type: Boolean, default: true },
  allowBackorder: { type: Boolean, default: false },
  status: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  category: { type: String },
  subcategory: { type: String },
  tags: [{ type: String }],
  weight: { type: Number },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
