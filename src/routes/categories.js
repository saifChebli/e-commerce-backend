const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// GET /api/categories - Public (get all active categories)
router.get('/', async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };
    const categories = await Category.find(filter).sort({ order: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories/default - Get default category
router.get('/default', async (req, res) => {
  try {
    const defaultCategory = await Category.findOne({ isDefault: true, isActive: true });
    res.json(defaultCategory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories/:id - Get single category
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories - Create category (Admin only)
router.post('/', auth, admin, async (req, res) => {
  try {
    const { name, slug, description, image, isDefault, isActive, subcategories, order } = req.body;
    
    // Auto-generate slug if not provided
    const categorySlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const category = new Category({
      name,
      slug: categorySlug,
      description,
      image,
      isDefault: isDefault || false,
      isActive: isActive !== undefined ? isActive : true,
      subcategories: subcategories || [],
      order: order || 0
    });
    
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Category name or slug already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id - Update category (Admin only)
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { name, slug, description, image, isDefault, isActive, subcategories, order } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (subcategories !== undefined) updateData.subcategories = subcategories;
    if (order !== undefined) updateData.order = order;
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!category) return res.status(404).json({ error: 'Category not found' });
    
    // Handle default category change
    if (isDefault === true) {
      await Category.updateMany(
        { _id: { $ne: req.params.id } },
        { $set: { isDefault: false } }
      );
    }
    
    res.json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Category name or slug already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id - Delete category (Admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    
    // Prevent deleting default category
    if (category.isDefault) {
      return res.status(400).json({ error: 'Cannot delete the default category. Set another category as default first.' });
    }
    
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories/:id/subcategories - Add subcategory (Admin only)
router.post('/:id/subcategories', auth, admin, async (req, res) => {
  try {
    const { name, slug, description, isActive } = req.body;
    
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    
    const subcategorySlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    category.subcategories.push({
      name,
      slug: subcategorySlug,
      description,
      isActive: isActive !== undefined ? isActive : true
    });
    
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id/subcategories/:subId - Update subcategory (Admin only)
router.put('/:id/subcategories/:subId', auth, admin, async (req, res) => {
  try {
    const { name, slug, description, isActive } = req.body;
    
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    
    const subcategory = category.subcategories.id(req.params.subId);
    if (!subcategory) return res.status(404).json({ error: 'Subcategory not found' });
    
    if (name) subcategory.name = name;
    if (slug) subcategory.slug = slug;
    if (description !== undefined) subcategory.description = description;
    if (isActive !== undefined) subcategory.isActive = isActive;
    
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id/subcategories/:subId - Delete subcategory (Admin only)
router.delete('/:id/subcategories/:subId', auth, admin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    
    category.subcategories.pull(req.params.subId);
    await category.save();
    
    res.json({ message: 'Subcategory deleted successfully', category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
