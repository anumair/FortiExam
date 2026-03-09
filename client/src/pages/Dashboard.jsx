import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Dashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getExams().then(setExams).finally(() => setLoading(false));
  }, []);

  const statusBadge = (s) => {
    const cls = s === 'draft' ? 'badge-draft' : s === 'ready' ? 'badge-ready' : 'badge-distributed';
    return <span className={`badge ${cls}`}>{s}</span>;
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Exam Packages</h1>
        <button className="btn btn-primary" onClick={() => navigate('/exams/new')}>
          + New Exam
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : exams.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📋</p>
          <p>No exams yet. Create your first exam package.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/exams/new')}>
            Create Exam
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Exam ID</th>
                <th>Name</th>
                <th>Start Time</th>
                <th>Status</th>
                <th>Merkle Root</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.exam_id}</td>
                  <td style={{ fontWeight: 500 }}>{e.name}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(e.start_time).toLocaleString()}</td>
                  <td>{statusBadge(e.status)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>
                    {e.merkle_root ? e.merkle_root.slice(0, 16) + '…' : '—'}
                  </td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/exams/${e.id}`)}>
                      Manage →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
