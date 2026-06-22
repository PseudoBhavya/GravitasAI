import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

export function AuthCallback() {
  const [params] = useSearchParams();
  const { setToken, loadUser } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const err   = params.get('msg');
    if (token) {
      setToken(token);
      loadUser().then(() => {
        toast.success('Welcome to Gravitas AI');
        navigate('/');
      });
    } else {
      navigate(`/auth/error?msg=${encodeURIComponent(err || 'Authentication failed')}`);
    }
  }, []);

  return (
    <div className="loader-page">
      <div className="loader-headline">Gravitas<span style={{color:'var(--red)'}}>.</span></div>
      <div className="loader-sub">Verifying credentials…</div>
    </div>
  );
}

export function AuthError() {
  const [params] = useSearchParams();
  const msg = params.get('msg') || 'Something went wrong during authentication.';

  return (
    <div className="loader-page">
      <div style={{maxWidth:520, border:'2px solid var(--red)', padding:32, background:'var(--paper)'}}>
        <div style={{fontFamily:'var(--ff-mono)',fontSize:9.5,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--red)',marginBottom:12}}>
          Authentication Error
        </div>
        <h2 style={{fontFamily:'var(--ff-display)',fontSize:28,fontWeight:900,marginBottom:16}}>
          Access Blocked
        </h2>
        <p style={{fontFamily:'var(--ff-mono)',fontSize:11.5,color:'var(--n600)',marginBottom:24,lineHeight:1.7}}>
          {decodeURIComponent(msg)}
        </p>

        <div style={{fontFamily:'var(--ff-mono)',fontSize:10.5,color:'var(--n600)',background:'var(--n100)',padding:'12px 14px',marginBottom:20,lineHeight:2}}>
          <strong>Common fixes:</strong><br/>
          1. Check GOOGLE_CLIENT_ID in backend/.env<br/>
          2. Add http://localhost:5000/api/auth/google/callback to Google Console redirect URIs<br/>
          3. Enable Gmail API + Google Calendar API in GCP<br/>
          4. Visit <code>http://localhost:5000/api/auth/debug</code> to verify config
        </div>

        <a href="/login" className="btn btn-primary" style={{display:'inline-flex'}}>
          ← Try Again
        </a>
      </div>
    </div>
  );
}

export default AuthCallback;
