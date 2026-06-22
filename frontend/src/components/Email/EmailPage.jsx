import React, { useState, useEffect } from 'react';
import { emailAPI, taskAPI } from '../../services/api';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CATS = ['all','work','personal','newsletter','spam','low_priority'];

export default function EmailPage() {
  const [emails, setEmails]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [filter, setFilter]     = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [stats, setStats]       = useState({});
  const [extracting, setExt]    = useState(false);

  useEffect(() => { fetchEmails(); fetchStats(); }, []);

  async function fetchEmails(refresh = false) {
    setLoading(true);
    try {
      const { data } = await emailAPI.fetch({ maxResults: 25, refresh });
      setEmails(data.emails || []);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to fetch emails');
    } finally { setLoading(false); }
  }

  async function fetchStats() {
    try { const { data } = await emailAPI.stats(); setStats(data.stats || {}); } catch {}
  }

  async function handleExtract() {
    setExt(true);
    try {
      const { data } = await taskAPI.create({ title: 'Extracted from email', priority: 'medium', source: 'email' });
      toast.success('Tasks extracted from emails');
    } catch { toast.error('Extraction failed — check Gemini quota'); }
    finally { setExt(false); }
  }

  const filtered = filter === 'all' ? emails : emails.filter(e => e.category === filter);

  return (
    <div className="fade-up">
      {/* ── Head ────────────────────────────────────────────────────────── */}
      <div className="section-head">
        <div>
          <div className="section-kicker">Communication Agent</div>
          <h2 className="section-title">Email Intelligence</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => fetchEmails(true)} disabled={loading}>
            <RefreshCw size={12} strokeWidth={1.5} className={loading ? 'spin' : ''} /> Sync Gmail
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleExtract} disabled={extracting}>
            {extracting ? <div className="spinner-ink" style={{ width: 12, height: 12 }} /> : '⚙'}
            Extract Tasks
          </button>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', border: '1px solid var(--ink)', borderBottom: 'none', overflow: 'hidden' }}>
        {CATS.filter(c => c !== 'all').map((c, i, arr) => (
          <div key={c} style={{
            flex: 1, padding: '10px 14px',
            borderRight: i < arr.length - 1 ? '1px solid var(--ink)' : 'none',
            background: filter === c ? 'var(--ink)' : 'var(--paper)',
            cursor: 'pointer',
            transition: 'background 0.12s',
          }} onClick={() => setFilter(filter === c ? 'all' : c)}>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: filter === c ? 'rgba(249,249,247,0.6)' : 'var(--n500)', marginBottom: 3 }}>
              {c.replace('_', ' ')}
            </div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22, fontWeight: 900, color: filter === c ? 'var(--paper)' : 'var(--ink)' }}>
              {stats[c] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0, border: '1px solid var(--ink)', borderBottom: 'none' }}>
        {CATS.map((c, i) => (
          <button key={c} onClick={() => setFilter(c)} style={{
            padding: '7px 14px', fontFamily: 'var(--ff-mono)', fontSize: 10.5,
            textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer',
            background: filter === c ? 'var(--ink)' : 'transparent',
            color: filter === c ? 'var(--paper)' : 'var(--n500)',
            border: 'none',
            borderRight: i < CATS.length - 1 ? '1px solid var(--ink)' : 'none',
            transition: 'all 0.12s',
          }}>
            {c === 'all' ? `All (${emails.length})` : c.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* ── Email list ──────────────────────────────────────────────────── */}
      <div style={{ border: '1px solid var(--ink)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner-ink" style={{ width: 24, height: 24 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty" style={{ margin: 0, border: 'none', padding: 48 }}>
            <div className="empty-title">No Dispatches</div>
            <div className="empty-sub">Sync Gmail to load your inbox</div>
          </div>
        ) : filtered.map((email, i) => (
          <EmailRow
            key={email.id}
            email={email}
            isLast={i === filtered.length - 1}
            expanded={expanded === email.id}
            onToggle={() => setExpanded(expanded === email.id ? null : email.id)}
          />
        ))}
      </div>
    </div>
  );
}

function EmailRow({ email, isLast, expanded, onToggle }) {
  const urgentColor = email.urgencyScore > 70 ? 'var(--red)' : email.urgencyScore > 40 ? 'var(--n700)' : 'var(--muted)';

  return (
    <div style={{
      borderBottom: isLast ? 'none' : '1px solid var(--muted)',
      background: expanded ? 'var(--n100)' : 'var(--paper)',
      transition: 'background 0.12s',
    }}>
      {/* Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, cursor: 'pointer', padding: '12px 16px' }} onClick={onToggle}>
        {/* Urgency bar */}
        <div style={{ width: 3, alignSelf: 'stretch', background: urgentColor, flexShrink: 0, marginRight: 12 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span className={`badge badge-${email.category}`}>{email.category?.replace('_', ' ')}</span>
            {email.urgencyScore > 70 && (
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                ● URGENT
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--ff-mono)', fontSize: 9.5, color: 'var(--n500)' }}>
              {email.receivedAt ? format(new Date(email.receivedAt), 'MMM d · HH:mm') : ''}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10.5, color: 'var(--n500)', marginBottom: 3 }}>
            {email.sender?.split('<')[0].trim()}
          </div>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email.subject}
          </div>
          {!expanded && email.summary && (
            <div style={{ fontFamily: 'var(--ff-body)', fontSize: 12, color: 'var(--n600)', marginTop: 4, lineHeight: 1.55 }}>
              {email.summary}
            </div>
          )}
        </div>

        <div style={{ color: 'var(--n400)', marginLeft: 12, flexShrink: 0, paddingTop: 2 }}>
          {expanded ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: '0 16px 16px 31px', borderTop: '1px solid var(--muted)' }}>
          {email.summary && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--ink)', padding: '10px 14px', marginTop: 12, marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--red)', marginBottom: 6 }}>
                AI Summary
              </div>
              <p style={{ fontFamily: 'var(--ff-body)', fontSize: 13, color: 'var(--ink)', lineHeight: 1.65 }}>
                {email.summary}
              </p>
            </div>
          )}

          {email.extractedTasks?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n500)', marginBottom: 8 }}>
                Extracted Tasks
              </div>
              {email.extractedTasks.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: '1px solid var(--muted)', marginBottom: 4, background: 'var(--paper)' }}>
                  <span className={`badge badge-${t.priority || 'medium'}`}>{t.priority}</span>
                  <span style={{ fontFamily: 'var(--ff-ui)', fontSize: 12.5 }}>{t.title}</span>
                  {t.dueDate && (
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--n500)' }}>
                      Due {format(new Date(t.dueDate), 'MMM d')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {email.snippet && (
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--n600)', background: 'var(--n100)', padding: '10px 12px', border: '1px solid var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {email.snippet}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
