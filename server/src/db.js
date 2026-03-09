/**
 * Lightweight JSON-based database using lowdb.
 * Provides SQLite-style helper methods for the FortiExam server.
 */

import { JSONFilePreset } from 'lowdb/node';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../fortiexam.json');

const defaultData = {
  users: [],
  exams: [],
  students: [],
  download_tokens: [],
  audit_logs: [],
};

const low = await JSONFilePreset(DB_PATH, defaultData);

// Ensure admin user exists
if (!low.data.users.find((u) => u.username === 'admin')) {
  low.data.users.push({
    id: uuidv4(),
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    created_at: new Date().toISOString(),
  });
  await low.write();
  console.log('[DB] Seeded default admin user (admin / admin123)');
}

/**
 * Thin wrapper that mimics the query interface used throughout the routes,
 * but operates on the in-memory lowdb collections.
 *
 * Supported:  get(table, field, value)  /  getAll(table, field?, value?)
 *             insert(table, row)  /  update(table, id, patch)
 *             delete(table, field, value)
 */
const db = {
  data: low.data,

  async write() { return low.write(); },

  // ── User helpers ──────────────────────────────────────────────────────────
  getUser(username) {
    return low.data.users.find((u) => u.username === username) ?? null;
  },

  // ── Exam helpers ──────────────────────────────────────────────────────────
  createExam(row) {
    low.data.exams.push({ ...row, created_at: new Date().toISOString() });
    return low.write();
  },

  getExam(id) {
    return low.data.exams.find((e) => e.id === id) ?? null;
  },

  getExamByExamId(exam_id) {
    return low.data.exams.find((e) => e.exam_id === exam_id) ?? null;
  },

  getAllExams() {
    return [...low.data.exams].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  updateExam(id, patch) {
    const exam = low.data.exams.find((e) => e.id === id);
    if (exam) Object.assign(exam, patch);
    return low.write();
  },

  // ── Student helpers ───────────────────────────────────────────────────────
  upsertStudents(examId, students) {
    for (const s of students) {
      const existing = low.data.students.find(
        (r) => r.exam_id === examId && r.student_id === s.student_id
      );
      if (existing) {
        Object.assign(existing, { email: s.email, machine_fingerprint: s.machine_fingerprint ?? null });
      } else {
        low.data.students.push({
          id: uuidv4(),
          exam_id: examId,
          student_id: s.student_id,
          email: s.email,
          machine_fingerprint: s.machine_fingerprint ?? null,
          package_path: null,
        });
      }
    }
    return low.write();
  },

  getStudents(examId, requireFingerprint = false) {
    return low.data.students.filter(
      (s) => s.exam_id === examId && (!requireFingerprint || s.machine_fingerprint)
    );
  },

  getStudent(id) {
    return low.data.students.find((s) => s.id === id) ?? null;
  },

  updateStudent(id, patch) {
    const s = low.data.students.find((s) => s.id === id);
    if (s) Object.assign(s, patch);
    return low.write();
  },

  // ── Download token helpers ────────────────────────────────────────────────
  createToken(token, studentId, examId, expiresAt) {
    // Remove old tokens for same student+exam
    low.data.download_tokens = low.data.download_tokens.filter(
      (t) => !(t.student_id === studentId && t.exam_id === examId)
    );
    low.data.download_tokens.push({
      token,
      student_id: studentId,
      exam_id: examId,
      expires_at: expiresAt,
      used: false,
      created_at: new Date().toISOString(),
    });
    return low.write();
  },

  getToken(token) {
    return low.data.download_tokens.find((t) => t.token === token) ?? null;
  },

  markTokenUsed(token) {
    const t = low.data.download_tokens.find((t) => t.token === token);
    if (t) t.used = true;
    return low.write();
  },

  // ── Audit log helpers ─────────────────────────────────────────────────────
  async log(examId, action, detail = null, actor = null) {
    low.data.audit_logs.push({
      id: Date.now(),
      exam_id: examId,
      action,
      detail,
      actor,
      created_at: new Date().toISOString(),
    });
    return low.write();
  },

  getAuditLogs(examId) {
    return low.data.audit_logs
      .filter((l) => l.exam_id === examId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
};

export default db;
