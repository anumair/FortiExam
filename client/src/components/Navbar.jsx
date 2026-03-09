import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const username = (() => {
    try { return JSON.parse(atob(localStorage.getItem('token').split('.')[1])).username; }
    catch { return 'Admin'; }
  })();

  return (
    <nav style={{
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span
        onClick={() => navigate('/')}
        style={{ fontWeight: 700, fontSize: 18, cursor: 'pointer', letterSpacing: '-0.5px' }}
      >
        🔐 FortiExam
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>{username}</span>
        <button className="btn btn-outline btn-sm" onClick={() => {
          localStorage.removeItem('token');
          navigate('/login');
        }}>Logout</button>
      </div>
    </nav>
  );
}
