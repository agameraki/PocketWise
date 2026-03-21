const Goal            = require('../models/Goal');
const Budget          = require('../models/Budget');
const Expense         = require('../models/Expense');
const { createError } = require('../middleware/errorHandler');

// ─────────────────────────────────────────────────────────
// @route   GET /api/goals
// @access  Protected
// ─────────────────────────────────────────────────────────
const getGoals = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const goals = await Goal.find(filter).sort({ createdAt: -1 });

    // For active goals attach affordability analysis so frontend
    // can display it without a second request per goal
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const [budget, categoryTotals, avgDailySpend] = await Promise.all([
      Budget.findOne({ user: req.user._id, month, year }),
      Expense.getCategoryTotals(req.user._id, year, month),
      Expense.getAvgDailySpend(req.user._id, 30),
    ]);

    // Sync budget spending if budget exists
    if (budget) {
      const expenses = await Expense.getMonthlyExpenses(req.user._id, year, month);
      budget.recalculateSpending(expenses);
    }

    const goalsWithAnalysis = goals.map(goal => {
      const g = goal.toObject();
      if (goal.status === 'active' && budget) {
        g.analysis = goal.getAffordabilityAnalysis(budget, categoryTotals, avgDailySpend);
      }
      return g;
    });

    res.status(200).json({ success: true, count: goals.length, goals: goalsWithAnalysis });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   POST /api/goals
// @access  Protected
// Create a new goal with snapshot of current financials
// ─────────────────────────────────────────────────────────
const createGoal = async (req, res, next) => {
  try {
    const { title, targetAmount, deadline, notes } = req.body;

    if (!title || !targetAmount) {
      throw createError(400, 'Title and target amount are required');
    }
    if (targetAmount <= 0) {
      throw createError(400, 'Target amount must be greater than ₹0');
    }

    // Snapshot current financials at goal creation time
    const [avgMonthlySpend, avgDailySpend] = await Promise.all([
      (async () => {
        const totals = await Expense.getMonthlyTotals(req.user._id, 3);
        if (!totals.length) return 0;
        const sum = totals.reduce((s, t) => s + t.total, 0);
        return Math.round(sum / totals.length);
      })(),
      Expense.getAvgDailySpend(req.user._id, 30),
    ]);

    const goal = await Goal.create({
      user:                       req.user._id,
      title:                      title.trim(),
      targetAmount:               Number(targetAmount),
      deadline:                   deadline ? new Date(deadline) : null,
      notes:                      notes?.trim() || '',
      snapshotIncome:             req.user.monthlyIncome || 0,
      snapshotAvgMonthlySpend:    avgMonthlySpend,
      snapshotAvgDailySpend:      avgDailySpend,
    });

    res.status(201).json({ success: true, message: 'Goal created', goal });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/goals/:id/analysis
// @access  Protected
// Full affordability analysis for a single goal
// ─────────────────────────────────────────────────────────
const getGoalAnalysis = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) throw createError(404, 'Goal not found');

    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    // Fetch fresh data for analysis
    const [budget, categoryTotals, avgDailySpend] = await Promise.all([
      Budget.findOne({ user: req.user._id, month, year }),
      Expense.getCategoryTotals(req.user._id, year, month),
      Expense.getAvgDailySpend(req.user._id, 30),
    ]);

    if (!budget) {
      throw createError(404, 'No budget found for current month. Please complete your profile setup.');
    }

    // Sync budget spending before analysis
    const expenses = await Expense.getMonthlyExpenses(req.user._id, year, month);
    budget.recalculateSpending(expenses);

    const analysis = goal.getAffordabilityAnalysis(budget, categoryTotals, avgDailySpend);

    res.status(200).json({ success: true, goal, analysis });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   PUT /api/goals/:id
// @access  Protected
// ─────────────────────────────────────────────────────────
const updateGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) throw createError(404, 'Goal not found');

    const { title, targetAmount, deadline, status, notes } = req.body;

    if (title)         goal.title        = title.trim();
    if (targetAmount)  goal.targetAmount = Number(targetAmount);
    if (deadline !== undefined) goal.deadline = deadline ? new Date(deadline) : null;
    if (status)        goal.status       = status;
    if (notes !== undefined) goal.notes  = notes.trim();

    await goal.save();

    res.status(200).json({ success: true, message: 'Goal updated', goal });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   DELETE /api/goals/:id
// @access  Protected
// ─────────────────────────────────────────────────────────
const deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) throw createError(404, 'Goal not found');

    res.status(200).json({ success: true, message: 'Goal deleted', id: req.params.id });
  } catch (error) {
    next(error);
  }
};

module.exports = { getGoals, createGoal, getGoalAnalysis, updateGoal, deleteGoal };