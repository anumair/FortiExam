import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// POST /api/exams/:id/distribute  (Step 1.6)
router.post('/:id/distribute', requireRole('admin'), async (req, res) => {
  const exam = db.getExam(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  if (exam.status !== 'ready') return res.status(400).json({ error: 'Generate packages first (status must be "ready")' });

  const students = db.getStudents(req.params.id).filter(s => s.package_path);
  if (!students.length) return res.status(400).json({ error: 'No generated packages found' });

  // link_expiry = 24 hours (Step 1.6)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const links = [];

  for (const s of students) {
    const token = uuidv4();
    await db.createToken(token, s.id, req.params.id, expiresAt);
    links.push({ student_id: s.student_id, email: s.email, download_url: `/api/download/${token}`, expires_at: expiresAt });
  }

  await db.log(req.params.id, 'links_generated', `${links.length} links, expiry=${expiresAt}, merkle_root=${exam.merkle_root}`, req.user.username);
  await db.updateExam(req.params.id, { status: 'distributed' });

  res.json({ message: 'Download links generated', expires_at: expiresAt, links });
});

// GET /api/exams/:id/audit
router.get('/:id/audit', (req, res) => {
  res.json(db.getAuditLogs(req.params.id));
});

export default router;
