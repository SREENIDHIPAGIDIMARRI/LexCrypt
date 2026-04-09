const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const vaultRoutes = require('./routes/vault.routes');
const cryptoRoutes = require('./routes/crypto.routes');
const signatureRoutes = require('./routes/signature.routes');

const app = express();

// ── Security Headers (Helmet) ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS — only allow the React frontend ──
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Global Rate Limiting ──
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// ── Auth-specific stricter limiter ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please wait 15 minutes.' },
});

// ── Body Parsers ──
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── Request Logging ──
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Static uploads ──
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Health Check ──
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'LexCrypt API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── Routes ──
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/signatures', signatureRoutes);

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
