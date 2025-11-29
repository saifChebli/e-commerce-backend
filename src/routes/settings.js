const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const Setting = require('../models/Setting');
// In-memory cache (kept in sync with DB)
let settings = null;

async function loadSettings() {
  let doc = await Setting.findOne();
  if (!doc) {
    doc = await Setting.create({});
  }
  settings = doc.toObject();
  return settings;
}

// GET settings (admin only)
router.get('/', auth, admin, async (req, res) => {
  try {
    if (!settings) await loadSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET public settings (for client-side, no auth required)
router.get('/public', async (req, res) => {
  try {
    if (!settings) await loadSettings();
    const Product = require('../models/Product');
    
    // Fetch featured products: either by featured flag OR by names from settings
    let featuredProducts = [];
    if (settings.featuredProductNames && settings.featuredProductNames.length > 0) {
      featuredProducts = await Product.find({
        name: { $in: settings.featuredProductNames },
        status: true
      }).limit(10);
    } else {
      featuredProducts = await Product.find({
        featured: true,
        status: true
      }).limit(10);
    }
    
    // Fetch new arrivals: by names from settings OR most recent products
    let newArrivalProducts = [];
    if (settings.newArrivalProductNames && settings.newArrivalProductNames.length > 0) {
      newArrivalProducts = await Product.find({
        name: { $in: settings.newArrivalProductNames },
        status: true
      }).limit(10);
    } else {
      newArrivalProducts = await Product.find({ status: true })
        .sort({ createdAt: -1 })
        .limit(10);
    }
    
    // Process hero slides - resolve product names to actual products
    let heroSlides = [];
    if (settings.heroSlides && settings.heroSlides.length > 0) {
      heroSlides = await Promise.all(
        settings.heroSlides.map(async (slide) => {
          if (slide.type === 'product' && slide.productName) {
            const product = await Product.findOne({ 
              name: slide.productName, 
              status: true 
            });
            if (product) {
              return {
                type: 'product',
                productId: product._id,
                productName: product.name,
                image: product.images?.[0],
                title: slide.title || product.name,
                subtitle: slide.subtitle || product.shortDescription || `Starting at $${product.price}`,
                buttonText: slide.buttonText || 'View Product',
                category: product.category,
                price: product.price,
              };
            }
          }
          // Custom slide
          return {
            type: 'custom',
            image: slide.customImage,
            title: slide.title,
            subtitle: slide.subtitle,
            buttonText: slide.buttonText || 'Shop Now',
            buttonLink: slide.buttonLink,
            searchKeyword: slide.searchKeyword,
          };
        })
      );
      // Filter out any null/undefined slides
      heroSlides = heroSlides.filter(Boolean);
    }
    
    // Return only public-facing settings
    res.json({
      storeName: settings.storeName,
      storeEmail: settings.storeEmail,
      storePhone: settings.storePhone,
      storeAddress: settings.storeAddress,
      currency: settings.currency,
      facebookUrl: settings.facebookUrl,
      twitterUrl: settings.twitterUrl,
      instagramUrl: settings.instagramUrl,
      youtubeUrl: settings.youtubeUrl,
      footerFreeShippingText: settings.footerFreeShippingText,
      footerFreeShippingSubtext: settings.footerFreeShippingSubtext,
      footerCustomerServiceText: settings.footerCustomerServiceText,
      footerCustomerServiceSubtext: settings.footerCustomerServiceSubtext,
      footerMoneyBackText: settings.footerMoneyBackText,
      footerMoneyBackSubtext: settings.footerMoneyBackSubtext,
      footerAboutText: settings.footerAboutText,
      footerCopyright: settings.footerCopyright,
      announcementText: settings.announcementText,
      featuredProducts,
      newArrivalProducts,
      heroSlides,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT settings (admin only)
router.put('/', auth, admin, async (req, res) => {
  try {
    const current = await Setting.findOne();
    let updated;
    if (current) {
      updated = await Setting.findByIdAndUpdate(current._id, req.body, { new: true });
    } else {
      updated = await Setting.create(req.body);
    }
    settings = updated.toObject();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// Expose current settings for internal consumers (e.g., orders/invoice)
module.exports.__getSettings = () => settings;
module.exports.__loadSettings = loadSettings;
