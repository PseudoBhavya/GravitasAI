import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Mail, CheckSquare, Calendar, Heart, LogOut, Bell } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { format } from 'date-fns';

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard',  end: true },
  { to: '/emails',   icon: Mail,            label: 'Emails',     badge: 'emails' },
  { to: '/tasks',    icon: CheckSquare,     label: 'Tasks' },
  { to: '/calendar', icon: Calendar,        label: 'Calendar' },
  { to: '/wellness', icon: Heart,           label: 'Wellness' },
];

const PAGE_TITLES = {
  '/':         { kicker: 'Command Centre',   title: 'Dashboard' },
  '/emails':   { kicker: 'Communication Agent', title: 'Email Intelligence' },
  '/tasks':    { kicker: 'Productivity Agent',  title: 'Task Manager' },
  '/calendar': { kicker: 'Productivity Agent',  title: 'Calendar' },
  '/wellness': { kicker: 'Wellness Agent',      title: 'Wellness & AI Coach' },
};

export default function Layout() {
  const { user, logout } = useStore();
  const location = useLocation();
  const page = PAGE_TITLES[location.pathname] || { kicker: '', title: 'Gravitas AI' };
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'G';

  return (
    <div className="app-shell">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-g">G</div>
          <div>
            <div className="brand-title">Gravitas AI</div>
            <div className="brand-sub">Morning Edition</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Navigation</div>
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon className="nav-item-icon" strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-row">
            {user?.avatar
              ? <img src={user.avatar} alt="" className="user-avatar" style={{ width: 28, height: 28 }} />
              : <div className="user-avatar">{initials}</div>
            }
            <div style={{ minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div className="user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <button className="logout-btn" onClick={logout} style={{ marginTop: 0 }}>
              <LogOut size={10} strokeWidth={1.5} /> Sign out
            </button>
            <a 
              href="https://github.com/PseudoBhavya" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                fontFamily: 'var(--ff-mono)',
                fontSize: '10px',
                color: 'var(--red)', 
                textDecoration: 'none', 
                fontWeight: '700',
                letterSpacing: '0.05em',
                borderBottom: '1px solid var(--red)',
                paddingBottom: '1px',
                transition: 'opacity 0.2s'
              }}
              onMouseOver={(e) => e.target.style.opacity = '0.8'}
              onMouseOut={(e) => e.target.style.opacity = '1'}
            >
              PseudoBhavya
            </a>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="main-area">
        <header className="topbar">
          <div>
            <div className="topbar-edition">
              {page.kicker} · {format(new Date(), 'EEE, MMM d yyyy')}
            </div>
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--muted)', margin: '0 12px' }} />
          <div className="topbar-title">{page.title}</div>
          <div className="topbar-right">
            <button className="btn btn-outline btn-sm" style={{ padding: '5px 8px', minHeight: 28 }}>
              <Bell size={13} strokeWidth={1.5} />
            </button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
