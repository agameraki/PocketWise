const Expense         = require('../models/Expense');
const Budget          = require('../models/Budget');
const { createError } = require('../middleware/errorHandler');

// ── Helper: after any expense change, re-sync budget spending ─
const syncBudget = async (userId) => {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const budget = await Budget.findOne({ user: userId, month, year });
  if (!budget) return;

  const expenses = await Expense.getMonthlyExpenses(userId, year, month);
  budget.recalculateSpending(expenses);
  await budget.save();
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/expenses
// @access  Protected
// Get all expenses for current user (paginated + filtered)
// ─────────────────────────────────────────────────────────
const getExpenses = async (req, res, next) => {
  try {
    const {
      page     = 1,
      limit    = 20,
      category,
      month,
      year,
      startDate,
      endDate,
      sort = '-date',
    } = req.query;

    const filter = { user: req.user._id };

    // Filter by category (case-insensitive)
    if (category) filter.category = category.toLowerCase().trim();

    // Filter by month/year
    if (month && year) {
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59, 999),
      };
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   filter.date.$lte = new Date(endDate);
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Expense.countDocuments(filter);

    const expenses = await Expense.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count:   expenses.length,
      total,
      page:    parseInt(page),
      pages:   Math.ceil(total / parseInt(limit)),
      expenses,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/expenses/:id
// @access  Protected
// ─────────────────────────────────────────────────────────
const getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({
      _id:  req.params.id,
      user: req.user._id,
    });
    if (!expense) throw createError(404, 'Expense not found');

    res.status(200).json({ success: true, expense });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   POST /api/expenses
// @access  Protected
// Add a new expense
// ─────────────────────────────────────────────────────────
const addExpense = async (req, res, next) => {
  try {
    const { amount, category, description, date } = req.body;

    if (!amount || !category) {
      throw createError(400, 'Amount and category are required');
    }
    if (amount <= 0) {
      throw createError(400, 'Amount must be greater than ₹0');
    }

    const expense = await Expense.create({
      user:        req.user._id,
      amount:      Number(amount),
      category:    category.toLowerCase().trim(),
      description: description?.trim() || '',
      date:        date ? new Date(date) : new Date(),
      source:      'manual',
    });

    // Sync budget spending after adding
    await syncBudget(req.user._id);

    // Return updated budget alerts too
    const now    = new Date();
    const budget = await Budget.findOne({
      user:  req.user._id,
      month: now.getMonth() + 1,
      year:  now.getFullYear(),
    });

    res.status(201).json({
      success: true,
      message: 'Expense added',
      expense,
      alerts: budget ? budget.getAlerts() : [],
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   PUT /api/expenses/:id
// @access  Protected
// Edit an existing expense
// ─────────────────────────────────────────────────────────
const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({
      _id:  req.params.id,
      user: req.user._id,
    });
    if (!expense) throw createError(404, 'Expense not found');

    const { amount, category, description, date } = req.body;

    if (amount !== undefined) {
      if (amount <= 0) throw createError(400, 'Amount must be greater than ₹0');
      expense.amount = Number(amount);
    }
    if (category)    expense.category    = category.toLowerCase().trim();
    if (description !== undefined) expense.description = description.trim();
    if (date)        expense.date        = new Date(date);

    await expense.save();

    // Sync budget after edit
    await syncBudget(req.user._id);

    const now    = new Date();
    const budget = await Budget.findOne({
      user:  req.user._id,
      month: now.getMonth() + 1,
      year:  now.getFullYear(),
    });

    res.status(200).json({
      success: true,
      message: 'Expense updated',
      expense,
      alerts: budget ? budget.getAlerts() : [],
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   DELETE /api/expenses/:id
// @access  Protected
// ─────────────────────────────────────────────────────────
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id:  req.params.id,
      user: req.user._id,
    });
    if (!expense) throw createError(404, 'Expense not found');

    // Sync budget after delete
    await syncBudget(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Expense deleted',
      id:      req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/expenses/summary/current
// @access  Protected
// Summary for current month — used by dashboard
// ─────────────────────────────────────────────────────────
const getCurrentMonthSummary = async (req, res, next) => {
  try {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const [
      categoryTotals,
      dailyTotals,
      weeklyComparison,
      totalSpent,
      avgDailySpend,
    ] = await Promise.all([
      Expense.getCategoryTotals(req.user._id, year, month),
      Expense.getDailyTotals(req.user._id, 30),
      Expense.getWeeklyComparison(req.user._id),
      Expense.getSpentThisMonth(req.user._id),
      Expense.getAvgDailySpend(req.user._id, 30),
    ]);

    const income    = req.user.monthlyIncome || 0;
    const remaining = income - totalSpent;

    // Days remaining in month
    const daysInMonth  = new Date(year, month, 0).getDate();
    const daysLeft     = daysInMonth - now.getDate();

    // Projected month-end spend at current daily rate
    const daysPassed          = now.getDate();
    const projectedMonthSpend = daysPassed > 0
      ? Math.round((totalSpent / daysPassed) * daysInMonth)
      : 0;

    res.status(200).json({
      success: true,
      summary: {
        income,
        totalSpent:          Math.round(totalSpent),
        remaining:           Math.round(remaining),
        daysLeft,
        avgDailySpend,
        projectedMonthSpend,
        isOnTrack:           projectedMonthSpend <= income,
        categoryTotals,
        dailyTotals,
        weeklyComparison,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/expenses/categories/list
// @access  Protected
// Return all unique categories this user has ever used
// ─────────────────────────────────────────────────────────
const getUserCategories = async (req, res, next) => {
  try {
    const categories = await Expense.distinct('category', { user: req.user._id });
    res.status(200).json({ success: true, categories: categories.sort() });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/expenses/trends?months=6
// @access  Protected
// Monthly + daily totals for analytics charts
// ─────────────────────────────────────────────────────────
const getTrends = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 6;

    const [monthly, daily, weekly] = await Promise.all([
      Expense.getMonthlyTotals(req.user._id, months),
      Expense.getDailyTotals(req.user._id, 30),
      Expense.getWeeklyComparison(req.user._id),
    ]);

    res.status(200).json({
      success: true,
      trends: { monthly, daily, weekly },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/expenses/summary/:year/:month
// @access  Protected
// Summary for a specific month — used by analytics page
// ─────────────────────────────────────────────────────────
const getSummaryByMonth = async (req, res, next) => {
  try {
    const month = parseInt(req.params.month);
    const year  = parseInt(req.params.year);

    if (!month || !year || month < 1 || month > 12) {
      throw createError(400, 'Invalid month or year');
    }

    const [
      categoryTotals,
      allExpenses,
      weeklyComparison,
      avgDailySpend,
    ] = await Promise.all([
      Expense.getCategoryTotals(req.user._id, year, month),
      Expense.getMonthlyExpenses(req.user._id, year, month),
      Expense.getWeeklyComparison(req.user._id),
      Expense.getAvgDailySpend(req.user._id, 30),
    ]);

    const totalSpent = allExpenses.reduce((s, e) => s + e.amount, 0);
    const income     = req.user.monthlyIncome || 0;
    const remaining  = income - totalSpent;

    const daysInMonth  = new Date(year, month, 0).getDate();
    const now          = new Date();
    const daysPassed   = (year === now.getFullYear() && month === now.getMonth() + 1)
      ? now.getDate()
      : daysInMonth;

    const projectedMonthlySpend = daysPassed > 0
      ? Math.round((totalSpent / daysPassed) * daysInMonth)
      : 0;

    // Top 5 expenses by amount
    const topExpenses = [...allExpenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      summary: {
        income,
        totalSpent:          Math.round(totalSpent),
        remaining:           Math.round(remaining),
        avgDailySpend,
        projectedMonthlySpend,
        categoryTotals,
        weeklyComparison,
      },
      topExpenses,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExpenses,
  getExpenseById,
  addExpense,
  updateExpense,
  deleteExpense,
  getCurrentMonthSummary,
  getSummaryByMonth,
  getTrends,
  getUserCategories,
};