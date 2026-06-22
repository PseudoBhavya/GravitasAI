// ── LoginPage.jsx ─────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { authAPI } from '../../services/api';
import { format } from 'date-fns';

const FEATURES = [
  'Three specialized Gemini-powered AI agents',
  'Gmail classification, summarization & task extraction',
  'Smart calendar analysis with focus block detection',
  'Burnout risk scoring and wellness coaching',
  'Context-aware productivity chatbot',
];

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await authAPI.getGoogleUrl();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErr('Failed to get Google login URL. Check backend is running.');
        setLoading(false);
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Backend not reachable. Is it running on port 5000?');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left panel — editorial */}
      <div className="login-left newsprint-texture">
        <div>
          <div className="login-vol">
            Vol. 1 · {format(new Date(), 'MMMM d, yyyy')} · Morning Edition
          </div>
          <h1 className="login-headline">
            Make your<br />life <em>run</em><br />itself.
          </h1>
          <p className="login-deck">
            A multi-agent AI productivity system that unifies your email,
            tasks, calendar, and wellness into one intelligent command centre.
          </p>
          <div className="login-features">
            {FEATURES.map(f => (
              <div key={f} className="login-feature">
                <div className="login-feature-bullet" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className="login-footer-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span>Gravitas AI · Powered by Gemini · Three specialized agents</span>
          <a 
            href="https://github.com/PseudoBhavya" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: 'var(--red)', 
              textDecoration: 'none', 
              fontWeight: '700',
              fontFamily: 'var(--ff-mono)',
              fontSize: '11px',
              letterSpacing: '0.05em',
              borderBottom: '1px solid var(--red)',
              paddingBottom: '1px',
              transition: 'opacity 0.2s',
              zIndex: 2,
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.8'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            PseudoBhavya
          </a>
        </div>
        <div className="login-big-g">G</div>
      </div>

      {/* Right panel — sign in */}
      <div className="login-right">
        <div className="login-form-header">
          <div className="login-form-kicker">Sign in to continue</div>
          <h2 className="login-form-title">Access Your Edition</h2>
        </div>

        {err && (
          <div style={{
            border: '1px solid var(--red)', padding: '10px 14px',
            marginBottom: 20, background: 'rgba(204,0,0,0.04)',
            fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--red)',
            lineHeight: 1.6,
          }}>
            ⚠ {err}
          </div>
        )}

        <button className="google-btn" onClick={handleLogin} disabled={loading}>
          {loading ? (
            <div className="spinner-ink" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" opacity="0.8">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Redirecting to Google…' : 'Continue with Google'}
        </button>

        <p className="login-disclaimer">
          Grants read-only access to Gmail & Google Calendar.<br />
          Your data is never sold or shared.
        </p>

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--muted)' }}>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, color: 'var(--n500)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 2 }}>
            <div>Backend → http://localhost:5000/health</div>
            <div>Debug config → http://localhost:5000/api/auth/debug</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
