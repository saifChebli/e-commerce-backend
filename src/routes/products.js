const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// GET /api/products
// query: search, category, priceMin, priceMax, sort (newest|price_asc|price_desc), page, limit
router.get('/', async (req, res) => {
  try {
    const { search, category, priceMin, priceMax, sort, page, limit } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (category) filter.category = category;
    if (priceMin || priceMax) filter.price = {
      ...(priceMin ? { $gte: Number(priceMin) } : {}),
      ...(priceMax ? { $lte: Number(priceMax) } : {}),
    };

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };

    // If pagination provided, return paginated payload
    const p = Number(page) || 0;
    const l = Number(limit) || 0;
    if (p > 0 && l > 0) {
      const skip = (p - 1) * l;
      const [items, total] = await Promise.all([
        Product.find(filter).sort(sortOption).skip(skip).limit(l),
        Product.countDocuments(filter),
      ]);
      const totalPages = Math.ceil(total / l);
      return res.json({ items, total, page: p, totalPages });
    }

    // Otherwise return full list
    const products = await Product.find(filter).sort(sortOption);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin routes
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
