import React, { useState, useEffect } from 'react';
import { calAPI } from '../../services/api';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

export default function CalendarPage() {
  const [events, setEvents]     = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [analyzing, setAn]      = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await calAPI.events({ days: 7 });
      setEvents(data.events || []);
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to load calendar'); }
    finally { setLoading(false); }
  }

  async function analyze() {
    setAn(true);
    try {
      const { data } = await calAPI.analyze();
      setAnalysis(data.analysis);
      toast.success('Calendar analyzed');
    } catch { toast.error('Analysis failed — check Gemini quota'); }
    finally { setAn(false); }
  }

  // Group by day
  const grouped = events.reduce((acc, ev) => {
    const d = ev.start?.dateTime
      ? format(parseISO(ev.start.dateTime), 'yyyy-MM-dd')
      : ev.start?.date || 'unknown';
    if (!acc[d]) acc[d] = [];
    acc[d].push(ev);
    return acc;
  }, {});
  const days = Object.keys(grouped).sort();
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="fade-up">
      <div className="section-head">
        <div>
          <div className="section-kicker">Productivity Agent</div>
          <h2 className="section-title">Calendar</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={12} strokeWidth={1.5} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={analyze} disabled={analyzing}>
            {analyzing ? <div className="spinner-ink" style={{ width: 12, height: 12 }} /> : '✦'}
            AI Analysis
          </button>
        </div>
      </div>

      {/* AI Analysis panel */}
      {analysis && (
        <div style={{ border: '1px solid var(--ink)', marginBottom: 0 }} className="fade-up newsprint-texture">
          <div style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              AI Workload Analysis
            </div>
            <span style={{ fontFamily: 'var(--ff-display)', fontSize: 14, fontWeight: 700, color: analysis.workloadIntensity === 'overwhelming' || analysis.workloadIntensity === 'heavy' ? '#ff8080' : 'var(--paper)' }}>
              {analysis.workloadIntensity?.toUpperCase()}
            </span>
          </div>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid var(--ink)' }}>
            {[
              { label: 'Meeting Hours', value: `${analysis.totalMeetingHours?.toFixed(1) || 0}h` },
              { label: 'Focus Time', value: `${analysis.focusTimeHours?.toFixed(1) || 0}h` },
              { label: 'Workload Score', value: `${analysis.workloadScore || 0}/100` },
              { label: 'Busiest Day', value: analysis.busiestDay || '—' },
            ].map((m, i) => (
              <div key={i} style={{ padding: '14px 18px', borderRight: i < 3 ? '1px solid var(--ink)' : 'none' }}>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n500)', marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontFamily: 'var(--ff-display)', fontSize: 24, fontWeight: 900 }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Focus blocks + meeting windows */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--ink)' }}>
            <div style={{ padding: '14px 18px', borderRight: '1px solid var(--ink)' }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n500)', marginBottom: 10 }}>Suggested Focus Blocks</div>
              {analysis.suggestedFocusBlocks?.slice(0, 3).map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--muted)', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--red)', fontSize: 10 }}>■</span>
                  <span style={{ fontWeight: 600 }}>{b.day}</span>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--n500)' }}>{b.startTime}–{b.endTime}</span>
                </div>
              )) || <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--n400)' }}>No blocks detected</div>}
            </div>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n500)', marginBottom: 10 }}>Best Meeting Windows</div>
              {analysis.optimalMeetingWindows?.slice(0, 3).map((w, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--muted)', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--ink)', fontSize: 10 }}>◆</span>
                  <span style={{ fontWeight: 600 }}>{w.day}</span>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--n500)' }}>{w.startTime}–{w.endTime}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--ff-mono)', fontSize: 10, fontWeight: 700 }}>{w.score}/100</span>
                </div>
              )) || <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--n400)' }}>No windows found</div>}
            </div>
          </div>

          {/* Insights */}
          {analysis.insights?.length > 0 && (
            <div style={{ padding: '12px 18px' }}>
              {analysis.insights.map((ins, i) => (
                <div key={i} style={{ fontFamily: 'var(--ff-body)', fontSize: 12.5, color: 'var(--n600)', display: 'flex', gap: 8, padding: '4px 0' }}>
                  <span style={{ color: 'var(--ink)', flexShrink: 0 }}>·</span>{ins}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Events grouped by day */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48, border: '1px solid var(--ink)', borderTop: analysis ? 'none' : '1px solid var(--ink)' }}>
          <div className="spinner-ink" style={{ width: 24, height: 24 }} />
        </div>
      ) : days.length === 0 ? (
        <div className="empty" style={{ borderTop: 'none' }}>
          <div className="empty-title">No Events</div>
          <div className="empty-sub">Your next 7 days appear free</div>
        </div>
      ) : days.map((day, di) => (
        <div key={day} style={{ border: '1px solid var(--ink)', borderTop: (di === 0 && !analysis) ? '1px solid var(--ink)' : 'none' }}>
          {/* Day header */}
          <div style={{
            padding: '8px 18px',
            background: day === today ? 'var(--ink)' : 'var(--n100)',
            borderBottom: '1px solid var(--ink)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              fontFamily: 'var(--ff-display)', fontSize: 14, fontWeight: 900,
              color: day === today ? 'var(--paper)' : 'var(--ink)',
            }}>
              {day === today ? '▶ TODAY — ' : ''}
              {format(parseISO(day + 'T00:00:00'), 'EEEE, MMMM d')}
            </span>
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, color: day === today ? 'rgba(249,249,247,0.6)' : 'var(--n500)', marginLeft: 'auto' }}>
              {grouped[day].length} event{grouped[day].length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Events */}
          {grouped[day].map((ev, ei) => {
            const start = ev.start?.dateTime ? format(parseISO(ev.start.dateTime), 'HH:mm') : 'All day';
            const end   = ev.end?.dateTime   ? format(parseISO(ev.end.dateTime),   'HH:mm') : '';
            return (
              <div key={ev.id} style={{
                display: 'flex', gap: 0, alignItems: 'stretch',
                borderBottom: ei < grouped[day].length - 1 ? '1px solid var(--muted)' : 'none',
              }}>
                <div style={{ width: 100, padding: '10px 18px', borderRight: '1px solid var(--muted)', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--n500)' }}>{start}</div>
                  {end && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--n400)' }}>– {end}</div>}
                </div>
                <div style={{ flex: 1, padding: '10px 18px' }}>
                  <div style={{ fontFamily: 'var(--ff-ui)', fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>
                    {ev.summary || 'Untitled'}
                  </div>
                  {ev.location && (
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10.5, color: 'var(--n500)' }}>📍 {ev.location}</div>
                  )}
                  {ev.attendees?.length > 0 && (
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10.5, color: 'var(--n500)' }}>
                      {ev.attendees.length} attendee{ev.attendees.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
