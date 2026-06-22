const BaseAgent = require('./BaseAgent');
const logger = require('../utils/logger');

// ── Agent 1: Communication ────────────────────────────────────────────────────
class CommunicationAgent extends BaseAgent {
  constructor() {
    super('CommunicationAgent', `You are the Communication Agent for Gravitas AI.
Classify emails, summarize content, extract tasks, score urgency 0-100.
Identify if it is high priority (e.g. contains 'urgent', 'asap', 'deadline', 'interview', 'meeting', 'payment pending', 'client issue', 'today', 'tomorrow', or specific times).
Do NOT automatically mark self-sent emails as low priority.
Always return structured JSON only.`);
  }

  async processEmail(email) {
    try {
      const result = await this.prompt(`Analyze this email and return JSON:
FROM: ${email.sender}
SUBJECT: ${email.subject}
BODY: ${(email.body || email.snippet || '').slice(0, 2000)}

Ensure you return a JSON object containing:
- category: "work|personal|spam|low_priority|newsletter"
- priority: "high|medium|low"
- summary: "2 sentences summarizing the email"
- action_required: "Reply|Archive|Delete|None"
- confidence_score: 0-100
- urgencyScore: 0-100
- extractedTasks: [{"title":"","priority":"high|medium|low","dueDate":"ISO string or null"}]
- requiresReply: true|false
- suggestedAction: "Reply|Archive|Delete|None"`);

      // Fill in defaults if any field is missing
      logger.info('[CommunicationAgent] Gemini Used');
      return {
        category: result.category || 'low_priority',
        priority: result.priority || 'low',
        summary: result.summary || '',
        action_required: result.action_required || 'None',
        confidence_score: result.confidence_score || 80,
        urgencyScore: result.urgencyScore || 30,
        extractedTasks: result.extractedTasks || [],
        requiresReply: result.requiresReply || false,
        suggestedAction: result.suggestedAction || 'None',
        ...result
      };
    } catch (err) {
      logger.warn(`[CommunicationAgent] Falling back to rule-based classification due to: ${err.message}`);
      return this.processEmailFallback(email);
    }
  }

  async triageEmails(emails) {
    try {
      const res = await this.prompt(`Triage these ${emails.length} emails:\n${
        emails.slice(0, 20).map((e, i) => `[${i}] FROM: ${e.sender} | SUBJECT: ${e.subject} | SNIPPET: ${(e.snippet||'').slice(0,100)}`).join('\n')
      }\n\nReturn: { "triage": [{ "index":0, "category":"work|personal|spam|low_priority|newsletter", "urgencyScore":0-100, "summary":"one sentence", "requiresAction":true }], "stats": {"work":0,"spam":0,"newsletter":0,"low_priority":0} }`);
      logger.info('[CommunicationAgent] Gemini Used');
      return res;
    } catch (err) {
      logger.warn(`[CommunicationAgent] Falling back to rule-based triage due to: ${err.message}`);
      return this.triageEmailsFallback(emails);
    }
  }

