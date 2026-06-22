const { google } = require('googleapis');
const { Task, EmailCache, WellnessLog, ChatHistory, User } = require('../models');
const { communicationAgent, productivityAgent, wellnessAgent } = require('../agents/agents');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');
const logger = require('../utils/logger');
require('dotenv').config();

const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL) || 300 });

// ── Google API client helper ──────────────────────────────────────────────────
async function getGoogleAuth(userId) {
  const user = await User.findByPk(userId);
  if (!user?.accessToken) throw new Error('Google tokens missing — please re-login');
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });
  return auth;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const uid = req.userId;
    const [totalTasks, doneTasks, pendingEmails, recentTasks, urgentEmails, wellnessLogs] = await Promise.all([
      Task.count({ where: { userId: uid } }),
      Task.count({ where: { userId: uid, status: 'done' } }),
      EmailCache.count({ where: { userId: uid, category: 'work', isRead: false } }),
      Task.findAll({ where: { userId: uid, status: { [Op.in]: ['todo','in_progress'] } }, order: [['aiScore','DESC'],['dueDate','ASC']], limit: 5 }),
      EmailCache.findAll({ where: { userId: uid, category: 'work' }, order: [['receivedAt','DESC']], limit: 5 }),
      WellnessLog.findAll({ where: { userId: uid }, order: [['date','ASC']], limit: 7 }),
    ]);
    const completionRate = totalTasks ? Math.round((doneTasks/totalTasks)*100) : 0;
    const latestLog = wellnessLogs[wellnessLogs.length - 1];
    res.json({ summary: { totalTasks, doneTasks, completionRate, pendingEmails, burnoutRisk: latestLog?.burnoutRisk || 'low' }, recentTasks, urgentEmails, workloadTrend: wellnessLogs });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── Emails ────────────────────────────────────────────────────────────────────
