import express from 'express';
import cors from 'cors';
import db from './db.js'; // initializes DB on import

import authRoutes from './routes/auth.js';
import examRoutes from './routes/exams.js';
import distributeRoutes from './routes/distribute.js';
import downloadRoutes from './routes/download.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/exams', distributeRoutes);
app.use('/api/download', downloadRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[FortiExam] Server running on http://localhost:${PORT}`);
});
