const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than ₹0'],
    },

    // ── Fully dynamic — user types their own category name ──
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      lowercase: true,      // stored lowercase for consistent matching
      maxlength: [50, 'Category name too long'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
      default: '',
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    source: {
      type: String,
      enum: ['manual', 'csv'],
      default: 'manual',
    },
  },
  { timestamps: true }
);

// ── Indexes for fast per-user queries ─────────────────────
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1, date: -1 });

// ─────────────────────────────────────────────────────────
// STATIC QUERY HELPERS
// ─────────────────────────────────────────────────────────

// All expenses for a specific month
expenseSchema.statics.getMonthlyExpenses = function (userId, year, month) {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59, 999);
  return this.find({ user: userId, date: { $gte: start, $lte: end } }).sort({ date: -1 });
};

// Total spent per category in a given month
expenseSchema.statics.getCategoryTotals = function (userId, year, month) {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59, 999);
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id:   '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);
};

// Daily totals for last N days (for trend charts)
expenseSchema.statics.getDailyTotals = function (userId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: since } } },
    {
      $group: {
        _id:   { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Monthly totals for last N months (for bar chart)
expenseSchema.statics.getMonthlyTotals = function (userId, months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: since } } },
    {
      $group: {
        _id: {
          year:  { $year:  '$date' },
          month: { $month: '$date' },
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
};

// This week vs last week comparison
expenseSchema.statics.getWeeklyComparison = async function (userId) {
  const now = new Date();

  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);

  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setMilliseconds(-1);

  const [thisWeek, lastWeek] = await Promise.all([
    this.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: thisWeekStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    this.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          date: { $gte: lastWeekStart, $lte: lastWeekEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const thisWeekTotal = thisWeek[0]?.total || 0;
  const lastWeekTotal = lastWeek[0]?.total || 0;

  // % change: positive = increased spending, negative = reduced
  const percentChange =
    lastWeekTotal === 0
      ? null
      : Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100);

  return { thisWeek: thisWeekTotal, lastWeek: lastWeekTotal, percentChange };
};

// Average daily spend over the last N days
expenseSchema.statics.getAvgDailySpend = async function (userId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const result = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: since } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const total = result[0]?.total || 0;
  return Math.round(total / days);
};

// Total spent so far this month
expenseSchema.statics.getSpentThisMonth = async function (userId) {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const result = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: start } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total || 0;
};

module.exports = mongoose.model('Expense', expenseSchema);