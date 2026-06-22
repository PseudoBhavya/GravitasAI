const express = require('express');
const authCtrl = require('./controllers/auth.controller');
const ctrl = require('./controllers/controllers');
const protect = require('./middleware/auth.middleware');

const router = express.Router();

// ── Auth (no protection needed) ───────────────────────────────────────────────
router.get('/auth/google',          authCtrl.getAuthUrl);
router.get('/auth/google/callback', authCtrl.handleCallback);
router.get('/auth/me',              protect, authCtrl.getMe);
router.post('/auth/logout',         protect, authCtrl.logout);
router.get('/auth/debug',           authCtrl.debug);   // dev only

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', protect, ctrl.getDashboard);

// ── Emails ────────────────────────────────────────────────────────────────────
router.get('/emails',       protect, ctrl.fetchEmails);
router.get('/emails/stats', protect, ctrl.getEmailStats);

// ── Tasks ─────────────────────────────────────────────────────────────────────
router.get('/tasks',            protect, ctrl.getTasks);
router.post('/tasks',           protect, ctrl.createTask);
router.put('/tasks/:id',        protect, ctrl.updateTask);
router.delete('/tasks/:id',     protect, ctrl.deleteTask);
router.post('/tasks/prioritize',protect, ctrl.prioritizeTasks);
router.get('/tasks/daily-plan', protect, ctrl.getDailyPlan);

// ── Calendar ──────────────────────────────────────────────────────────────────
router.get('/calendar/events',  protect, ctrl.getCalendarEvents);
router.get('/calendar/analyze', protect, ctrl.analyzeCalendar);

// ── Wellness ──────────────────────────────────────────────────────────────────
router.get('/wellness/insights',         protect, ctrl.getWellnessInsights);
router.post('/wellness/break-suggestions', protect, ctrl.getBreakSuggestions);

// ── Chat ──────────────────────────────────────────────────────────────────────
router.post('/chat/message', protect, ctrl.sendChat);

// ── Debug ─────────────────────────────────────────────────────
router.get('/debug/gemini', protect, ctrl.debugGemini);



module.exports = router;
