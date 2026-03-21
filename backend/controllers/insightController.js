const Expense         = require('../models/Expense');
const Budget          = require('../models/Budget');
const { createError } = require('../middleware/errorHandler');

// ─────────────────────────────────────────────────────────
// INSIGHT ENGINE — pure logic, zero hardcoded messages
// Every string is computed from real user data
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// @route   GET /api/insights
// @access  Protected
// Returns full insight report for current month
// ─────────────────────────────────────────────────────────
const getInsights = async (req, res, next) => {
  try {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    // Fetch all data in parallel
    const [budget, categoryTotals, weeklyComparison, avgDailySpend, monthlyTotals] =
      await Promise.all([
        Budget.findOne({ user: req.user._id, month, year }),
        Expense.getCategoryTotals(req.user._id, year, month),
        Expense.getWeeklyComparison(req.user._id),
        Expense.getAvgDailySpend(req.user._id, 30),
        Expense.getMonthlyTotals(req.user._id, 6),
      ]);

    if (!budget) {
      return res.status(200).json({
        success:  true,
        insights: [],
        alerts:   [],
        message:  'Complete your profile setup to see insights',
      });
    }

    // Sync spending
    const expenses = await Expense.getMonthlyExpenses(req.user._id, year, month);
    budget.recalculateSpending(expenses);

    const income       = budget.totalIncome;
    const totalSpent   = budget.totalSpent;
    const remaining    = budget.totalRemaining;
    const daysInMonth  = new Date(year, month, 0).getDate();
    const daysPassed   = now.getDate();
    const daysLeft     = daysInMonth - daysPassed;

    const insights = [];
    const alerts   = [];

    // ── 1. Overall budget usage ───────────────────────────
    const overallPct = income > 0 ? Math.round((totalSpent / income) * 100) : 0;
    insights.push({
      type:    'overall_usage',
      icon:    'wallet',
      title:   'Monthly budget usage',
      message: `You have used ₹${Math.round(totalSpent).toLocaleString('en-IN')} out of your ₹${income.toLocaleString('en-IN')} income — that is ${overallPct}% of your budget.`,
      value:   overallPct,
      severity: overallPct >= 100 ? 'danger' : overallPct >= 80 ? 'warning' : 'info',
    });

    // ── 2. Projected month-end spend ──────────────────────
    if (daysPassed > 0) {
      const projected = Math.round((totalSpent / daysPassed) * daysInMonth);
      const diff      = projected - income;
      const onTrack   = projected <= income;

      insights.push({
        type:    'projection',
        icon:    'trending',
        title:   'Month-end projection',
        message: onTrack
          ? `At your current pace, you will spend ₹${projected.toLocaleString('en-IN')} by month-end — ₹${Math.abs(diff).toLocaleString('en-IN')} under your income.`
          : `At your current pace, you will overspend by ₹${diff.toLocaleString('en-IN')} this month (projected ₹${projected.toLocaleString('en-IN')}).`,
        value:    projected,
        severity: onTrack ? 'success' : 'danger',
      });
    }

    // ── 3. Daily average spend ────────────────────────────
    const safeDailyLimit = daysLeft > 0 ? Math.floor(remaining / daysLeft) : 0;
    insights.push({
      type:    'daily_avg',
      icon:    'calendar',
      title:   'Daily spending',
      message: `Your average daily spend over the last 30 days is ₹${avgDailySpend.toLocaleString('en-IN')}. To stay within budget, your daily limit for the remaining ${daysLeft} day(s) is ₹${safeDailyLimit.toLocaleString('en-IN')}.`,
      value:   avgDailySpend,
      severity: avgDailySpend > safeDailyLimit ? 'warning' : 'success',
    });

    // ── 4. Weekly comparison ──────────────────────────────
    const { thisWeek, lastWeek, percentChange } = weeklyComparison;
    if (percentChange !== null) {
      const direction = percentChange > 0 ? 'increased' : 'decreased';
      const abs       = Math.abs(percentChange);
      insights.push({
        type:    'weekly_comparison',
        icon:    'bar-chart',
        title:   'Week-on-week spending',
        message: `Your spending this week (₹${Math.round(thisWeek).toLocaleString('en-IN')}) ${direction} by ${abs}% compared to last week (₹${Math.round(lastWeek).toLocaleString('en-IN')}).`,
        value:   percentChange,
        severity: percentChange > 20 ? 'warning' : percentChange < -10 ? 'success' : 'info',
      });
    }

    // ── 5. Per-category insights ──────────────────────────
    for (const cat of budget.categories) {
      const spent     = cat.spentAmount;
      const allocated = cat.allocatedAmount;
      if (allocated === 0) continue;

      const usedPct = Math.round((spent / allocated) * 100);

      if (usedPct >= 100) {
        // Overspent
        const over = Math.round(spent - allocated);
        alerts.push({
          type:     'overspent',
          category: cat.name,
          icon:     'alert-circle',
          message:  `You have overspent your "${cat.name}" budget by ₹${over.toLocaleString('en-IN')} (${usedPct}% used).`,
          severity: 'danger',
        });
      } else if (usedPct >= 80) {
        // Near limit
        const leftInCat = Math.round(allocated - spent);
        alerts.push({
          type:     'near_limit',
          category: cat.name,
          icon:     'alert-triangle',
          message:  `You have used ${usedPct}% of your "${cat.name}" budget. Only ₹${leftInCat.toLocaleString('en-IN')} remaining.`,
          severity: 'warning',
        });
      } else if (usedPct === 0 && daysPassed > 5) {
        // Unspent category — might be forgotten
        insights.push({
          type:     'unspent_category',
          category: cat.name,
          icon:     'info',
          message:  `You haven't logged any "${cat.name}" expenses yet this month. Your allocated budget of ₹${allocated.toLocaleString('en-IN')} is untouched.`,
          severity: 'info',
        });
      } else {
        // Healthy — show progress
        insights.push({
          type:     'category_progress',
          category: cat.name,
          icon:     'check-circle',
          message:  `Your "${cat.name}" spending is on track — ${usedPct}% used (₹${Math.round(spent).toLocaleString('en-IN')} of ₹${allocated.toLocaleString('en-IN')}).`,
          value:    usedPct,
          severity: 'success',
        });
      }
    }

    // ── 6. Savings rate ───────────────────────────────────
    const savingsCat = budget.categories.find((c) => c.name === 'savings');
    if (!savingsCat) {
      // No savings category — recommend creating one
      insights.push({
        type:    'savings_tip',
        icon:    'piggy-bank',
        title:   'No savings category',
        message: `You don't have a savings category in your budget. Financial experts recommend saving at least 20% of your income (₹${Math.round(income * 0.2).toLocaleString('en-IN')}/month).`,
        severity: 'info',
      });
    }

    // ── 7. Month-on-month trend (last 2 months) ───────────
    if (monthlyTotals.length >= 2) {
      const sorted    = [...monthlyTotals].sort((a, b) =>
        a._id.year !== b._id.year
          ? a._id.year  - b._id.year
          : a._id.month - b._id.month
      );
      const prev      = sorted[sorted.length - 2].total;
      const curr      = sorted[sorted.length - 1].total;
      const momChange = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null;

      if (momChange !== null) {
        const dir = momChange > 0 ? 'up' : 'down';
        insights.push({
          type:    'monthly_trend',
          icon:    'trending',
          title:   'Month-on-month trend',
          message: `Your total spending is ${dir} ${Math.abs(momChange)}% compared to last month.`,
          value:   momChange,
          severity: momChange > 15 ? 'warning' : momChange < -10 ? 'success' : 'info',
        });
      }
    }

    // ── 8. Unallocated income ─────────────────────────────
    if (budget.unallocated > 0) {
      insights.push({
        type:    'unallocated',
        icon:    'info',
        title:   'Unallocated income',
        message: `₹${Math.round(budget.unallocated).toLocaleString('en-IN')} of your income is not assigned to any category. Consider allocating it to savings or a new category.`,
        severity: 'info',
      });
    }

    res.status(200).json({
      success:  true,
      insights,
      alerts,
      summary: {
        income,
        totalSpent:  Math.round(totalSpent),
        remaining:   Math.round(remaining),
        overallPct,
        avgDailySpend,
        safeDailyLimit,
        daysLeft,
        weeklyComparison,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getInsights };