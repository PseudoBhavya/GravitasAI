import React, { useEffect, useState } from 'react';
import { dashAPI, taskAPI, wellnessAPI } from '../../services/api';
import { useStore } from '../../store/useStore';
import { RefreshCw, TrendingUp, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user } = useStore();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [plan, setPlan]         = useState(null);
  const [planLoading, setPL]    = useState(false);
  const [wellness, setWellness] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [d, w] = await Promise.allSettled([dashAPI.get(), wellnessAPI.insights()]);
      if (d.status === 'fulfilled') setData(d.value.data);
      if (w.status === 'fulfilled') setWellness(w.value.data);
    } catch {}
    setLoading(false);
  }

  async function genPlan() {
    setPL(true);
    try {
      const { data: p } = await taskAPI.dailyPlan({ date: format(new Date(), 'yyyy-MM-dd') });
      setPlan(p);
      toast.success('Daily plan generated');
    } catch (e) { toast.error('Plan generation failed — check Gemini quota'); }
    finally { setPL(false); }
  }

  const s = data?.summary || {};
  const trend = data?.workloadTrend || [];
  const risk = wellness?.insights?.burnoutRisk || s.burnoutRisk || 'low';
  const maxWorkload = Math.max(...trend.map(t => t.workloadScore || 0), 1);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="fade-up">
      {/* ── Masthead ────────────────────────────────────────────────────── */}
      <div style={{
        borderBottom: '4px solid var(--ink)',
        paddingBottom: 16,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--red)', marginBottom: 4 }}>
            Intelligence Briefing
          </div>
          <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 900, lineHeight: 1, color: 'var(--ink)' }}>
            {greeting()}, {user?.name?.split(' ')[0]}.
          </h1>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--n500)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · Vol. 1
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={12} strokeWidth={1.5} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={genPlan} disabled={planLoading}>
            {planLoading ? <div className="spinner-ink" style={{ width: 12, height: 12 }} /> : <Zap size={12} strokeWidth={1.5} />}
            Daily Plan
          </button>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: 0, border: '1px solid var(--ink)', borderRight: 'none', borderBottom: 'none' }}>
        {[
          { label: 'Tasks Pending', value: (s.totalTasks || 0) - (s.doneTasks || 0), sub: `${s.completionRate || 0}% completion rate` },
          { label: 'Priority Emails', value: s.pendingEmails || 0, sub: 'Requiring attention', accent: (s.pendingEmails || 0) > 0 },
          { label: 'Completed', value: s.doneTasks || 0, sub: 'Tasks done total' },
          { label: 'Burnout Risk', value: cap(risk), sub: `Wellness score ${wellness?.insights?.wellnessScore || '—'}/100`, redValue: risk === 'high', amberValue: risk === 'medium' },
        ].map((k, i) => (
          <div key={i} className="stat-card newsprint-texture" style={{ borderRight: '1px solid var(--ink)', borderBottom: '1px solid var(--ink)' }}>
            <div className="stat-label">{k.label}</div>
            <div className="stat-value" style={{ color: k.redValue ? 'var(--red)' : 'var(--ink)' }}>
              {loading ? '—' : k.value}
            </div>
            <div className="stat-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', border: '1px solid var(--ink)', borderTop: 'none', borderBottom: 'none', marginBottom: 0 }}>
        {/* Workload Trend */}
        <div style={{ borderRight: '1px solid var(--ink)', borderBottom: '1px solid var(--ink)', padding: 18 }}>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n500)', marginBottom: 12 }}>
            Workload Trend — Last 7 Days
          </div>
          {trend.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 72 }}>
              {trend.map((t, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{
                    width: '100%',
                    height: `${Math.round(((t.workloadScore || 0) / maxWorkload) * 64)}px`,
                    background: t.burnoutRisk === 'high' ? 'var(--red)' : 'var(--ink)',
                    minHeight: 4,
                    transition: 'height 0.4s ease',
                  }} />
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 8.5, color: 'var(--n500)' }}>
                    {format(new Date(t.date), 'EEE')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--n400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              No workload data yet
            </div>
          )}
        </div>

        {/* Wellness snapshot */}
        <div style={{ borderBottom: '1px solid var(--ink)', padding: 18 }}>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n500)', marginBottom: 12 }}>
            Wellness Snapshot
          </div>
          {wellness?.insights ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Burnout Risk', value: cap(wellness.insights.burnoutRisk), red: wellness.insights.burnoutRisk === 'high' },
                { label: 'Energy', value: cap(wellness.insights.energyPattern || '—') },
                { label: 'Trend', value: cap(wellness.insights.trend || '—') },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--muted)' }}>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--n500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.label}</span>
                  <span style={{ fontFamily: 'var(--ff-display)', fontSize: 15, fontWeight: 700, color: r.red ? 'var(--red)' : 'var(--ink)' }}>{r.value}</span>
                </div>
              ))}
              {wellness.insights.immediateActions?.[0] && (
                <div style={{ background: 'var(--n100)', border: '1px solid var(--muted)', padding: '8px 10px', fontFamily: 'var(--ff-body)', fontSize: 11.5, color: 'var(--n700)', lineHeight: 1.5 }}>
                  ↳ {wellness.insights.immediateActions[0].action}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--n400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* ── Daily Plan ──────────────────────────────────────────────────── */}
      {plan && (
        <div style={{ border: '1px solid var(--ink)', borderTop: 'none', padding: 20, marginBottom: 0 }} className="fade-up newsprint-texture">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid var(--ink)' }}>
            <div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>AI Generated · Daily Plan</div>
              <div style={{ fontFamily: 'var(--ff-display)', fontSize: 20, fontWeight: 700 }}>{format(new Date(), 'EEEE, MMMM d')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, color: 'var(--n500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Energy forecast</div>
              <div style={{ fontFamily: 'var(--ff-display)', fontSize: 18, fontWeight: 700, color: plan.energyForecast === 'high' ? 'var(--ink)' : 'var(--n600)' }}>{cap(plan.energyForecast || '—')}</div>
            </div>
          </div>

          {plan.topThreeGoals?.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              {plan.topThreeGoals.map((g, i) => (
                <div key={i} style={{ border: '1px solid var(--ink)', padding: '5px 12px', fontFamily: 'var(--ff-ui)', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--red)', fontWeight: 700 }}>{i + 1}.</span>
                  {g}
                </div>
              ))}
            </div>
          )}

          <div>
            {(plan.schedule || []).map((slot, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--muted)' }}>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10.5, color: 'var(--n500)', minWidth: 100, paddingTop: 2 }}>{slot.time}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--ff-ui)', fontSize: 13, fontWeight: 600 }}>{slot.title}</div>
                  {slot.description && <div style={{ fontFamily: 'var(--ff-body)', fontSize: 11.5, color: 'var(--n600)', marginTop: 2 }}>{slot.description}</div>}
                </div>
                <span className={`badge badge-${slot.type === 'deep_work' ? 'work' : slot.type === 'break' ? 'low' : 'medium'}`}>
                  {slot.type?.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>

          {plan.motivationalNote && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--muted)', fontFamily: 'var(--ff-body)', fontStyle: 'italic', fontSize: 13, color: 'var(--n600)' }}>
              "{plan.motivationalNote}"
            </div>
          )}
        </div>
      )}

      {/* ── Two column — Tasks + Emails ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid var(--ink)', borderTop: 'none' }}>
        <div style={{ borderRight: '1px solid var(--ink)', padding: 18 }}>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n500)', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid var(--ink)' }}>
            Top Priority Tasks
          </div>
          {(data?.recentTasks || []).length === 0 ? (
            <div className="empty"><div className="empty-sub">No tasks yet</div></div>
          ) : (data?.recentTasks || []).map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--muted)' }}>
              <div className={`pbar pbar-${t.priority}`} style={{ height: 28 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--n500)' }}>{t.dueDate ? format(new Date(t.dueDate), 'MMM d') : 'No due date'}</div>
              </div>
              <span className={`badge badge-${t.priority}`}>{t.priority}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n500)', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid var(--ink)' }}>
            Urgent Emails
          </div>
          {(data?.urgentEmails || []).length === 0 ? (
            <div className="empty"><div className="empty-sub">Inbox clear</div></div>
          ) : (data?.urgentEmails || []).map(e => (
            <div key={e.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--muted)' }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--n500)', marginBottom: 2 }}>{e.sender?.split('<')[0].trim()}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</div>
              {e.summary && <div style={{ fontFamily: 'var(--ff-body)', fontSize: 11.5, color: 'var(--n600)', marginTop: 2 }}>{e.summary}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer meta ─────────────────────────────────────────────────── */}
      <div className="ornament">✦ ✦ ✦</div>
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--n400)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', paddingBottom: 8 }}>
        Gravitas AI · Vol. 1 · {format(new Date(), 'MMMM d, yyyy')} · Three Specialized Gemini Agents
      </div>
    </div>
  );
}

function cap(s) {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}
