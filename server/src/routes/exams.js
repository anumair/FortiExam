import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { runPipeline, generateSigningKeyPair } from '../crypto/pipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const PACKAGES_DIR = path.join(__dirname, '../../packages');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(PACKAGES_DIR, { recursive: true });

const router = Router();
router.use(requireAuth);

const paperUpload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ['application/pdf', 'application/json', 'text/plain'].includes(file.mimetype)
      || /\.(pdf|json|txt)$/i.test(file.originalname);
    cb(null, !!ok);
  },
});

const rosterUpload = multer({ dest: UPLOADS_DIR, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/exams  (Step 1.1)
router.post('/', requireRole('admin'), async (req, res) => {
  const { exam_id, name, start_time, duration_min = 120, n_stages = 10, stage_interval = 30, unlock_delay = 300 } = req.body;
  if (!exam_id || !name || !start_time) return res.status(400).json({ error: 'exam_id, name, start_time required' });
  if (db.getExamByExamId(exam_id)) return res.status(409).json({ error: 'exam_id already exists' });

  const id = uuidv4();
  const exam_salt = uuidv4().replace(/-/g, '');
  await db.createExam({ id, exam_id, name, start_time, duration_min: +duration_min, n_stages: +n_stages, stage_interval: +stage_interval, unlock_delay: +unlock_delay, exam_salt, merkle_root: null, paper_path: null, status: 'draft', created_by: req.user.id });
  await db.log(id, 'exam_created', null, req.user.username);
  res.status(201).json({ id, exam_id, name, status: 'draft' });
});

// GET /api/exams
router.get('/', (req, res) => res.json(db.getAllExams()));

// GET /api/exams/:id
router.get('/:id', (req, res) => {
  const exam = db.getExam(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Not found' });
  res.json({ ...exam, students: db.getStudents(req.params.id), audit_logs: db.getAuditLogs(req.params.id).slice(0, 50) });
});

// POST /api/exams/:id/upload-paper  (Step 1.1)
router.post('/:id/upload-paper', requireRole('admin'), paperUpload.single('paper'), async (req, res) => {
  const exam = db.getExam(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  await db.updateExam(req.params.id, { paper_path: req.file.path });
  await db.log(req.params.id, 'paper_uploaded', req.file.originalname, req.user.username);
  res.json({ message: 'Paper uploaded', filename: req.file.originalname, size: req.file.size });
});

// POST /api/exams/:id/upload-roster  (Step 1.1)
router.post('/:id/upload-roster', requireRole('admin'), rosterUpload.single('roster'), async (req, res) => {
  const exam = db.getExam(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  if (!req.file) return res.status(400).json({ error: 'No roster file' });
  let students;
  try {
    students = JSON.parse(fs.readFileSync(req.file.path, 'utf-8'));
    if (!Array.isArray(students)) throw new Error();
  } catch { return res.status(400).json({ error: 'Roster must be JSON array of {student_id, email, machine_fingerprint?}' }); }
  await db.upsertStudents(req.params.id, students);
  await db.log(req.params.id, 'roster_uploaded', `${students.length} students`, req.user.username);
  res.json({ message: 'Roster uploaded', count: students.length });
});

// POST /api/exams/:id/generate  (Steps 1.2–1.5)
router.post('/:id/generate', requireRole('admin'), async (req, res) => {
  const exam = db.getExam(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  if (!exam.paper_path) return res.status(400).json({ error: 'Upload question paper first' });
  const students = db.getStudents(req.params.id, true);
  if (!students.length) return res.status(400).json({ error: 'No students with machine fingerprints. Upload roster with machine_fingerprint fields.' });

  const paperBytes = new Uint8Array(fs.readFileSync(exam.paper_path));
  const signingKeys = await generateSigningKeyPair();
  const examConfig = { exam_id: exam.exam_id, n_stages: exam.n_stages, exam_salt: exam.exam_salt };

  const results = [];
  for (const student of students) {
    const pkg = await runPipeline(paperBytes, examConfig, student.machine_fingerprint, signingKeys);
    const pkgPath = path.join(PACKAGES_DIR, `${exam.exam_id}_${student.student_id}.json`);
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    await db.updateStudent(student.id, { package_path: pkgPath });
    results.push({ student_id: student.student_id, merkle_root: pkg.merkle_root });
  }

  const merkle_root = results[0]?.merkle_root;
  await db.updateExam(req.params.id, { status: 'ready', merkle_root });
  await db.log(req.params.id, 'packages_generated', `${results.length} packages, merkle_root=${merkle_root}`, req.user.username);
  res.json({ message: 'Packages generated', count: results.length, merkle_root, packages: results });
});

export default router;
