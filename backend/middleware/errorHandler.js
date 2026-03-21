// ─────────────────────────────────────────────────────────
// Global Error Handler — must be last middleware in server.js
// Catches all errors thrown via next(error) or unhandled throws
// ─────────────────────────────────────────────────────────

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';
  let errors     = null;

  // ── Mongoose Validation Error ─────────────────────────
  // e.g. required field missing, min/max violated
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
    message = 'Validation failed';
  }

  // ── Mongoose Duplicate Key (unique index violated) ────
  // e.g. email already registered, duplicate budget for same month
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue?.[field] || '';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} "${value}" already exists`;
  }

  // ── Mongoose Cast Error ───────────────────────────────
  // e.g. invalid ObjectId format in URL param
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: "${err.value}"`;
  }

  // ── JWT Errors (fallback — normally caught in auth.js) ─
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // ── Log in development only ───────────────────────────
  if (process.env.NODE_ENV === 'development') {
    console.error(`\n❌ [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.error(`   Status  : ${statusCode}`);
    console.error(`   Message : ${message}`);
    if (errors) console.error(`   Errors  :`, errors);
    console.error(`   Stack   :`, err.stack);
  }

  // ── Send response ─────────────────────────────────────
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// ── Helper: create a custom error with status code ───────
// Usage: throw createError(404, 'Budget not found')
const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = errorHandler;
module.exports.createError = createError;