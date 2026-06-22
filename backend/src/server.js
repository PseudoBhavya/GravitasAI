// ⚠️  dotenv MUST be the very first thing loaded
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const routes  = require('./routes');
const logger  = require('./utils/logger');

const app = express();

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(rateLimit({ windowMs: 15*60*1000, max: 200 }));

// ── Parsing ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'OK', service: 'Gravitas AI v2', timestamp: new Date() })
);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(err.message);
  res.status(err.status || 500).json({ error: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connected');
    await sequelize.sync({ alter: true });
    logger.info('✅ Tables ready');

    // Log config status (no secrets)
    logger.info(`🔑 Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? '✓ set' : '✗ MISSING'}`);
    logger.info(`🔑 Gemini API Key:   ${process.env.GEMINI_API_KEY ? '✓ set' : '✗ MISSING'}`);
    logger.info(`🔑 JWT Secret:       ${process.env.JWT_SECRET ? '✓ set' : '✗ MISSING'}`);
    logger.info(`🔗 Redirect URI:     ${process.env.GOOGLE_REDIRECT_URI}`);

    app.listen(PORT, () => logger.info(`🚀 Gravitas AI running → http://localhost:${PORT}`));
  } catch (err) {
  console.error('STARTUP ERROR:', err);
  logger.error(`Failed to start: ${err.stack || err.message || err}`);
  process.exit(1);
}
})();
