const express = require('express');
const router  = express.Router();
const {
  getExpenses,
  getExpenseById,
  addExpense,
  updateExpense,
  deleteExpense,
  getCurrentMonthSummary,
  getSummaryByMonth,
  getTrends,
  getUserCategories,
} = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

router.use(protect);

// ── IMPORTANT: All named routes MUST come before /:id ─────
// Otherwise Express treats "trends", "summary" etc as ObjectIds

router.get('/summary/current',         getCurrentMonthSummary);  // dashboard
router.get('/summary/:year/:month',    getSummaryByMonth);        // analytics page
router.get('/trends',                  getTrends);                // analytics charts
router.get('/categories/list',         getUserCategories);        // expense form dropdown

// ── CRUD (/:id must be last) ──────────────────────────────
router.get('/',        getExpenses);
router.post('/',       addExpense);
router.get('/:id',     getExpenseById);
router.put('/:id',     updateExpense);
router.delete('/:id',  deleteExpense);

module.exports = router;