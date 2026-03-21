const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { uploadCSV, downloadTemplate } = require('../controllers/csvController');
const { protect } = require('../middleware/auth');

// ── Multer config — store CSV in /tmp, 5MB max ────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/tmp'),
  filename:    (req, file, cb) => {
    const unique = `${req.user._id}_${Date.now()}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/vnd.ms-excel' ||
    path.extname(file.originalname).toLowerCase() === '.csv'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// All CSV routes are protected
router.use(protect);

router.post('/upload',    upload.single('file'), uploadCSV);
router.get('/template',   downloadTemplate);

module.exports = router;