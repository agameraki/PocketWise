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
const { protect } = require('../middleware/auth');

// All budget routes are protected
router.use(protect);

router.get('/current',             getCurrentBudget);
router.get('/suggestions',         getSuggestions);
router.get('/:year/:month',        getBudgetByMonth);
router.put('/income',              updateIncome);
router.post('/category',           addCategory);
router.put('/category/:name',      updateCategory);
router.delete('/category/:name',   deleteCategory);
router.post('/reset',              resetToSuggested);

module.exports = router;