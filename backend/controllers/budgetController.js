const Budget          = require('../models/Budget');
const Expense         = require('../models/Expense');
const { createError } = require('../middleware/errorHandler');

// ── Helper: recalculate spending for a budget from DB ─────
const syncBudgetSpending = async (budget, userId, month, year) => {
  const expenses = await Expense.getMonthlyExpenses(userId, year, month);
  budget.recalculateSpending(expenses);
  await budget.save();
  return budget;
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/budget/current
// @access  Protected
// Get current month's budget with live spending totals
// ─────────────────────────────────────────────────────────
const getCurrentBudget = async (req, res, next) => {
  try {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    let budget = await Budget.findOne({ user: req.user._id, month, year });

    // If no budget exists yet, create from user income
    if (!budget) {
      const income = req.user.monthlyIncome || 0;
      budget = await Budget.create({
        user:       req.user._id,
        month,
        year,
        totalIncome: income,
        categories: Budget.buildSuggestedCategories(income),
      });
    }

    // Always sync spending before returning
    await syncBudgetSpending(budget, req.user._id, month, year);

    res.status(200).json({
      success: true,
      budget,
      alerts: budget.getAlerts(),
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/budget/:year/:month
// @access  Protected
// Get budget for a specific month
// ─────────────────────────────────────────────────────────
const getBudgetByMonth = async (req, res, next) => {
  try {
    const month = parseInt(req.params.month);
    const year  = parseInt(req.params.year);

    if (month < 1 || month > 12 || isNaN(year)) {
      throw createError(400, 'Invalid month or year');
    }

    const budget = await Budget.findOne({ user: req.user._id, month, year });
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: `No budget found for ${month}/${year}`,
      });
    }

    await syncBudgetSpending(budget, req.user._id, month, year);

    res.status(200).json({ success: true, budget, alerts: budget.getAlerts() });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   PUT /api/budget/income
// @access  Protected
// Update total income for current month's budget
// ─────────────────────────────────────────────────────────
const updateIncome = async (req, res, next) => {
  try {
    const { totalIncome } = req.body;
    if (!totalIncome || totalIncome <= 0) {
      throw createError(400, 'Please provide a valid income amount');
    }

    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    let budget = await Budget.findOne({ user: req.user._id, month, year });
    if (!budget) throw createError(404, 'Budget not found for current month');

    budget.totalIncome = totalIncome;

    // Recalculate percentages for existing categories
    for (const cat of budget.categories) {
      cat.percentage = Math.round((cat.allocatedAmount / totalIncome) * 100);
    }

    await budget.save();
    await syncBudgetSpending(budget, req.user._id, month, year);

    res.status(200).json({
      success: true,
      message: 'Income updated',
      budget,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   POST /api/budget/category
// @access  Protected
// Add a new user-defined category
// ─────────────────────────────────────────────────────────
const addCategory = async (req, res, next) => {
  try {
    const { name, allocatedAmount } = req.body;

    if (!name || !name.trim()) {
      throw createError(400, 'Category name is required');
    }
    if (!allocatedAmount || allocatedAmount < 0) {
      throw createError(400, 'Please provide a valid allocated amount');
    }

    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const budget = await Budget.findOne({ user: req.user._id, month, year });
    if (!budget) throw createError(404, 'Budget not found for current month');

    // addCategory throws if duplicate
    budget.addCategory(name, Number(allocatedAmount));
    await budget.save();
    await syncBudgetSpending(budget, req.user._id, month, year);

    res.status(201).json({
      success: true,
      message: `Category "${name}" added`,
      budget,
    });
  } catch (error) {
    // Convert duplicate category error to 409
    if (error.message && error.message.includes('already exists')) {
      return next(createError(409, error.message));
    }
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   PUT /api/budget/category/:name
// @access  Protected
// Update allocation for an existing category
// ─────────────────────────────────────────────────────────
const updateCategory = async (req, res, next) => {
  try {
    const categoryName    = decodeURIComponent(req.params.name);
    const { allocatedAmount, newName } = req.body;

    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const budget = await Budget.findOne({ user: req.user._id, month, year });
    if (!budget) throw createError(404, 'Budget not found for current month');

    const cat = budget.getCategory(categoryName);
    if (!cat) throw createError(404, `Category "${categoryName}" not found`);

    // Update amount if provided
    if (allocatedAmount !== undefined) {
      budget.updateCategory(categoryName, Number(allocatedAmount));
    }

    // Rename if newName provided
    if (newName && newName.trim()) {
      const newKey = newName.toLowerCase().trim();
      const duplicate = budget.categories.some(
        (c) => c.name === newKey && c.name !== categoryName.toLowerCase()
      );
      if (duplicate) throw createError(409, `Category "${newName}" already exists`);
      cat.name = newKey;
    }

    await budget.save();
    await syncBudgetSpending(budget, req.user._id, month, year);

    res.status(200).json({
      success: true,
      message: 'Category updated',
      budget,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   DELETE /api/budget/category/:name
// @access  Protected
// Remove a category from the budget
// ─────────────────────────────────────────────────────────
const deleteCategory = async (req, res, next) => {
  try {
    const categoryName = decodeURIComponent(req.params.name);

    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const budget = await Budget.findOne({ user: req.user._id, month, year });
    if (!budget) throw createError(404, 'Budget not found for current month');

    const cat = budget.getCategory(categoryName);
    if (!cat) throw createError(404, `Category "${categoryName}" not found`);

    budget.removeCategory(categoryName);
    await budget.save();

    res.status(200).json({
      success: true,
      message: `Category "${categoryName}" removed`,
      budget,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   POST /api/budget/reset
// @access  Protected
// Reset current month's categories to suggestions
// ─────────────────────────────────────────────────────────
const resetToSuggested = async (req, res, next) => {
  try {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const budget = await Budget.findOne({ user: req.user._id, month, year });
    if (!budget) throw createError(404, 'Budget not found for current month');

    budget.categories = Budget.buildSuggestedCategories(budget.totalIncome);
    await budget.save();
    await syncBudgetSpending(budget, req.user._id, month, year);

    res.status(200).json({
      success: true,
      message: 'Budget reset to suggested allocations',
      budget,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/budget/suggestions
// @access  Protected
// Return suggested allocations based on user income (for setup page)
// ─────────────────────────────────────────────────────────
const getSuggestions = async (req, res, next) => {
  try {
    const income = Number(req.query.income) || req.user.monthlyIncome || 0;
    const suggestions = Budget.buildSuggestedCategories(income);

    res.status(200).json({
      success:     true,
      income,
      suggestions,
      totalAllocated: suggestions.reduce((s, c) => s + c.allocatedAmount, 0),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentBudget,
  getBudgetByMonth,
  updateIncome,
  addCategory,
  updateCategory,
  deleteCategory,
  resetToSuggested,
  getSuggestions,
};