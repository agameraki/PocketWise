const csv             = require('csv-parser');
const fs              = require('fs');
const Expense         = require('../models/Expense');
const Budget          = require('../models/Budget');
const { createError } = require('../middleware/errorHandler');

// Expected CSV columns (case-insensitive):
//   amount, category, description, date
// Example row: 500, food, Lunch at Café, 2024-01-15

// ── Helper: sync budget after bulk import ─────────────────
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

// ── Helper: parse a date string flexibly ─────────────────
const parseDate = (str) => {
  if (!str) return new Date();
  const d = new Date(str.trim());
  return isNaN(d.getTime()) ? new Date() : d;
};

// ─────────────────────────────────────────────────────────
// @route   POST /api/csv/upload
// @access  Protected
// Upload and import expenses from a CSV file
// ─────────────────────────────────────────────────────────
const uploadCSV = async (req, res, next) => {
  if (!req.file) {
    return next(createError(400, 'No CSV file uploaded'));
  }

  const filePath = req.file.path;
  const results  = [];
  const errors   = [];

  try {
    // Parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ mapHeaders: ({ header }) => header.toLowerCase().trim() }))
        .on('data', (row) => {
          const amount   = parseFloat(row.amount);
          const category = (row.category || '').toLowerCase().trim();
          const date     = parseDate(row.date);

          if (!amount || amount <= 0) {
            errors.push({ row, reason: 'Invalid or missing amount' });
            return;
          }
          if (!category) {
            errors.push({ row, reason: 'Missing category' });
            return;
          }

          results.push({
            user:        req.user._id,
            amount,
            category,
            description: (row.description || '').trim(),
            date,
            source:      'csv',
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      fs.unlinkSync(filePath);
      return next(createError(400, 'No valid rows found in CSV. Check format: amount, category, description, date'));
    }

    // Bulk insert
    const inserted = await Expense.insertMany(results, { ordered: false });

    // Sync budget
    await syncBudget(req.user._id);

    // Clean up temp file
    fs.unlinkSync(filePath);

    res.status(201).json({
      success:       true,
      message:       `${inserted.length} expense(s) imported successfully`,
      imported:      inserted.length,
      skipped:       errors.length,
      skippedRows:   errors,
    });
  } catch (error) {
    // Clean up temp file on error
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/csv/template
// @access  Protected
// Download a sample CSV template
// ─────────────────────────────────────────────────────────
const downloadTemplate = (req, res) => {
  const header = 'amount,category,description,date\n';
  const rows = [
    '500,food,Lunch at restaurant,2024-01-15',
    '1200,travel,Monthly metro pass,2024-01-16',
    '299,entertainment,Netflix subscription,2024-01-17',
    '2000,shopping,Clothes,2024-01-18',
    '800,health,Gym membership,2024-01-19',
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="pocketwise_template.csv"');
  res.send(header + rows);
};

module.exports = { uploadCSV, downloadTemplate };