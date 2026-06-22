const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'gravitas_ai',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  }
);

const User = sequelize.define('User', {
  id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  googleId:     { type: Sequelize.STRING, unique: true, allowNull: false },
  email:        { type: Sequelize.STRING, allowNull: false, unique: true },
  name:         { type: Sequelize.STRING, allowNull: false },
  avatar:       { type: Sequelize.TEXT },
  accessToken:  { type: Sequelize.TEXT },
  refreshToken: { type: Sequelize.TEXT },
  tokenExpiry:  { type: Sequelize.DATE },
}, { timestamps: true, underscored: true });

const Task = sequelize.define('Task', {
  id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  userId:      { type: Sequelize.UUID, allowNull: false },
  title:       { type: Sequelize.STRING, allowNull: false },
  description: { type: Sequelize.TEXT },
  priority:    { type: Sequelize.ENUM('critical','high','medium','low'), defaultValue: 'medium' },
  status:      { type: Sequelize.ENUM('todo','in_progress','done'), defaultValue: 'todo' },
  dueDate:     { type: Sequelize.DATE },
  aiScore:     { type: Sequelize.FLOAT, defaultValue: 0 },
  source:      { type: Sequelize.ENUM('manual','email','ai'), defaultValue: 'manual' },
}, { timestamps: true, underscored: true });

const EmailCache = sequelize.define('EmailCache', {
  id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  userId:         { type: Sequelize.UUID, allowNull: false },
  gmailId:        { type: Sequelize.STRING, unique: true },
  subject:        { type: Sequelize.TEXT },
  sender:         { type: Sequelize.STRING },
  snippet:        { type: Sequelize.TEXT },
  body:           { type: Sequelize.TEXT },
  category:       { type: Sequelize.ENUM('work','personal','spam','low_priority','newsletter'), defaultValue: 'low_priority' },
  summary:        { type: Sequelize.TEXT },
  extractedTasks: { type: Sequelize.JSONB, defaultValue: [] },
  isRead:         { type: Sequelize.BOOLEAN, defaultValue: false },
  receivedAt:     { type: Sequelize.DATE },
  aiProcessed:    { type: Sequelize.BOOLEAN, defaultValue: false },
}, { timestamps: true, underscored: true });

const WellnessLog = sequelize.define('WellnessLog', {
  id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  userId:         { type: Sequelize.UUID, allowNull: false },
  date:           { type: Sequelize.DATEONLY, allowNull: false },
  workloadScore:  { type: Sequelize.INTEGER },
  meetingHours:   { type: Sequelize.FLOAT },
  tasksCompleted: { type: Sequelize.INTEGER },
  burnoutRisk:    { type: Sequelize.ENUM('low','medium','high'), defaultValue: 'low' },
  suggestions:    { type: Sequelize.JSONB, defaultValue: [] },
}, { timestamps: true, underscored: true });

const ChatHistory = sequelize.define('ChatHistory', {
  id:        { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  userId:    { type: Sequelize.UUID, allowNull: false },
  sessionId: { type: Sequelize.STRING, allowNull: false },
  role:      { type: Sequelize.ENUM('user','assistant'), allowNull: false },
  content:   { type: Sequelize.TEXT, allowNull: false },
}, { timestamps: true, underscored: true });

User.hasMany(Task,        { foreignKey: 'userId' });
User.hasMany(EmailCache,  { foreignKey: 'userId' });
User.hasMany(WellnessLog, { foreignKey: 'userId' });
User.hasMany(ChatHistory, { foreignKey: 'userId' });

module.exports = { sequelize, User, Task, EmailCache, WellnessLog, ChatHistory };
