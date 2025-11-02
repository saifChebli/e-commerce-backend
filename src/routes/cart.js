const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const auth = require('../middleware/auth');

// get cart
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart) cart = { items: [] };
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// add item
router.post('/add', auth, async (req, res) => {
  const { productId, title, price, image, quantity = 1 } = req.body;
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, items: [] });
    const existing = cart.items.find(i => i.product?.toString() === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.items.push({ product: productId, title, price, image, quantity });
    }
    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// remove item
router.post('/remove', auth, async (req, res) => {
  const { productId } = req.body;
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.json({ items: [] });
    cart.items = cart.items.filter(i => i.product?.toString() !== productId);
    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// update quantity
router.post('/update', auth, async (req, res) => {
  const { productId, quantity } = req.body;
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, items: [] });
    const item = cart.items.find(i => i.product?.toString() === productId);
    if (!item && quantity > 0) {
      return res.status(400).json({ error: 'Item not found in cart' });
    }
    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i.product?.toString() !== productId);
    } else {
      item.quantity = quantity;
    }
    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
