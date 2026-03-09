import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import db from '../db.js';

const router = Router();

// GET /api/download/:token  (Step 1.6 — secure one-time download)
router.get('/:token', async (req, res) => {
  const record = db.getToken(req.params.token);
  if (!record) return res.status(404).json({ error: 'Invalid download link' });
  if (record.used) return res.status(410).json({ error: 'Link already used' });
  if (new Date(record.expires_at) < new Date()) return res.status(410).json({ error: 'Download link expired' });

  const student = db.getStudent(record.student_id);
  if (!student?.package_path || !fs.existsSync(student.package_path)) {
    return res.status(404).json({ error: 'Package file not found' });
  }

  await db.markTokenUsed(req.params.token);
  await db.log(record.exam_id, 'package_downloaded', `student=${student.student_id}, token=${req.params.token}`, student.student_id);

  const filename = path.basename(student.package_path);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.resolve(student.package_path));
});

export default router;
