const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be at least ₹1'],
    },
    deadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'achieved', 'cancelled'],
      default: 'active',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [300, 'Notes cannot exceed 300 characters'],
      default: '',
    },

    // ── Snapshots at goal creation — used for accurate projections ──
    // These are saved so analysis doesn't change retroactively
    snapshotIncome: {
      type: Number,
      default: 0,
    },
    snapshotAvgMonthlySpend: {
      type: Number,
      default: 0,
    },
    snapshotAvgDailySpend: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────
// VIRTUALS
// ─────────────────────────────────────────────────────────

goalSchema.virtual('daysLeft').get(function () {
  if (!this.deadline) return null;
  const diff = this.deadline - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

goalSchema.virtual('monthsLeft').get(function () {
  if (!this.deadline) return null;
  const diff = this.deadline - new Date();
  return Math.max(0, +(diff / (1000 * 60 * 60 * 24 * 30)).toFixed(1));
});

goalSchema.virtual('isDeadlinePassed').get(function () {
  if (!this.deadline) return false;
  return new Date() > this.deadline;
});

// ─────────────────────────────────────────────────────────
// CORE METHOD: Full Affordability Analysis
// ─────────────────────────────────────────────────────────
//
// Parameters (all computed fresh in goalController, passed in):
//   budget        — current month Budget document (with virtuals)
//   categoryTotals— array of { _id: categoryName, total } from Expense.getCategoryTotals
//   avgDailySpend — number: avg daily spend last 30 days
//
goalSchema.methods.getAffordabilityAnalysis = function (budget, categoryTotals, avgDailySpend) {
  const income        = budget.totalIncome;
  const totalSpent    = budget.totalSpent;           // virtual from Budget
  const totalRemaining = budget.totalRemaining;       // virtual: income - totalSpent

  // ── Days remaining in current month ──────────────────
  const now          = new Date();
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed   = now.getDate();
  const daysLeft     = daysInMonth - daysPassed;

  // ── Projected month-end spend ─────────────────────────
  // If we're N days in with X spent, project full month at same rate
  const projectedMonthlySpend =
    daysPassed > 0
      ? Math.round((totalSpent / daysPassed) * daysInMonth)
      : 0;

  const projectedOverBudget = projectedMonthlySpend > income;
  const projectedSurplus    = income - projectedMonthlySpend;

  // ── Can afford right now? ─────────────────────────────
  const canAffordNow = totalRemaining >= this.targetAmount;

  // ── If cannot afford now: how much still needed ───────
  const shortfall = Math.max(0, this.targetAmount - totalRemaining);

  // ── Daily reduction needed to free up the shortfall ──
  // i.e. reduce daily spend by X for remaining days
  const dailyReductionNeeded =
    daysLeft > 0 && shortfall > 0
      ? Math.ceil(shortfall / daysLeft)
      : 0;

  // ── Revised daily budget to hit goal ──────────────────
  // What the user's daily spend limit should be
  const safeDailyBudget =
    daysLeft > 0
      ? Math.floor((totalRemaining - this.targetAmount) / daysLeft)
      : 0;

  // ── Months needed to save if using monthly surplus ───
  const monthlySurplus = income - (this.snapshotAvgMonthlySpend || totalSpent);
  const monthsToSave   =
    monthlySurplus > 0
      ? +(this.targetAmount / monthlySurplus).toFixed(1)
      : null;

  // ── If deadline set: monthly saving rate required ─────
  let requiredMonthlySaving = null;
  let requiredDailySaving   = null;
  if (this.deadline && this.monthsLeft > 0) {
    requiredMonthlySaving = Math.ceil(this.targetAmount / this.monthsLeft);
    requiredDailySaving   = Math.ceil(this.targetAmount / (this.daysLeft || 1));
  }

  // ── Per-category analysis ─────────────────────────────
  // Show which categories have room vs which are overspent
  const categoryInsights = budget.categories.map((cat) => {
    const spent       = cat.spentAmount;
    const allocated   = cat.allocatedAmount;
    const remaining   = Math.max(0, allocated - spent);
    const usedPct     = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
    return {
      name:        cat.name,
      allocated,
      spent,
      remaining,
      usedPct,
      status:
        usedPct >= 100 ? 'overspent'  :
        usedPct >= 80  ? 'near_limit' :
                         'healthy',
    };
  });

  // Categories with room that could contribute to goal
  const categoriesWithRoom = categoryInsights.filter((c) => c.status === 'healthy' && c.remaining > 0);

  // ── Summary verdict ───────────────────────────────────
  let verdict;
  if (canAffordNow) {
    verdict = `You can afford "${this.title}" right now! You have ₹${Math.round(totalRemaining)} remaining this month.`;
  } else if (safeDailyBudget > 0) {
    verdict = `Spend max ₹${safeDailyBudget}/day for the next ${daysLeft} days to afford "${this.title}" this month.`;
  } else if (monthsToSave !== null) {
    verdict = `At your current savings rate, you can afford "${this.title}" in ~${monthsToSave} month(s).`;
  } else {
    verdict = `Your current expenses exceed your income. Reduce spending to save for "${this.title}".`;
  }

  return {
    // Core flags
    canAffordNow,
    verdict,

    // Income & spending context
    income,
    totalSpent: Math.round(totalSpent),
    totalRemaining: Math.round(totalRemaining),
    targetAmount: this.targetAmount,
    shortfall: Math.round(shortfall),

    // Projection
    projectedMonthlySpend: Math.round(projectedMonthlySpend),
    projectedOverBudget,
    projectedSurplus: Math.round(projectedSurplus),

    // Action numbers
    dailyReductionNeeded: Math.round(dailyReductionNeeded),
    safeDailyBudget:      Math.max(0, Math.round(safeDailyBudget)),
    avgDailySpend:        Math.round(avgDailySpend),
    daysLeftInMonth:      daysLeft,

    // Saving timeline
    monthlySurplus:        Math.round(monthlySurplus),
    monthsToSave,
    requiredMonthlySaving,
    requiredDailySaving,

    // Per-category breakdown
    categoryInsights,
    categoriesWithRoom,

    // Deadline
    deadline:    this.deadline,
    daysLeft:    this.daysLeft,
    monthsLeft:  this.monthsLeft,
  };
};

goalSchema.set('toJSON',   { virtuals: true });
goalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Goal', goalSchema);