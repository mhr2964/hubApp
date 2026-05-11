import { useState } from 'react';

export default function LoginForm({ onAuthed }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.status === 429) {
        setError('Too many attempts; try again in a few minutes.');
        return;
      }

      if (!res.ok) {
        setError('Invalid password.');
        return;
      }

      onAuthed();
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h2 className="login-title">hub admin</h2>
      <div className="login-field">
        <input
          className="login-input"
          type="password"
          placeholder="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
          disabled={loading}
        />
      </div>
      {error && <p className="login-error">{error}</p>}
      <button
        className="login-submit"
        type="submit"
        disabled={loading || !password}
      >
        {loading ? 'signing in...' : 'sign in'}
      </button>
    </form>
  );
}
