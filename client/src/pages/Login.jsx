import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.login(username, password);
      localStorage.setItem('token', token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div className="card" style={{ width: 380 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>🔐 FortiExam</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
          Authority Dashboard — Paper Setter / Admin Login
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="admin123" required />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Default: admin / admin123
        </p>
      </div>
    </div>
  );
}
