import React, { useState, useEffect, useRef } from 'react';
import { wellnessAPI, chatAPI } from '../../services/api';
import { RefreshCw, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const QUICK = [
  "How's my burnout risk today?",
  "Give me a 5-minute break idea",
  "How can I protect my focus time?",
  "I'm feeling overwhelmed — help",
  "What does my workload pattern say?",
];

export default function WellnessPage() {
  const [insights, setInsights]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [messages, setMessages]   = useState([
    { role: 'assistant', content: "Good day. I'm your Gravitas wellness coach. I can see your workload data and I'm here to help you stay productive without burning out. What's on your mind?", id: 0 }
  ]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [sessionId]               = useState(() => uuidv4());
  const msgsEndRef                = useRef(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await wellnessAPI.insights();
      setInsights(data);
    } catch {}
    finally { setLoading(false); }
  }

  async function send(text) {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: msg, id: Date.now() }]);
    setSending(true);
    try {
      const { data } = await chatAPI.send({ message: msg, sessionId });
      setMessages(m => [...m, { role: 'assistant', content: data.reply, id: Date.now() + 1 }]);
    } catch (e) {
      const errMsg = e.response?.data?.error?.includes('quota')
        ? "Gemini quota exceeded. Your daily limit has been reached — try again tomorrow."
        : "Connection issue. Please check the backend is running.";
      setMessages(m => [...m, { role: 'assistant', content: errMsg, id: Date.now() + 1 }]);
    } finally { setSending(false); }
  }

  const ins = insights?.insights;
  const risk = ins?.burnoutRisk || 'low';

  return (
    <div className="fade-up">
      <div className="section-head">
        <div>
          <div className="section-kicker">Wellness Agent</div>
          <h2 className="section-title">Wellness & AI Coach</h2>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={12} strokeWidth={1.5} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 0, border: '1px solid var(--ink)' }}>
        {/* ── Left: Insights ───────────────────────────────────────────── */}
        <div style={{ borderRight: '1px solid var(--ink)' }}>
          {/* Burnout card */}
          <div style={{
            padding: 20, borderBottom: '1px solid var(--ink)',
            background: risk === 'high' ? 'var(--red)' : risk === 'medium' ? 'var(--n700)' : 'var(--ink)',
            color: 'var(--paper)',
          }} className="newsprint-texture">
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: risk === 'high' ? 'rgba(249,249,247,0.7)' : 'rgba(249,249,247,0.5)', marginBottom: 8 }}>
              Burnout Risk Assessment
            </div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 48, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {loading ? '—' : risk === 'low' ? 'Low' : risk === 'medium' ? 'Medium' : 'HIGH'}
            </div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10.5, marginTop: 8, color: 'rgba(249,249,247,0.7)' }}>
              Score {ins?.burnoutScore || '—'}/100 · Wellness {ins?.wellnessScore || '—'}/100
            </div>
          </div>

          {/* Metrics */}
          {ins && (
            <div style={{ borderBottom: '1px solid var(--ink)' }}>
              {[
                { label: 'Energy Pattern', value: cap(ins.energyPattern) },
                { label: 'Workload Score', value: `${ins.workloadScore}/100` },
                { label: 'Trend', value: cap(ins.trend) },
              ].map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: i < 2 ? '1px solid var(--muted)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n500)' }}>
                    {m.label}
                  </span>
                  <span style={{ fontFamily: 'var(--ff-display)', fontSize: 16, fontWeight: 700 }}>
                    {m.value || '—'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Immediate actions */}
          {ins?.immediateActions?.length > 0 && (
            <div style={{ padding: 18, borderBottom: '1px solid var(--ink)' }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n500)', marginBottom: 12 }}>
                Recommended Now
              </div>
              {ins.immediateActions.slice(0, 3).map((a, i) => (
                <div key={i} style={{ border: '1px solid var(--muted)', padding: '10px 12px', marginBottom: 8, background: 'var(--n100)' }}>
                  <div style={{ fontFamily: 'var(--ff-ui)', fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{a.action}</div>
                  <div style={{ fontFamily: 'var(--ff-body)', fontSize: 11.5, color: 'var(--n600)', marginBottom: 6 }}>{a.reason}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, color: 'var(--n500)' }}>{a.duration}</span>
                    <span className={`badge badge-${a.impact === 'high' ? 'work' : 'medium'}`}>{a.impact} impact</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Risk factors */}
          {ins?.riskFactors?.length > 0 && (
            <div style={{ padding: 18 }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n500)', marginBottom: 10 }}>
                Risk Factors
              </div>
              {ins.riskFactors.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', fontFamily: 'var(--ff-body)', fontSize: 12.5, color: 'var(--n700)', borderBottom: i < ins.riskFactors.length - 1 ? '1px solid var(--muted)' : 'none' }}>
                  <span style={{ color: 'var(--red)', flexShrink: 0 }}>▸</span>{r}
                </div>
              ))}
              {ins.protectiveFactors?.length > 0 && (
                <>
                  <div style={{ height: 1, background: 'var(--ink)', margin: '12px 0' }} />
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n500)', marginBottom: 8 }}>
                    Protective Factors
                  </div>
                  {ins.protectiveFactors.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', fontFamily: 'var(--ff-body)', fontSize: 12.5, color: 'var(--n700)' }}>
                      <span style={{ color: 'var(--ink)', flexShrink: 0 }}>✓</span>{p}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {!ins && !loading && (
            <div className="empty" style={{ border: 'none', padding: 32 }}>
              <div className="empty-sub">Complete some tasks to generate insights</div>
            </div>
          )}
        </div>

        {/* ── Right: Chat ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 680 }}>
          {/* Chat header */}
          <div style={{ padding: '12px 18px', borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--red)', marginBottom: 3 }}>
              ● Live Session
            </div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 17, fontWeight: 700 }}>Wellness Coach</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--n500)', marginTop: 1 }}>Powered by Gemini · Context-aware</div>
          </div>

          {/* Quick prompts (show only at start) */}
          {messages.length <= 1 && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--muted)', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n400)', marginBottom: 4 }}>Quick dispatch</div>
              {QUICK.map(q => (
                <button key={q} onClick={() => send(q)}
                  style={{ textAlign: 'left', background: 'var(--n100)', border: '1px solid var(--muted)', padding: '7px 10px', fontFamily: 'var(--ff-body)', fontSize: 12, color: 'var(--n700)', cursor: 'pointer', transition: 'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'var(--paper)'; e.currentTarget.style.borderColor = 'var(--ink)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--n100)'; e.currentTarget.style.color = 'var(--n700)'; e.currentTarget.style.borderColor = 'var(--muted)'; }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="chat-messages" style={{ flex: 1, padding: '14px 16px', overflowY: 'auto' }}>
            {messages.map(m => (
              <div key={m.id} className={`bubble-wrap-${m.role === 'user' ? 'user' : 'ai'}`} style={{ marginBottom: 10 }}>
                {m.role === 'assistant' && (
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n400)', marginBottom: 4 }}>Coach</div>
                )}
                <div className={`bubble bubble-${m.role === 'user' ? 'user' : 'ai'}`}>{m.content}</div>
              </div>
            ))}
            {sending && (
              <div className="bubble-wrap-ai">
                <div className="bubble bubble-ai" style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '12px 14px' }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{ width: 5, height: 5, background: 'var(--n400)', display: 'inline-block', animation: `blink 1s ${i*0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={msgsEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-row">
            <input
              className="input-box"
              placeholder="Send a dispatch to your coach…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              disabled={sending}
              style={{ flex: 1, borderRight: 'none' }}
            />
            <button
              className="btn btn-primary"
              onClick={() => send()}
              disabled={sending || !input.trim()}
              style={{ flexShrink: 0 }}>
              <Send size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {ins?.workPatternInsights && (
        <div style={{ border: '1px solid var(--ink)', borderTop: 'none', padding: '14px 20px', background: 'var(--n100)' }}>
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--red)', marginRight: 10 }}>Analysis</span>
          <span style={{ fontFamily: 'var(--ff-body)', fontSize: 13, color: 'var(--n700)', fontStyle: 'italic' }}>{ins.workPatternInsights}</span>
        </div>
      )}
    </div>
  );
}

function cap(s) {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}
