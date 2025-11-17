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

// GET settings
router.get('/', auth, admin, async (req, res) => {
  try {
    if (!settings) await loadSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT settings
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
