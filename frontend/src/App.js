import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import Layout       from './components/shared/Layout';
import LoginPage    from './components/shared/LoginPage';
import { AuthCallback, AuthError } from './components/shared/AuthCallback';
import Dashboard    from './components/Dashboard/Dashboard';
import EmailPage    from './components/Email/EmailPage';
import TasksPage    from './components/Tasks/TasksPage';
import CalendarPage from './components/Calendar/CalendarPage';
import WellnessPage from './components/Wellness/WellnessPage';

function Guard({ children }) {
  const { token, user, authLoading } = useStore();
  if (authLoading) return (
    <div className="loader-page">
      <div className="loader-headline">Gravitas<span>.</span></div>
      <div className="loader-sub">Loading edition…</div>
    </div>
  );
  if (!token || !user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { loadUser, token } = useStore();
  useEffect(() => { loadUser(); }, [token]);

  return (
    <BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#111111', color: '#F9F9F7',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px', borderRadius: '0',
          border: '1px solid #F9F9F7',
        }
      }} />
      <Routes>
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/error"    element={<AuthError />} />
        <Route path="/" element={<Guard><Layout /></Guard>}>
          <Route index          element={<Dashboard />} />
          <Route path="emails"  element={<EmailPage />} />
          <Route path="tasks"   element={<TasksPage />} />
          <Route path="calendar"element={<CalendarPage />} />
          <Route path="wellness"element={<WellnessPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
