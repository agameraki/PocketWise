const express    = require('express');
const cors       = require('cors');
const dotenv     = require('dotenv');
const path       = require('path');
const connectDB  = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();
connectDB();

const app  = express();
const PROD = process.env.NODE_ENV === 'production';

// ── CORS ──────────────────────────────────────────────────
// In production we serve frontend from same origin so CORS
// is only needed for local dev
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);       // Postman / curl
    if (PROD)    return callback(null, true);        // same-origin in prod
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Serve frontend static files ───────────────────────────
// In production the frontend folder sits one level above backend
const FRONTEND_PATH = path.join(__dirname, '..', 'frontend');
if (PROD) {
  app.use(express.static(FRONTEND_PATH));
}

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/budget',   require('./routes/budgetRoutes'));
app.use('/api/goals',    require('./routes/goalRoutes'));
app.use('/api/insights', require('./routes/insightRoutes'));
app.use('/api/csv',      require('./routes/csvRoutes'));

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PocketWise API running', env: process.env.NODE_ENV });
});

// ── Catch-all: serve index.html for all non-API routes ────
// This makes page refreshes work (dashboard.html, etc.)
if (PROD) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
  });
}

// ── Global error handler (must be last) ───────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 PocketWise running on port ${PORT}`);
  console.log(`   Mode  : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});