import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function CreateExam() {
  const [form, setForm] = useState({
    exam_id: '',
    name: '',
    start_time: '',
    duration_min: 120,
    n_stages: 10,
    stage_interval: 30,
    unlock_delay: 300,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const exam = await api.createExam(form);
      navigate(`/exams/${exam.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <button className="btn btn-outline btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 20 }}>
        ← Back
      </button>
      <h1 className="page-title">New Exam Configuration</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
        Step 1.1 — Configure the cryptographic envelope for your exam package.
      </p>

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="field">
          <label>Exam ID *</label>
          <input placeholder='e.g. PHYS2026_001' value={form.exam_id} onChange={set('exam_id')} required />
        </div>
        <div className="field">
          <label>Exam Name / Type *</label>
          <input placeholder='e.g. JEE Physics 2026' value={form.name} onChange={set('name')} required />
        </div>
        <div className="field">
          <label>Scheduled Start Time *</label>
          <input type="datetime-local" value={form.start_time} onChange={set('start_time')} required />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
        <p className="section-title">Cryptographic Parameters</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>Duration (minutes)</label>
            <input type="number" min={1} value={form.duration_min} onChange={set('duration_min')} />
          </div>
          <div className="field">
            <label>Number of Stages</label>
            <input type="number" min={1} max={50} value={form.n_stages} onChange={set('n_stages')} />
          </div>
          <div className="field">
            <label>Stage Interval (seconds)</label>
            <input type="number" min={1} value={form.stage_interval} onChange={set('stage_interval')} />
          </div>
          <div className="field">
            <label>Total Unlock Delay (seconds)</label>
            <input type="number" min={1} value={form.unlock_delay} onChange={set('unlock_delay')} />
          </div>
        </div>

        <div style={{ background: 'rgba(79,142,247,.08)', border: '1px solid rgba(79,142,247,.2)', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--accent)' }}>Key Chain:</strong>{' '}
          {form.n_stages} stages × {form.stage_interval}s = {form.n_stages * form.stage_interval}s unlock delay
          ({(form.n_stages * form.stage_interval / 60).toFixed(1)} min) using HMAC-SHA256 forward chain
        </div>

        {error && <p className="error-msg">{error}</p>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating…' : 'Create Exam →'}
          </button>
        </div>
      </form>
    </div>
  );
}
