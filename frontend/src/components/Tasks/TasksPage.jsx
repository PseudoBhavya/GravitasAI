import React, { useState, useEffect } from 'react';
import { taskAPI } from '../../services/api';
import { Plus, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PRIORITIES = ['critical','high','medium','low'];
const STATUSES   = ['todo','in_progress','done'];

export default function TasksPage() {
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [aiLoading, setAI]      = useState(false);
  const [filter, setFilter]     = useState('all');
  const [form, setForm]         = useState({ title: '', description: '', priority: 'medium', dueDate: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await taskAPI.getAll();
      setTasks(data.tasks || []);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await taskAPI.create({ ...form, dueDate: form.dueDate || undefined });
      toast.success('Task created');
      setForm({ title: '', description: '', priority: 'medium', dueDate: '' });
      setShowForm(false);
      load();
    } catch { toast.error('Failed to create task'); }
  }

  async function updateStatus(id, status) {
    try {
      await taskAPI.update(id, { status });
      setTasks(ts => ts.map(t => t.id === id ? { ...t, status } : t));
    } catch { toast.error('Update failed'); }
  }

  async function del(id) {
    try {
      await taskAPI.del(id);
      setTasks(ts => ts.filter(t => t.id !== id));
    } catch {}
  }

  async function aiPrioritize() {
    setAI(true);
    try {
      await taskAPI.prioritize();
      toast.success('Tasks re-prioritized by AI');
      load();
    } catch { toast.error('AI prioritization failed — check Gemini quota'); }
    finally { setAI(false); }
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const byPriority = PRIORITIES.reduce((acc, p) => {
    acc[p] = filtered.filter(t => t.priority === p);
    return acc;
  }, {});

  const counts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  return (
    <div className="fade-up">
      <div className="section-head">
        <div>
          <div className="section-kicker">Productivity Agent</div>
          <h2 className="section-title">Task Manager</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={aiPrioritize} disabled={aiLoading}>
            {aiLoading ? <div className="spinner-ink" style={{ width: 12, height: 12 }} /> : '✦'}
            AI Prioritize
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={13} strokeWidth={2} /> New Task
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ border: '1px solid var(--ink)', padding: 20, marginBottom: 0, background: 'var(--n100)' }} className="fade-up">
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--red)', marginBottom: 14 }}>
            File a New Dispatch
          </div>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n500)', display: 'block', marginBottom: 6 }}>
                  Task Title *
                </label>
                <input className="input" placeholder="What needs to be done?" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n500)', display: 'block', marginBottom: 6 }}>
                  Priority
                </label>
                <select className="input-box" value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n500)', display: 'block', marginBottom: 6 }}>
                  Due Date
                </label>
                <input type="date" className="input-box" value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <textarea className="input-box" placeholder="Description (optional)" rows={2} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm">File Dispatch</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Status filter strip */}
      <div style={{ display: 'flex', border: '1px solid var(--ink)', borderBottom: 'none', borderTop: showForm ? 'none' : '1px solid var(--ink)' }}>
        {['all', ...STATUSES].map((s, i, arr) => (
          <button key={s} onClick={() => setFilter(s)} style={{
            flex: 1, padding: '9px 14px',
            fontFamily: 'var(--ff-mono)', fontSize: 10.5,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            cursor: 'pointer',
            background: filter === s ? 'var(--ink)' : 'var(--paper)',
            color: filter === s ? 'var(--paper)' : 'var(--n500)',
            border: 'none',
            borderRight: i < arr.length - 1 ? '1px solid var(--ink)' : 'none',
            transition: 'all 0.12s',
          }}>
            {s === 'all' ? `All Tasks (${counts.all})` : `${s.replace('_', ' ')} (${counts[s]})`}
          </button>
        ))}
      </div>

      {/* Task list by priority group */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48, border: '1px solid var(--ink)' }}>
          <div className="spinner-ink" style={{ width: 24, height: 24 }} />
        </div>
      ) : (
        <div style={{ border: '1px solid var(--ink)' }}>
          {PRIORITIES.map(priority => {
            const pts = byPriority[priority];
            if (!pts?.length) return null;
            return (
              <div key={priority}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '7px 16px', background: priority === 'critical' ? 'var(--red)' : priority === 'high' ? 'var(--ink)' : 'var(--n100)',
                  borderBottom: '1px solid var(--ink)',
                }}>
                  <span style={{
                    fontFamily: 'var(--ff-mono)', fontSize: 9.5,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    fontWeight: 700,
                    color: (priority === 'critical' || priority === 'high') ? 'var(--paper)' : 'var(--n600)',
                  }}>
                    {priority} priority — {pts.length} task{pts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {pts.map((task, ti) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isLast={ti === pts.length - 1}
                    priority={priority}
                    onStatus={updateStatus}
                    onDelete={del}
                  />
                ))}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="empty" style={{ border: 'none', padding: 48 }}>
              <div className="empty-title">No Dispatches</div>
              <div className="empty-sub">File a new task or extract from emails</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, isLast, priority, onStatus, onDelete }) {
  const done = task.status === 'done';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--muted)',
      opacity: done ? 0.6 : 1,
      transition: 'opacity 0.2s',
      background: 'var(--paper)',
    }}>
      {/* Checkbox */}
      <button
        onClick={() => onStatus(task.id, done ? 'todo' : 'done')}
        style={{
          width: 18, height: 18, flexShrink: 0, marginTop: 3,
          border: `2px solid ${done ? 'var(--ink)' : 'var(--n400)'}`,
          background: done ? 'var(--ink)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.12s',
        }}>
        {done && <Check size={10} strokeWidth={3} color="var(--paper)" />}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--ff-ui)', fontSize: 13.5, fontWeight: 600,
            textDecoration: done ? 'line-through' : 'none',
            color: done ? 'var(--n500)' : 'var(--ink)',
          }}>
            {task.title}
          </span>
          {task.source === 'email' && (
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 8.5, background: 'var(--muted)', padding: '1px 5px', color: 'var(--n600)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              From Email
            </span>
          )}
          {task.aiScore > 70 && (
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 8.5, color: 'var(--red)', fontWeight: 700 }}>
              ⚡ AI {Math.round(task.aiScore)}
            </span>
          )}
        </div>
        {task.description && (
          <p style={{ fontFamily: 'var(--ff-body)', fontSize: 12, color: 'var(--n600)', marginBottom: 6 }}>{task.description}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
          {task.dueDate && (
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--n500)' }}>
              Due {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        {task.status === 'todo' && (
          <button className="btn btn-outline btn-sm" style={{ fontSize: 10 }}
            onClick={() => onStatus(task.id, 'in_progress')}>
            Start
          </button>
        )}
        {task.status === 'in_progress' && (
          <button className="btn btn-primary btn-sm" style={{ fontSize: 10 }}
            onClick={() => onStatus(task.id, 'done')}>
            Done
          </button>
        )}
        <button
          onClick={() => onDelete(task.id)}
          style={{ background: 'none', border: '1px solid var(--muted)', padding: '4px 6px', cursor: 'pointer', color: 'var(--n400)', transition: 'all 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--muted)'; e.currentTarget.style.color = 'var(--n400)'; }}>
          <Trash2 size={12} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
