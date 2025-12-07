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

// Helper to invoke multer safely with better error handling
function handleMulter(mw) {
  return function (req, res, next) {
    mw(req, res, function (err) {
      if (err) {
        console.error('Upload error:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files' });
          }
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ error: err.message || 'Upload failed' });
      }
      next();
    });
  };
}

// POST /api/uploads/single  (admin)
router.post('/single', auth, admin, handleMulter(upload.single('file')), (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    console.log('File uploaded successfully:', file.filename);
    res.status(201).json({ filename: file.filename, url });
  } catch (error) {
    console.error('Single upload error:', error);
    res.status(500).json({ error: 'Failed to process upload' });
  }
});

// POST /api/uploads/multiple (admin) - up to 8 images
router.post('/multiple', auth, admin, handleMulter(upload.array('files', 8)), (req, res) => {
  try {
    const files = req.files || [];
    console.log(`Received ${files.length} file(s) for upload`);
    
    if (!files.length) {
      console.error('No files received in request');
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const mapped = files.map(f => {
      const url = `${req.protocol}://${req.get('host')}/uploads/${f.filename}`;
      console.log(`Uploaded: ${f.originalname} -> ${f.filename}`);
      return { filename: f.filename, url };
    });
    
    console.log(`Successfully uploaded ${files.length} file(s)`);
    res.status(201).json({ files: mapped });
  } catch (error) {
    console.error('Multiple upload error:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Failed to process uploads' });
  }
});

module.exports = router;
