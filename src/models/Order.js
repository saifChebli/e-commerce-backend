const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      title: String,
      price: Number,
      quantity: Number,
      image: String
    }
  ],
  amount: { type: Number, required: true },
  shipping: { type: mongoose.Schema.Types.Mixed },
  paymentMethod: { type: String },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  paymentIntentId: { type: String },
  status: { type: String, default: 'pending' },
  invoiceUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
