/**
 * auth.controller.js
 *
 * FIXED OAuth flow:
 * - oauth2Client is created fresh per request to avoid stale state
 * - GOOGLE_REDIRECT_URI is validated on startup
 * - Detailed error messages forwarded to frontend
 * - Token storage uses upsert with returning:true correctly
 */

const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');
require('dotenv').config();

// ── Validate env on module load ─────────────────────────────────────────────
const REQUIRED = ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REDIRECT_URI','JWT_SECRET'];
REQUIRED.forEach(k => {
  if (!process.env[k]) {
    logger.error(`❌ Missing required env var: ${k}`);
  }
});

// ── Scopes ───────────────────────────────────────────────────────────────────
const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar'
];

// ── Helper: fresh oauth2 client ───────────────────────────────────────────────
function makeOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// ── GET /api/auth/google ──────────────────────────────────────────────────────
// Redirects the frontend to the Google OAuth URL
exports.getAuthUrl = (req, res) => {
  try {
    const client = makeOAuthClient();
    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      include_granted_scopes: true,
    });
    logger.info(`Auth URL generated (client_id: ${process.env.GOOGLE_CLIENT_ID?.slice(0,20)}…)`);
    res.redirect(url);
  } catch (err) {
    logger.error(`getAuthUrl error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
// Google redirects here after user grants permission
exports.handleCallback = async (req, res) => {
  const { code, error: oauthError } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // Google denied access
  if (oauthError) {
    logger.error(`OAuth denied: ${oauthError}`);
    return res.redirect(`${frontendUrl}/auth/error?msg=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    logger.error('OAuth callback: no code received');
    return res.redirect(`${frontendUrl}/auth/error?msg=No+authorization+code+received`);
  }

  try {
    const client = makeOAuthClient();

    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    logger.info('OAuth tokens received ✓');
    client.setCredentials(tokens);

    // Fetch Google profile
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data: profile } = await oauth2.userinfo.get();
    logger.info(`Profile fetched: ${profile.email}`);

    // Upsert user in DB
    const [user] = await User.upsert({
      googleId:     profile.id,
      email:        profile.email,
      name:         profile.name,
      avatar:       profile.picture,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenExpiry:  tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    }, { returning: true });

    // Issue JWT
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`Login success: ${user.email}`);
    res.redirect(`${frontendUrl}/auth/callback?token=${jwtToken}`);

  } catch (err) {
    logger.error(`handleCallback error: ${err.message}`);
    logger.error(err.stack);
    res.redirect(`${frontendUrl}/auth/error?msg=${encodeURIComponent(err.message)}`);
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id','email','name','avatar','createdAt'],
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
exports.logout = (req, res) => {
  res.json({ success: true });
};

// ── GET /api/auth/debug ───────────────────────────────────────────────────────
// Only available in development — shows config without exposing secrets
exports.debug = (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({
    hasClientId:     !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    redirectUri:     process.env.GOOGLE_REDIRECT_URI,
    haJwtSecret:     !!process.env.JWT_SECRET,
    hasGeminiKey:    !!process.env.GEMINI_API_KEY,
    dbName:          process.env.DB_NAME,
    dbUser:          process.env.DB_USER,
    nodeEnv:         process.env.NODE_ENV,
  });
};
