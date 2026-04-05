const express = require('express');
const router  = express.Router();
const {
  getCurrentBudget,
  getBudgetByMonth,
  updateIncome,
  addCategory,
  updateCategory,
  deleteCategory,
  resetToSuggested,
  getSuggestions,
} = require('../controllers/budgetController');
const { protect, authorize } = require('../middleware/auth');

// All budget routes are protected
router.use(protect);

router.get('/current',             getCurrentBudget);
router.get('/suggestions',         getSuggestions);
router.get('/:year/:month',        getBudgetByMonth);
router.put('/income',              authorize('admin'), updateIncome);
router.post('/category',           authorize('admin'), addCategory);
router.put('/category/:name',      authorize('admin'), updateCategory);
router.delete('/category/:name',   authorize('admin'), deleteCategory);
router.post('/reset',              authorize('admin'), resetToSuggested);

module.exports = router;