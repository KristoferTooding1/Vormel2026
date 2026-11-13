import { useState, useEffect, useRef } from 'react';
import { authRequest } from './api';

function AuthBar() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState(null); // null (closed) | 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    authRequest('/me')
      .then(data => setUser(data.user))
      .catch(error => console.error('Failed to check login status:', error));
  }, []);

  // showModal() centers the dialog, dims the page, traps focus and closes on Escape.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, [mode, user]);

  function openForm(nextMode) {
    setMode(nextMode);
    setError('');
    setPassword('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const data = await authRequest(`/${mode}`, { username, password });
      setUser(data.user);
      setMode(null);
      setUsername('');
      setPassword('');
    } catch (error) {
      setError(error instanceof TypeError ? 'Could not reach the server. Please try again.' : error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await authRequest('/logout');
      setUser(null);
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  }

  const isRegister = mode === 'register';

  return (
    <header className="auth-bar">
      <div className="auth-bar-row">
        <span className="brand">Vormel2026</span>
        {user ? (
          <div className="auth-actions">
            <span className="auth-user">{user.username}</span>
            <button className="toggle-btn" onClick={handleLogout}>Log out</button>
          </div>
        ) : (
          <div className="auth-actions">
            <button
              className="toggle-btn"
              onClick={() => openForm('login')}
            >
              Log in
            </button>
            <button
              className="toggle-btn"
              onClick={() => openForm('register')}
            >
              Register
            </button>
          </div>
        )}
      </div>

      {mode && !user && (
        <dialog
          ref={dialogRef}
          className="auth-dialog"
          aria-labelledby="auth-dialog-title"
          onClose={() => setMode(null)}
          onClick={event => {
            // A click that lands on the dialog element itself is on the backdrop.
            if (event.target === dialogRef.current) setMode(null);
          }}
        >
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-header">
            <h2 id="auth-dialog-title">{isRegister ? 'Create account' : 'Log in'}</h2>
            <button type="button" className="auth-close" aria-label="Close" onClick={() => setMode(null)}>×</button>
          </div>

          <label className="auth-field">
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={event => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 8 : undefined}
              required
            />
          </label>

          {isRegister && (
            <p className="auth-hint">Username: 3–20 letters, numbers or underscores. Password: at least 8 characters.</p>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="toggle-btn active auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
          </button>

          <p className="auth-switch">
            {isRegister ? 'Already have an account?' : 'No account yet?'}{' '}
            <button type="button" className="auth-link" onClick={() => openForm(isRegister ? 'login' : 'register')}>
              {isRegister ? 'Log in' : 'Register'}
            </button>
          </p>
        </form>
        </dialog>
      )}
    </header>
  );
}

export default AuthBar;
