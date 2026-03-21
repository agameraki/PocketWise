const express = require('express');
const router  = express.Router();
const {
  signup,
  login,
  getMe,
  setupProfile,
  updateProfile,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// ── Public ────────────────────────────────────────────────
router.post('/signup', signup);
router.post('/login',  login);

// ── Protected ─────────────────────────────────────────────
router.get('/me',              protect, getMe);
router.put('/setup',           protect, setupProfile);
router.put('/update',          protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;