  processEmailFallback(email) {
    const text = ((email.subject || '') + ' ' + (email.body || email.snippet || '')).toLowerCase();
    
    // Check urgency keywords
    const urgentKeywords = ['urgent', 'asap', 'deadline', 'interview', 'meeting', 'payment pending', 'client issue', 'today', 'tomorrow'];
    let hasUrgentWord = false;
    for (const word of urgentKeywords) {
      if (text.includes(word)) {
        hasUrgentWord = true;
        break;
      }
    }
    const timeRefRegex = /\b(at|by|before|around)\s+(\d{1,2}(:\d{2})?\s*(am|pm)?)\b/i;
    const hasTimeRef = timeRefRegex.test(text);

    let priority = 'low';
    let urgencyScore = 15;
    let category = 'personal';

    if (hasUrgentWord || hasTimeRef) {
      priority = 'high';
      urgencyScore = 85;
      category = 'work';
    } else if (text.includes('invoice') || text.includes('report') || text.includes('project') || text.includes('task') || text.includes('feedback')) {
      priority = 'medium';
      urgencyScore = 50;
      category = 'work';
    } else if (text.includes('newsletter') || text.includes('unsubscribe') || text.includes('weekly digest')) {
      priority = 'low';
      urgencyScore = 10;
      category = 'newsletter';
    } else if (text.includes('buy now') || text.includes('offer') || text.includes('discount') || text.includes('promo')) {
      priority = 'low';
      urgencyScore = 5;
      category = 'spam';
    }

    const extractedTasks = [];
    if (hasUrgentWord || priority === 'high' || priority === 'medium') {
      extractedTasks.push({
        title: `Follow up on: ${email.subject || 'Email'}`,
        priority: priority === 'high' ? 'high' : 'medium',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString()
      });
    }

    return {
      category,
      priority,
      summary: `Email from ${email.sender || 'Unknown'} regarding "${email.subject || 'No Subject'}".`,
      action_required: (priority === 'high' || priority === 'medium') ? 'Reply' : 'Archive',
      confidence_score: 75,
      urgencyScore,
      extractedTasks,
      requiresReply: priority === 'high',
      suggestedAction: (priority === 'high' || priority === 'medium') ? 'Reply' : 'Archive'
    };
  }

  triageEmailsFallback(emails) {
    const triage = emails.map((e, idx) => {
      const fb = this.processEmailFallback(e);
      return {
        index: idx,
        category: fb.category,
        urgencyScore: fb.urgencyScore,
        summary: fb.summary,
        requiresAction: fb.priority === 'high' || fb.priority === 'medium'
      };
    });

    const stats = { work: 0, spam: 0, newsletter: 0, low_priority: 0 };
    triage.forEach(item => {
      if (stats[item.category] !== undefined) {
        stats[item.category]++;
      } else {
        stats.low_priority++;
      }
    });

    return { triage, stats };
  }
}

// ── Agent 2: Productivity ─────────────────────────────────────────────────────
class ProductivityAgent extends BaseAgent {
  constructor() {
    super('ProductivityAgent', `You are the Productivity Agent for Gravitas AI.
Analyze workload, prioritize tasks, suggest schedules. Return JSON only.`);
  }

  async prioritizeTasks(tasks) {
    try {
      const res = await this.prompt(`Prioritize these tasks using urgency × importance:
${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate })))}

Return: { "prioritized": [{ "id":"", "recommendedPriority":"critical|high|medium|low", "aiScore":0-100, "reasoning":"why" }], "suggestions": ["tip1","tip2"] }`);
      logger.info('[ProductivityAgent] Gemini Used');
      return res;
    } catch (err) {
      logger.warn(`[ProductivityAgent] Falling back to rule-based task prioritization due to: ${err.message}`);
      return this.prioritizeTasksFallback(tasks);
    }
  }

  async analyzeCalendar(events, dateRange) {
    try {
      const res = await this.prompt(`Analyze calendar for ${dateRange.start} to ${dateRange.end}:
${JSON.stringify(events.slice(0, 30).map(e => ({ title: e.summary, start: e.start?.dateTime || e.start?.date, end: e.end?.dateTime || e.end?.date, attendees: e.attendees?.length || 0 })))}

Return: { "workloadScore": 0-100, "workloadIntensity": "light|moderate|heavy|overwhelming", "totalMeetingHours": 0.0, "focusTimeHours": 0.0, "busiestDay": "", "suggestedFocusBlocks": [{"day":"","startTime":"","endTime":""}], "optimalMeetingWindows": [{"day":"","startTime":"","endTime":"","score":0}], "insights": [""] }`);
      logger.info('[ProductivityAgent] Gemini Used');
      return res;
    } catch (err) {
      logger.warn(`[ProductivityAgent] Falling back to rule-based calendar analysis due to: ${err.message}`);
      return this.analyzeCalendarFallback(events, dateRange);
    }
  }

