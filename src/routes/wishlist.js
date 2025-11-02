const express = require('express');
const router = express.Router();
const WishList = require('../models/WishList');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    let list = await WishList.findOne({ user: req.user._id }).populate('items.product');
    if (!list) list = { items: [] };
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/add', auth, async (req, res) => {
  const { productId, title, price, image } = req.body;
  try {
    let list = await WishList.findOne({ user: req.user._id });
    if (!list) list = new WishList({ user: req.user._id, items: [] });
    const exists = list.items.find(i => i.product?.toString() === productId);
    if (!exists) list.items.push({ product: productId, title, price, image });
    await list.save();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/remove', auth, async (req, res) => {
  const { productId } = req.body;
  try {
    let list = await WishList.findOne({ user: req.user._id });
    if (!list) return res.json({ items: [] });
    list.items = list.items.filter(i => i.product?.toString() !== productId);
    await list.save();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
