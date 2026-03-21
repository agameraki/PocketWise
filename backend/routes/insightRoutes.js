const express = require('express');
const router  = express.Router();
const { getInsights } = require('../controllers/insightController');
const { protect }     = require('../middleware/auth');

// All insight routes are protected
router.use(protect);

router.get('/', getInsights);

module.exports = router;