exports.fetchEmails = async (req, res) => {
  const { maxResults = 20 } = req.query;
  try {
    const auth = await getGoogleAuth(req.userId);
    const gmail = google.gmail({ version: 'v1', auth });
    const listRes = await gmail.users.messages.list({ userId: 'me', maxResults: parseInt(maxResults), labelIds: ['INBOX'] });
    const messages = listRes.data.messages || [];

    const results = await Promise.allSettled(messages.map(async msg => {
      const existing = await EmailCache.findOne({ where: { gmailId: msg.id, userId: req.userId } });
      if (existing) return existing;
      const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
      const headers = detail.data.payload?.headers || [];
      const get = name => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      const emailData = { gmailId: msg.id, userId: req.userId, subject: get('Subject'), sender: get('From'), snippet: detail.data.snippet, receivedAt: new Date(parseInt(detail.data.internalDate)) };
      let aiResult = {};
      try { aiResult = await communicationAgent.processEmail(emailData); } catch {}
      const [record] = await EmailCache.upsert({ ...emailData, category: aiResult.category || 'low_priority', summary: aiResult.summary || '', extractedTasks: aiResult.extractedTasks || [], aiProcessed: true }, { returning: true });
      return record;
    }));

    const emails = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    res.json({ emails, total: emails.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getEmailStats = async (req, res) => {
  try {
    const emails = await EmailCache.findAll({ where: { userId: req.userId } });
    const stats = emails.reduce((acc, e) => { acc[e.category] = (acc[e.category]||0)+1; return acc; }, {});
    res.json({ stats, total: emails.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
exports.getTasks = async (req, res) => {
  try {
    const where = { userId: req.userId };
    if (req.query.status) where.status = req.query.status;
    const tasks = await Task.findAll({ where, order: [['aiScore','DESC'],['dueDate','ASC']], limit: 100 });
    res.json({ tasks });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createTask = async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, userId: req.userId });
    res.status(201).json({ task });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ where: { id: req.params.id, userId: req.userId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await task.update(req.body);
    res.json({ task });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteTask = async (req, res) => {
  try {
    await Task.destroy({ where: { id: req.params.id, userId: req.userId } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.prioritizeTasks = async (req, res) => {
  try {
    const tasks = await Task.findAll({ where: { userId: req.userId, status: { [Op.in]: ['todo','in_progress'] } } });
    const result = await productivityAgent.prioritizeTasks(tasks);
    if (result.prioritized) {
      await Promise.all(result.prioritized.map(p =>
        Task.update({ aiScore: p.aiScore, priority: p.recommendedPriority }, { where: { id: p.id, userId: req.userId } })
      ));
    }
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getDailyPlan = async (req, res) => {
  try {
    const tasks = await Task.findAll({ where: { userId: req.userId, status: { [Op.in]: ['todo','in_progress'] } }, order: [['aiScore','DESC']], limit: 10 });
    const date = req.query.date || new Date().toISOString().split('T')[0];
    let events = [];
    try {
      const auth = await getGoogleAuth(req.userId);
      const cal = google.calendar({ version: 'v3', auth });
      const r = await cal.events.list({ calendarId: 'primary', timeMin: new Date(date).toISOString(), timeMax: new Date(new Date(date).getTime() + 86400000).toISOString(), singleEvents: true, orderBy: 'startTime' });
      events = r.data.items || [];
    } catch {}
    const plan = await productivityAgent.generateDailyPlan(tasks, events, date);
    res.json(plan);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── Calendar ──────────────────────────────────────────────────────────────────
exports.getCalendarEvents = async (req, res) => {
  try {
    const auth = await getGoogleAuth(req.userId);
    const cal = google.calendar({ version: 'v3', auth });
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 7*86400000).toISOString();
    const r = await cal.events.list({ calendarId: 'primary', timeMin, timeMax, maxResults: 100, singleEvents: true, orderBy: 'startTime' });
    res.json({ events: r.data.items || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.analyzeCalendar = async (req, res) => {
  try {
    const auth = await getGoogleAuth(req.userId);
    const cal = google.calendar({ version: 'v3', auth });
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 7*86400000).toISOString();
    const r = await cal.events.list({ calendarId: 'primary', timeMin, timeMax, maxResults: 100, singleEvents: true, orderBy: 'startTime' });
    const analysis = await productivityAgent.analyzeCalendar(r.data.items || [], { start: timeMin.split('T')[0], end: timeMax.split('T')[0] });
    res.json({ analysis, events: r.data.items || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── Wellness ──────────────────────────────────────────────────────────────────
exports.getWellnessInsights = async (req, res) => {
  try {
    const logs = await WellnessLog.findAll({ where: { userId: req.userId }, order: [['date','DESC']], limit: 7 });
    const tasksDone = await Task.count({ where: { userId: req.userId, status: 'done' } });
    const tasksPending = await Task.count({ where: { userId: req.userId, status: 'todo' } });
    const insights = await wellnessAgent.analyzeWellness({ logs, tasksDone, tasksPending, avgWorkload: logs.reduce((s,l)=>s+(l.workloadScore||0),0)/(logs.length||1) });
    res.json({ insights, logs });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getBreakSuggestions = async (req, res) => {
  try {
    const suggestions = await wellnessAgent.suggestBreaks({ workingMinutes: req.body.workingMinutes || 90, meetingHours: req.body.meetingHours || 0, currentTime: new Date().toLocaleTimeString() });
    res.json(suggestions);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── Chat ──────────────────────────────────────────────────────────────────────
exports.sendChat = async (req, res) => {
  const { message, sessionId = uuidv4() } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
  try {
    const history = await ChatHistory.findAll({ where: { userId: req.userId, sessionId }, order: [['createdAt','ASC']], limit: 20 });
    const reply = await wellnessAgent.chat(history.map(h => ({ role: h.role, content: h.content })), message);
    await ChatHistory.bulkCreate([
      { userId: req.userId, sessionId, role: 'user', content: message },
      { userId: req.userId, sessionId, role: 'assistant', content: reply },
    ]);
    res.json({ reply, sessionId });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── Debug Gemini ──────────────────────────────────────────────────────────────
exports.debugGemini = async (req, res) => {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ success: false, error: 'GEMINI_API_KEY is not configured in .env' });
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent("Say hello from Gravitas AI");
    res.json({ success: true, response: result.response.text().trim() });
  } catch (err) {
    console.error("[Gemini] Debug Endpoint Failed:", err);
    res.status(500).json({ success: false, error: err.message, stack: err.stack, details: err.status });
  }
};

