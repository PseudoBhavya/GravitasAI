const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
require('dotenv').config();

console.log(
  "Gemini Key Loaded:",
  !!process.env.GEMINI_API_KEY
);

console.log(
  "Gemini Key Prefix:",
  process.env.GEMINI_API_KEY?.slice(0,6)
);

class BaseAgent {
  constructor(name, systemPrompt) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    if (!process.env.GEMINI_API_KEY) {
      logger.warn(`[${name}] GEMINI_API_KEY not set — AI features disabled`);
      this.disabled = true;
      return;
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    });
  }

  async prompt(userPrompt, context = {}) {
    if (this.disabled) return { error: 'Gemini API key not configured' };
    const ctx = Object.keys(context).length ? `\nCONTEXT: ${JSON.stringify(context)}` : '';
    const full = `${this.systemPrompt}${ctx}\n\n${userPrompt}\n\nRespond ONLY with valid JSON. No markdown, no backticks.`;
    
    logger.info(`[Gemini] Request Started for agent: ${this.name}`);
    try {
      const result = await this.model.generateContent(full);
      const text = result.response.text().trim();
      logger.info(`[Gemini] Request Success for agent: ${this.name}`);
      return this._parse(text);
    } catch (err) {
      logger.error(`[Gemini] Request Failed for agent: ${this.name} - ${err.message}`);
      console.error("[Gemini] Request Failed:", err);
      throw err;
    }
  }

  async chat(history, message) {
    if (this.disabled) return "Gemini API key not configured. Please add it to your .env file.";
    
    logger.info(`[Gemini] Request Started (Chat) for agent: ${this.name}`);
    try {
      const chat = this.model.startChat({
        history: [
          { role: 'user', parts: [{ text: this.systemPrompt }] },
          { role: 'model', parts: [{ text: 'Understood. I am your Gravitas AI wellness coach.' }] },
          ...history.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        ],
        generationConfig: { temperature: 0.8, maxOutputTokens: 512 },
      });
      const result = await chat.sendMessage(message);
      logger.info(`[Gemini] Request Success (Chat) for agent: ${this.name}`);
      return result.response.text().trim();
    } catch (err) {
      logger.error(`[Gemini] Request Failed (Chat) for agent: ${this.name} - ${err.message}`);
      console.error("[Gemini] Request Failed:", err);
      throw err;
    }
  }

  _parse(text) {
    try {
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (err) {
      logger.error(`[${this.name}] JSON Parse Error: ${err.message}. Raw text: ${text}`);
      return { raw: text, parseError: true };
    }
  }
}

module.exports = BaseAgent;

