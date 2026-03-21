const jwt         = require('jsonwebtoken');
const User        = require('../models/User');
const Budget      = require('../models/Budget');
const { createError } = require('../middleware/errorHandler');

// ── Generate JWT ──────────────────────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ─────────────────────────────────────────────────────────
// @route   POST /api/auth/signup
// @access  Public
// ─────────────────────────────────────────────────────────
const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Basic field check
    if (!name || !email || !password) {
      throw createError(400, 'Name, email and password are required');
    }

    // Check duplicate email
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) throw createError(409, 'An account with this email already exists');

    // Create user (password hashed in pre-save hook)
    const user = await User.create({ name, email, password });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createError(400, 'Email and password are required');
    }

    // Explicitly select password (it has select: false in schema)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) throw createError(401, 'Invalid email or password');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw createError(401, 'Invalid email or password');

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   GET /api/auth/me
// @access  Protected
// ─────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    // req.user already attached by auth middleware
    res.status(200).json({
      success: true,
      user: req.user.toPublicJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   PUT /api/auth/setup
// @access  Protected
// First-time setup: save income + create initial budget
// ─────────────────────────────────────────────────────────
const setupProfile = async (req, res, next) => {
  try {
    const { monthlyIncome, categories } = req.body;

    if (!monthlyIncome || monthlyIncome <= 0) {
      throw createError(400, 'Please enter a valid monthly income');
    }

    // Update user income + mark profile complete
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { monthlyIncome, isProfileComplete: true },
      { new: true, runValidators: true }
    );

    // Build this month's budget
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    // Use user-provided categories if sent, otherwise use suggestions
    const budgetCategories =
      Array.isArray(categories) && categories.length > 0
        ? categories.map((c) => ({
            name:            c.name.toLowerCase().trim(),
            allocatedAmount: Number(c.allocatedAmount),
            percentage:      Math.round((Number(c.allocatedAmount) / monthlyIncome) * 100),
            spentAmount:     0,
          }))
        : Budget.buildSuggestedCategories(monthlyIncome);

    // Upsert — in case setup is re-run
    await Budget.findOneAndUpdate(
      { user: req.user._id, month, year },
      { totalIncome: monthlyIncome, categories: budgetCategories },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile setup complete',
      user: user.toPublicJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   PUT /api/auth/update
// @access  Protected
// Update name / income (not password)
// ─────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, monthlyIncome } = req.body;
    const updates = {};

    if (name)          updates.name          = name.trim();
    if (monthlyIncome) updates.monthlyIncome = monthlyIncome;

    if (Object.keys(updates).length === 0) {
      throw createError(400, 'No fields provided to update');
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated',
      user: user.toPublicJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// @route   PUT /api/auth/change-password
// @access  Protected
// ─────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw createError(400, 'Current and new password are required');
    }
    if (newPassword.length < 6) {
      throw createError(400, 'New password must be at least 6 characters');
    }

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw createError(401, 'Current password is incorrect');

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { signup, login, getMe, setupProfile, updateProfile, changePassword };