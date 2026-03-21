const mongoose = require('mongoose');

// ── Suggested starter allocations (% of income) ──────────
// Shown to user on setup — they can edit or delete all of these
const SUGGESTED_ALLOCATIONS = [
  { category: 'food',          percentage: 30 },
  { category: 'travel',        percentage: 15 },
  { category: 'entertainment', percentage: 10 },
  { category: 'savings',       percentage: 20 },
  { category: 'shopping',      percentage: 10 },
  { category: 'health',        percentage:  5 },
  { category: 'utilities',     percentage:  5 },
  { category: 'education',     percentage:  3 },
  { category: 'other',         percentage:  2 },
];

// ── Per-category sub-schema ───────────────────────────────
const categorySchema = new mongoose.Schema(
  {
    // User-defined name — completely free text
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      lowercase: true,
      maxlength: [50, 'Category name too long'],
    },

    // Amount the user has allocated for this category this month
    allocatedAmount: {
      type: Number,
      required: true,
      min: [0, 'Allocated amount cannot be negative'],
    },

    // Percentage of total income (stored for reference / UI display)
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // Running total of actual expenses in this category this month
    // Updated every time an expense is added / edited / deleted
    spentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

// ── Per-category virtuals ─────────────────────────────────
categorySchema.virtual('remaining').get(function () {
  return Math.max(0, this.allocatedAmount - this.spentAmount);
});

categorySchema.virtual('usedPercentage').get(function () {
  if (this.allocatedAmount === 0) return 0;
  return Math.min(100, Math.round((this.spentAmount / this.allocatedAmount) * 100));
});

categorySchema.virtual('isOverspent').get(function () {
  return this.spentAmount > this.allocatedAmount;
});

categorySchema.virtual('isNearLimit').get(function () {
  // True when 80%+ of budget used
  return !this.isOverspent && this.usedPercentage >= 80;
});

// ── Main budget schema ────────────────────────────────────
const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    totalIncome: {
      type: Number,
      required: [true, 'Monthly income is required'],
      min: [1, 'Income must be at least ₹1'],
    },

    // User-defined category list — fully dynamic
    categories: {
      type: [categorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

// ── Unique budget per user per month ──────────────────────
budgetSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

// ─────────────────────────────────────────────────────────
// BUDGET-LEVEL VIRTUALS
// ─────────────────────────────────────────────────────────

budgetSchema.virtual('totalAllocated').get(function () {
  return this.categories.reduce((sum, c) => sum + c.allocatedAmount, 0);
});

budgetSchema.virtual('totalSpent').get(function () {
  return this.categories.reduce((sum, c) => sum + c.spentAmount, 0);
});

budgetSchema.virtual('totalRemaining').get(function () {
  return this.totalIncome - this.totalSpent;
});

budgetSchema.virtual('unallocated').get(function () {
  // Income not yet assigned to any category
  return Math.max(0, this.totalIncome - this.totalAllocated);
});

budgetSchema.virtual('overallUsedPercentage').get(function () {
  if (this.totalIncome === 0) return 0;
  return Math.min(100, Math.round((this.totalSpent / this.totalIncome) * 100));
});

// ─────────────────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────────────────

// Recalculate all category spentAmounts from a fresh list of expenses
// Call this after any expense add / edit / delete
budgetSchema.methods.recalculateSpending = function (expenses) {
  // Build a spending map from expenses
  const spendMap = {};
  for (const exp of expenses) {
    const key = exp.category.toLowerCase().trim();
    spendMap[key] = (spendMap[key] || 0) + exp.amount;
  }

  // Apply to each category
  for (const cat of this.categories) {
    cat.spentAmount = spendMap[cat.name] || 0;
  }
};

// Get a single category by name (case-insensitive)
budgetSchema.methods.getCategory = function (name) {
  return this.categories.find(
    (c) => c.name === name.toLowerCase().trim()
  );
};

// Add a new category (prevents duplicates)
budgetSchema.methods.addCategory = function (name, allocatedAmount) {
  const key = name.toLowerCase().trim();
  const exists = this.categories.some((c) => c.name === key);
  if (exists) throw new Error(`Category "${name}" already exists`);

  const percentage =
    this.totalIncome > 0
      ? Math.round((allocatedAmount / this.totalIncome) * 100)
      : 0;

  this.categories.push({ name: key, allocatedAmount, percentage, spentAmount: 0 });
};

// Update an existing category's allocation
budgetSchema.methods.updateCategory = function (name, allocatedAmount) {
  const cat = this.getCategory(name);
  if (!cat) throw new Error(`Category "${name}" not found`);
  cat.allocatedAmount = allocatedAmount;
  cat.percentage =
    this.totalIncome > 0
      ? Math.round((allocatedAmount / this.totalIncome) * 100)
      : 0;
};

// Remove a category
budgetSchema.methods.removeCategory = function (name) {
  const key = name.toLowerCase().trim();
  this.categories = this.categories.filter((c) => c.name !== key);
};

// Get categories that are overspent or near limit (for alerts)
budgetSchema.methods.getAlerts = function () {
  const alerts = [];
  for (const cat of this.categories) {
    if (cat.isOverspent) {
      const over = Math.round(cat.spentAmount - cat.allocatedAmount);
      alerts.push({
        type: 'overspent',
        category: cat.name,
        message: `You have overspent your ${cat.name} budget by ₹${over}`,
        severity: 'danger',
      });
    } else if (cat.isNearLimit) {
      alerts.push({
        type: 'near_limit',
        category: cat.name,
        message: `You have used ${cat.usedPercentage}% of your ${cat.name} budget`,
        severity: 'warning',
      });
    }
  }
  return alerts;
};

// ─────────────────────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────────────────────

// Build suggested categories from income (shown on setup page)
budgetSchema.statics.buildSuggestedCategories = function (income) {
  return SUGGESTED_ALLOCATIONS.map(({ category, percentage }) => ({
    name: category,
    percentage,
    allocatedAmount: Math.round((income * percentage) / 100),
    spentAmount: 0,
  }));
};

// Get current month budget or create it fresh
budgetSchema.statics.getOrCreateCurrent = async function (userId, income) {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  let budget = await this.findOne({ user: userId, month, year });
  if (!budget) {
    budget = await this.create({
      user: userId,
      month,
      year,
      totalIncome: income,
      categories: this.buildSuggestedCategories(income),
    });
  }
  return budget;
};

budgetSchema.set('toJSON',   { virtuals: true });
budgetSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Budget', budgetSchema);
module.exports.SUGGESTED_ALLOCATIONS = SUGGESTED_ALLOCATIONS;