  async generateDailyPlan(tasks, events, date) {
    try {
      const res = await this.prompt(`Create a daily plan for ${date}.
TASKS: ${JSON.stringify(tasks.slice(0,10).map(t=>({title:t.title,priority:t.priority,dueDate:t.dueDate})))}
EVENTS: ${JSON.stringify(events.slice(0,10).map(e=>({title:e.summary,time:e.start?.dateTime})))}

Return: { "schedule": [{"time":"09:00-10:30","type":"deep_work|meeting|break|admin","title":"","description":""}], "topThreeGoals": ["","",""], "motivationalNote": "", "energyForecast": "high|medium|low" }`);
      logger.info('[ProductivityAgent] Gemini Used');
      return res;
    } catch (err) {
      logger.warn(`[ProductivityAgent] Falling back to rule-based daily plan due to: ${err.message}`);
      return this.generateDailyPlanFallback(tasks, events, date);
    }
  }

  prioritizeTasksFallback(tasks) {
    const urgentKeywords = ['urgent', 'asap', 'deadline', 'interview', 'meeting', 'payment pending', 'client issue', 'today', 'tomorrow'];
    const prioritized = tasks.map(t => {
      let score = 50;
      const titleLower = (t.title || '').toLowerCase();
      
      if (t.priority === 'critical') score += 30;
      else if (t.priority === 'high') score += 20;
      else if (t.priority === 'low') score -= 20;

      if (t.dueDate) {
        const diffMs = new Date(t.dueDate).getTime() - Date.now();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 0) score += 25;
        else if (diffDays <= 1) score += 20;
        else if (diffDays <= 3) score += 10;
        else if (diffDays > 7) score -= 10;
      }

      for (const kw of urgentKeywords) {
        if (titleLower.includes(kw)) {
          score += 15;
          break;
        }
      }

      score = Math.max(0, Math.min(100, score));

      let recommendedPriority = 'medium';
      if (score >= 80) recommendedPriority = 'critical';
      else if (score >= 65) recommendedPriority = 'high';
      else if (score >= 40) recommendedPriority = 'medium';
      else recommendedPriority = 'low';

      return {
        id: t.id,
        recommendedPriority,
        aiScore: score,
        reasoning: `Rule-based prioritization based on priority (${t.priority || 'medium'}) and task details.`
      };
    });

    prioritized.sort((a, b) => b.aiScore - a.aiScore);

