const mongoose = require('mongoose');

const WishListSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      title: String,
      price: Number,
      image: String
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('WishList', WishListSchema);
