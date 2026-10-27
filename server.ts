import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import {
  getUserQuizzes,
  getFullQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  addRound,
  updateRound,
  deleteRound,
  reorderRounds,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  addTeam,
  updateTeam,
  deleteTeam,
  saveRoundScores,
} from './src/db/quiz-store.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parser
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploads statically
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
    }
  },
}));

// Configure multer for MP3 uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp3';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(ext, '');
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 35 * 1024 * 1024 }, // 35MB max for audio
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.includes('audio') ||
      file.originalname.toLowerCase().endsWith('.mp3') ||
      file.originalname.toLowerCase().endsWith('.wav') ||
      file.originalname.toLowerCase().endsWith('.m4a')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Alleen audiobestanden (zoals .mp3) zijn toegestaan'));
    }
  },
});

// API Routes

// 1. Sync User / Auth profile
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || `${uid}@pubquiz.local`;
    const name = (req.user as any).name || null;
    const user = await getOrCreateUser(uid, email, name);
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Error in /api/auth/sync:', error);
    res.status(500).json({ error: error.message || 'Authenticatiefout' });
  }
});

// 2. Audio upload
app.post('/api/upload-audio', requireAuth, upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Geen audiobestand geselecteerd' });
    }
    const audioUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      audioUrl,
      audioFileName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error: any) {
    console.error('Error in /api/upload-audio:', error);
    res.status(500).json({ error: error.message || 'Kon audio niet uploaden' });
  }
});

// 3. Audio delete
app.delete('/api/audio/:filename', requireAuth, (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const targetPath = path.join(uploadsDir, filename);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting audio:', error);
    res.status(500).json({ error: 'Kon audio niet verwijderen' });
  }
});

// 4. Quizzes
app.get('/api/quizzes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const list = await getUserQuizzes(uid);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quizzes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Quiztitel is verplicht' });
    }
    const newQuiz = await createQuiz(uid, title.trim(), description);
    res.json(newQuiz);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/quizzes/:id', async (req, res) => {
  try {
    const quizId = parseInt(req.params.id, 10);
    if (isNaN(quizId)) return res.status(400).json({ error: 'Ongeldig quiz ID' });
    const quiz = await getFullQuiz(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz niet gevonden' });
    res.json(quiz);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/quizzes/:id', requireAuth, async (req, res) => {
  try {
    const quizId = parseInt(req.params.id, 10);
    const updated = await updateQuiz(quizId, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/quizzes/:id', requireAuth, async (req, res) => {
  try {
    const quizId = parseInt(req.params.id, 10);
    const result = await deleteQuiz(quizId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Rounds
app.post('/api/quizzes/:id/rounds', requireAuth, async (req, res) => {
  try {
    const quizId = parseInt(req.params.id, 10);
    const { title, theme } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Rondenaam is verplicht' });
    }
    const round = await addRound(quizId, title.trim(), theme);
    res.json(round);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/rounds/:id', requireAuth, async (req, res) => {
  try {
    const roundId = parseInt(req.params.id, 10);
    const round = await updateRound(roundId, req.body);
    res.json(round);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rounds/:id', requireAuth, async (req, res) => {
  try {
    const roundId = parseInt(req.params.id, 10);
    const result = await deleteRound(roundId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quizzes/:id/rounds/reorder', requireAuth, async (req, res) => {
  try {
    const quizId = parseInt(req.params.id, 10);
    const { roundIds } = req.body;
    if (!Array.isArray(roundIds)) {
      return res.status(400).json({ error: 'roundIds moet een array zijn' });
    }
    const result = await reorderRounds(quizId, roundIds);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Questions
app.post('/api/rounds/:id/questions', requireAuth, async (req, res) => {
  try {
    const roundId = parseInt(req.params.id, 10);
    const { questionText, correctAnswer, points, audioUrl, audioFileName, audioStartTime } = req.body;
    if (!questionText || !questionText.trim()) {
      return res.status(400).json({ error: 'Vraagtekst is verplicht' });
    }
    if (!correctAnswer || !correctAnswer.trim()) {
      return res.status(400).json({ error: 'Juiste antwoord is verplicht' });
    }
    const question = await addQuestion(
      roundId,
      questionText.trim(),
      correctAnswer.trim(),
      Number(points) || 1,
      audioUrl,
      audioFileName,
      Number(audioStartTime) || 0
    );
    res.json(question);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/questions/:id', requireAuth, async (req, res) => {
  try {
    const questionId = parseInt(req.params.id, 10);
    const question = await updateQuestion(questionId, req.body);
    res.json(question);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/questions/:id', requireAuth, async (req, res) => {
  try {
    const questionId = parseInt(req.params.id, 10);
    const result = await deleteQuestion(questionId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rounds/:id/questions/reorder', requireAuth, async (req, res) => {
  try {
    const roundId = parseInt(req.params.id, 10);
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds)) {
      return res.status(400).json({ error: 'questionIds moet een array zijn' });
    }
    const result = await reorderQuestions(roundId, questionIds);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Teams
app.post('/api/quizzes/:id/teams', requireAuth, async (req, res) => {
  try {
    const quizId = parseInt(req.params.id, 10);
    const { name, tableNumber } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Teamnaam is verplicht' });
    }
    const team = await addTeam(quizId, name.trim(), tableNumber);
    res.json(team);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/teams/:id', requireAuth, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    const { name, tableNumber } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Teamnaam is verplicht' });
    }
    const team = await updateTeam(teamId, name.trim(), tableNumber);
    res.json(team);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/teams/:id', requireAuth, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    const result = await deleteTeam(teamId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Scores
app.post('/api/quizzes/:id/rounds/:roundId/scores', requireAuth, async (req, res) => {
  try {
    const quizId = parseInt(req.params.id, 10);
    const roundId = parseInt(req.params.roundId, 10);
    const { teamScores } = req.body;

    if (!Array.isArray(teamScores)) {
      return res.status(400).json({ error: 'Ongeldige scores' });
    }

    // Validate all scores are valid numbers
    for (const item of teamScores) {
      if (typeof item.points !== 'number' || isNaN(item.points) || item.points < 0) {
        return res.status(400).json({
          error: `Ongeldige score voor team ${item.teamId}: moet een positief getal zijn`,
        });
      }
    }

    const result = await saveRoundScores(quizId, roundId, teamScores);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Setup Vite or static serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PubQuiz Master Pro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
