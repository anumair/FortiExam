import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p className="section-title">{title}</p>
      {children}
    </div>
  );
}

function Step({ n, label, done, active }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
      borderBottom: '1px solid var(--border)', opacity: done || active ? 1 : .4,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
        background: done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--border)',
        color: done || active ? '#fff' : 'var(--muted)',
      }}>
        {done ? '✓' : n}
      </div>
      <span style={{ fontSize: 14, fontWeight: done || active ? 600 : 400 }}>{label}</span>
    </div>
  );
}

export default function ExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState('');
  const [links, setLinks] = useState(null);
  const [paperFile, setPaperFile] = useState(null);
  const [rosterFile, setRosterFile] = useState(null);

  const load = () => api.getExam(id).then(setExam).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  async function run(action, fn) {
    setBusy(action); setMsg('');
    try {
      const res = await fn();
      setMsg(res.message || 'Done');
      await load();
      if (action === 'distribute') setLinks(res.links);
    } catch (e) { setMsg('Error: ' + e.message); }
    finally { setBusy(null); }
  }

  if (loading) return <div className="page"><p style={{ color: 'var(--muted)' }}>Loading…</p></div>;
  if (!exam) return <div className="page"><p>Exam not found.</p></div>;

  const hasPaper = !!exam.paper_path;
  const hasStudents = exam.students?.some(s => s.machine_fingerprint);
  const isReady = exam.status === 'ready';
  const isDistributed = exam.status === 'distributed';

  const stepState = (need) => ({ done: need, active: !need });

  return (
    <div className="page">
      <button className="btn btn-outline btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 20 }}>← Back</button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{exam.name}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            ID: <code style={{ fontFamily: 'monospace' }}>{exam.exam_id}</code>{' · '}
            Start: {new Date(exam.start_time).toLocaleString()}{' · '}
            {exam.duration_min} min{' · '}
            {exam.n_stages} stages × {exam.stage_interval}s
          </p>
        </div>
        <span className={`badge badge-${exam.status}`} style={{ fontSize: 13, padding: '4px 12px' }}>
          {exam.status.toUpperCase()}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
        {/* Pipeline progress */}
        <div>
          <div className="card">
            <p className="section-title" style={{ marginBottom: 8 }}>Phase 1 Pipeline</p>
            <Step n="1.1" label="Exam Configured" done={true} />
            <Step n="1.1" label="Paper Uploaded" done={hasPaper} active={!hasPaper} />
            <Step n="1.1" label="Roster Uploaded" done={hasStudents} active={hasPaper && !hasStudents} />
            <Step n="1.2–1.5" label="Packages Generated" done={isReady || isDistributed} active={hasStudents && !isReady && !isDistributed} />
            <Step n="1.6" label="Links Distributed" done={isDistributed} active={isReady} />
          </div>

          {exam.merkle_root && (
            <div className="card" style={{ marginTop: 12, fontSize: 12 }}>
              <p style={{ color: 'var(--muted)', marginBottom: 6 }}>MERKLE ROOT</p>
              <code style={{ fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--success)' }}>
                {exam.merkle_root}
              </code>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Step 1.1 — Upload Paper */}
          <Section title="Step 1.1 — Upload Question Paper">
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <input type="file" accept=".pdf,.json,.txt"
                onChange={e => setPaperFile(e.target.files[0])}
                style={{ color: 'var(--text)', fontSize: 13, flex: 1 }} />
              <button className="btn btn-primary btn-sm"
                disabled={!paperFile || busy === 'paper'}
                onClick={() => run('paper', () => api.uploadPaper(id, paperFile))}>
                {busy === 'paper' ? 'Uploading…' : 'Upload Paper'}
              </button>
              {hasPaper && <span className="success-msg">✓ Paper uploaded</span>}
            </div>
          </Section>

          {/* Step 1.1 — Upload Roster */}
          <Section title="Step 1.1 — Upload Student Roster">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                JSON array of {'{'} student_id, email, machine_fingerprint {'}'} objects.
                Device fingerprint = hash(UA + screen_resolution + canvas_render + hardwareConcurrency).
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <input type="file" accept=".json"
                  onChange={e => setRosterFile(e.target.files[0])}
                  style={{ color: 'var(--text)', fontSize: 13, flex: 1 }} />
                <button className="btn btn-primary btn-sm"
                  disabled={!rosterFile || busy === 'roster'}
                  onClick={() => run('roster', () => api.uploadRoster(id, rosterFile))}>
                  {busy === 'roster' ? 'Uploading…' : 'Upload Roster'}
                </button>
              </div>
              {exam.students?.length > 0 && (
                <p style={{ fontSize: 12, color: 'var(--success)' }}>
                  ✓ {exam.students.length} students · {exam.students.filter(s => s.machine_fingerprint).length} with fingerprints
                </p>
              )}
            </div>
          </Section>

          {/* Steps 1.2–1.5 — Generate */}
          <Section title="Steps 1.2–1.5 — Generate Encrypted Packages">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                Runs crypto pipeline: K0 (AES-GCM) → HMAC-SHA256 chain K1–K{exam.n_stages} →
                nested wrappers → Merkle tree → PBKDF2 device binding → ECDSA-SHA256 signing.
              </p>
              <button className="btn btn-primary"
                style={{ alignSelf: 'flex-start' }}
                disabled={!hasPaper || !hasStudents || isReady || isDistributed || busy === 'generate'}
                onClick={() => run('generate', () => api.generatePackages(id))}>
                {busy === 'generate' ? '⏳ Generating…' : isReady || isDistributed ? '✓ Packages Ready' : 'Generate Packages'}
              </button>
            </div>
          </Section>

          {/* Step 1.6 — Distribute */}
          <Section title="Step 1.6 — Distribute Download Links">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                Generates secure one-time download links (24-hour expiry). Stores package hashes and Merkle roots in audit log.
              </p>
              <button className="btn btn-primary"
                style={{ alignSelf: 'flex-start' }}
                disabled={!isReady || busy === 'distribute'}
                onClick={() => run('distribute', () => api.distribute(id))}>
                {busy === 'distribute' ? '⏳ Generating…' : isDistributed ? '✓ Distributed' : 'Generate Download Links'}
              </button>

              {links && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Download links (expires in 24h):</p>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {links.map((l, i) => (
                      <div key={i} style={{ fontFamily: 'monospace', fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                        <strong>{l.student_id}</strong>{' · '}{l.email}{' · '}
                        <a href={l.download_url} target="_blank" rel="noreferrer">{l.download_url}</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {msg && (
            <p className={msg.startsWith('Error') ? 'error-msg' : 'success-msg'} style={{ fontSize: 13 }}>
              {msg}
            </p>
          )}

          {/* Audit Log */}
          {exam.audit_logs?.length > 0 && (
            <Section title="Audit Log">
              <div className="card" style={{ padding: 0, maxHeight: 220, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Time</th><th>Action</th><th>Detail</th><th>Actor</th></tr>
                  </thead>
                  <tbody>
                    {exam.audit_logs.map((l, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleTimeString()}</td>
                        <td><code style={{ fontSize: 11 }}>{l.action}</code></td>
                        <td style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.detail}</td>
                        <td style={{ fontSize: 11 }}>{l.actor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