    return {
      prioritized,
      suggestions: [
        "Focus on critical/high tasks today.",
        "Check tasks due soon or overdue to prevent blockages.",
        "Plan focus blocks around your highest priority items."
      ]
    };
  }

  analyzeCalendarFallback(events, dateRange) {
    const totalMeetingHours = events.reduce((sum, e) => {
      if (e.start && e.end) {
        const start = new Date(e.start.dateTime || e.start.date).getTime();
        const end = new Date(e.end.dateTime || e.end.date).getTime();
        return sum + (end - start) / (1000 * 60 * 60);
      }
      return sum;
    }, 0);

    const workloadIntensity = totalMeetingHours > 6 ? 'overwhelming' :
                              totalMeetingHours > 4 ? 'heavy' :
                              totalMeetingHours > 2 ? 'moderate' : 'light';

    const workloadScore = Math.min(100, Math.round(totalMeetingHours * 12.5));
    const focusTimeHours = Math.max(0, 8 - totalMeetingHours);

    return {
      workloadScore,
      workloadIntensity,
      totalMeetingHours: parseFloat(totalMeetingHours.toFixed(1)),
      focusTimeHours: parseFloat(focusTimeHours.toFixed(1)),
      busiestDay: dateRange.start || "Today",
      suggestedFocusBlocks: [
        { day: dateRange.start || "Today", startTime: "09:00", endTime: "11:00" },
        { day: dateRange.start || "Today", startTime: "14:00", endTime: "16:00" }
      ],
      optimalMeetingWindows: [
        { day: dateRange.start || "Today", startTime: "11:00", endTime: "12:00", score: 90 },
        { day: dateRange.start || "Today", startTime: "16:00", endTime: "17:00", score: 85 }
      ],
      insights: [
        `You have ${totalMeetingHours.toFixed(1)} hours of meetings scheduled.`,
        `Focus time availability is approximately ${focusTimeHours.toFixed(1)} hours.`,
        workloadIntensity === 'overwhelming' || workloadIntensity === 'heavy'
          ? "Consider declining non-essential meetings to recover focus time."
          : "Keep up the balanced schedule."
      ]
    };
  }

  generateDailyPlanFallback(tasks, events, date) {
    const schedule = [];
    schedule.push({ time: "09:00-09:30", type: "admin", title: "Morning Standup & Email Catchup", description: "Review inbox and set priorities for the day." });
    
    let timeIndex = 9.5;
    
    events.forEach(e => {
      const eTime = e.start?.dateTime || e.start?.date;
      if (eTime) {
        const eventDate = new Date(eTime);
        const hours = eventDate.getHours();
        const mins = eventDate.getMinutes();
        const startStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        const endStr = `${(hours + 1).toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        schedule.push({
          time: `${startStr}-${endStr}`,
          type: "meeting",
          title: e.summary || "Meeting",
          description: "Calendar synchronized event."
        });
      }
    });

    tasks.slice(0, 3).forEach((t) => {
      const startH = Math.floor(timeIndex);
      const startM = Math.round((timeIndex % 1) * 60);
      timeIndex += 1.5;
      const endH = Math.floor(timeIndex);
      const endM = Math.round((timeIndex % 1) * 60);
      
      const startStr = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
      const endStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
      
      schedule.push({
        time: `${startStr}-${endStr}`,
        type: "deep_work",
        title: `Focus: ${t.title}`,
        description: `Dedicated time block for high priority task (${t.priority || 'medium'}).`
      });
    });

    schedule.push({ time: "17:00-17:30", type: "admin", title: "Daily Wrap-up", description: "Review completed items and update task statuses." });

    const topThreeGoals = tasks.slice(0, 3).map(t => t.title);
    while (topThreeGoals.length < 3) {
      topThreeGoals.push("Plan and organize upcoming tasks");
    }

    return {
      schedule,
      topThreeGoals,
      motivationalNote: "Stay focused, take regular micro-breaks, and prioritize your energy!",
      energyForecast: tasks.length > 5 ? "medium" : "high"
    };
  }
}

// ── Agent 3: Wellness ─────────────────────────────────────────────────────────
class WellnessAgent extends BaseAgent {
  constructor() {
    super('WellnessAgent', `You are the Wellness Coach for Gravitas AI.
You are warm, evidence-based, and specific. Help users avoid burnout, manage energy, and stay productive.
Reference their actual data when available. Give concrete, actionable advice.
When chatting, keep responses under 100 words — concise and direct.`);
  }

  async analyzeWellness(data) {
    try {
      const res = await this.prompt(`Analyze this workload data for burnout risk:
${JSON.stringify(data)}

Return: { "burnoutRisk": "low|medium|high", "burnoutScore": 0-100, "wellnessScore": 0-100, "workloadScore": 0-100, "energyPattern": "consistent|declining|volatile|recovering", "immediateActions": [{"action":"","duration":"","reason":"","impact":"high|medium|low"}], "riskFactors": [""], "protectiveFactors": [""], "workPatternInsights": "2-3 sentences", "trend": "improving|stable|declining" }`);
      logger.info('[WellnessAgent] Gemini Used');
      return res;
    } catch (err) {
      logger.warn(`[WellnessAgent] Falling back to rule-based wellness analysis due to: ${err.message}`);
      return this.analyzeWellnessFallback(data);
    }
  }

  async suggestBreaks(state) {
    try {
      const res = await this.prompt(`User has worked ${state.workingMinutes} minutes. Time: ${state.currentTime}. Meetings today: ${state.meetingHours}h.
Return: { "breakNeeded": true|false, "urgency": "immediate|soon|later", "suggestions": [{"type":"micro|short","duration":"","activity":"","benefit":""}], "motivationalMessage": "" }`);
      logger.info('[WellnessAgent] Gemini Used');
      return res;
    } catch (err) {
      logger.warn(`[WellnessAgent] Falling back to rule-based break suggestions due to: ${err.message}`);
      return this.suggestBreaksFallback(state);
    }
  }

  async chat(history, message) {
    try {
      const res = await super.chat(history, message);
      logger.info('[WellnessAgent] Gemini Used');
      return res;
    } catch (err) {
      logger.warn(`[WellnessAgent] Falling back to rule-based chatbot due to: ${err.message}`);
      return this.chatFallback(history, message);
    }
  }

  analyzeWellnessFallback(data) {
    const logs = data.logs || [];
    const tasksDone = data.tasksCompleted || data.tasksDone || 0;
    const tasksPending = data.tasksPending || 0;
    
    const avgWorkload = logs.length
      ? logs.reduce((sum, l) => sum + (l.workloadScore || 0), 0) / logs.length
      : 50;

    let burnoutRisk = 'low';
    let burnoutScore = 30;
    let wellnessScore = 80;

    if (avgWorkload > 80 || tasksPending > 15) {
      burnoutRisk = 'high';
      burnoutScore = 85;
      wellnessScore = 40;
    } else if (avgWorkload > 50 || tasksPending > 8) {
      burnoutRisk = 'medium';
      burnoutScore = 60;
      wellnessScore = 65;
    }

    return {
      burnoutRisk,
      burnoutScore,
      wellnessScore,
      workloadScore: Math.round(avgWorkload),
      energyPattern: avgWorkload > 70 ? 'declining' : 'consistent',
      immediateActions: [
        { action: "Take a 10-minute screen break", duration: "10m", reason: "Prevent cognitive fatigue and eye strain.", impact: "high" },
        { action: "Schedule focus time blocks", duration: "2h", reason: "Minimize distractions and context switching.", impact: "medium" },
        { action: "Do a quick stretching routine", duration: "5m", reason: "Release physical tension from sitting.", impact: "medium" }
      ],
      riskFactors: avgWorkload > 60 ? ["High meeting load", "Growing backlog of pending tasks"] : ["Sedentary work habits"],
      protectiveFactors: tasksDone > 0 ? ["High completion rate of tasks", "Consistent break schedule"] : ["Adequate sleep patterns"],
      workPatternInsights: `Workload is currently ${burnoutRisk}. Keep prioritizing critical tasks and maintain clear boundaries.`,
      trend: avgWorkload > 70 ? 'declining' : 'stable'
    };
  }

  suggestBreaksFallback(state) {
    const workingMinutes = state.workingMinutes || 90;
    const breakNeeded = workingMinutes >= 60;
    
    return {
      breakNeeded,
      urgency: workingMinutes >= 120 ? "immediate" : (workingMinutes >= 90 ? "soon" : "later"),
      suggestions: [
        { type: "micro", duration: "2m", activity: "Stretching and water break", benefit: "Hydration and posture correction" },
        { type: "short", duration: "10m", activity: "Walk away from screen", benefit: "Reduces eye strain and resets attention span" }
      ],
      motivationalMessage: workingMinutes >= 90
        ? "You've been working hard! Time to rest your eyes and stretch."
        : "Keep going, you're doing great. Don't forget to take a quick breather soon."
    };
  }

  chatFallback(history, message) {
    const msg = message.toLowerCase();
    if (msg.includes('burnout') || msg.includes('stress') || msg.includes('tired')) {
      return "I hear you. Feeling burnt out or exhausted is really tough. Please remember to take regular breaks, set boundaries on your work hours, and focus on one task at a time. What is one small thing you can take off your plate today?";
    }
    if (msg.includes('break') || msg.includes('rest')) {
      return "Taking breaks is essential for keeping your focus sharp and protecting your energy. Try a micro-break: step away from your screen, stretch for 2 minutes, or grab a glass of water. Your work will benefit from a refreshed mind.";
    }
    if (msg.includes('hello') || msg.includes('hi')) {
      return "Hello! I am your Gravitas AI wellness coach. How can I help you balance your productivity and well-being today?";
    }
    return "Thank you for sharing that. Managing your energy alongside your tasks is key. Try breaking down your next big task into tiny, bite-sized steps, and make sure to step away from the desk when you finish. Let me know how I can support you.";
  }
}

module.exports = {
  communicationAgent: new CommunicationAgent(),
  productivityAgent:  new ProductivityAgent(),
  wellnessAgent:      new WellnessAgent(),
};

