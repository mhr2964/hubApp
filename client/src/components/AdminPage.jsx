import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoginForm from './LoginForm';
import './AdminPage.css';

export default function AdminPage() {
  const [authed, setAuthed] = useState(null);

  const checkAuth = () => {
    const controller = new AbortController();

    fetch('/api/auth/me', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('auth check failed');
        return res.json();
      })
      .then(data => setAuthed(data.authed))
      .catch(err => {
        if (err.name !== 'AbortError') setAuthed(false);
      });

    return controller;
  };

  useEffect(() => {
    const controller = checkAuth();
    return () => controller.abort();
  }, []);

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error('logout failed');
        return res.json();
      })
      .then(() => setAuthed(false))
      .catch(() => setAuthed(false));
  };

  if (authed === null) {
    return (
      <div className="admin-page">
        <p className="status">loading...</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <LoginForm onAuthed={() => setAuthed(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <header className="admin-header">
          <h1 className="admin-title">hub admin</h1>
          <button type="button" className="admin-logout" onClick={handleLogout}>
            log out
          </button>
        </header>
        <p className="admin-status">Logged in.</p>
        <div className="admin-placeholder">
          Block management UI coming in the next phase. For now, edit{' '}
          <code>server/data/*.json</code> and run{' '}
          <code>npm run db:migrate</code> to reseed.
        </div>
        <Link to="/" className="admin-back">
          ← back to gallery
        </Link>
      </div>
    </div>
  );
}
