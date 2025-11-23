const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});

function fileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only image files are allowed (JPG, PNG, WEBP, GIF)'));
  }
  cb(null, true);
}

// No size limit - allow any file size
const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: Infinity, // No size limit
    files: 8 // Max 8 files
  }
});

// Helper to invoke multer safely
function handleMulter(mw) {
  return function (req, res, next) {
    mw(req, res, function (err) {
      if (err) {
        return res.status(400).json({ error: err.message || 'Upload failed' });
      }
      next();
    });
  };
}

// POST /api/uploads/single  (admin)
router.post('/single', auth, admin, handleMulter(upload.single('file')), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
  res.status(201).json({ filename: file.filename, url });
});

// POST /api/uploads/multiple (admin) - up to 8 images
router.post('/multiple', auth, admin, handleMulter(upload.array('files', 8)), (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: 'No files uploaded' });
  const mapped = files.map(f => ({ filename: f.filename, url: `${req.protocol}://${req.get('host')}/uploads/${f.filename}` }));
  res.status(201).json({ files: mapped });
});

module.exports = router;
