const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      title: String,
      price: Number,
      quantity: { type: Number, default: 1 },
      image: String
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Cart', CartSchema);
