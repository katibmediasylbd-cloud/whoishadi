import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import {
  loadDatabase,
  saveDatabase,
  hashPassword,
  verifyPassword,
  createSessionToken,
  isValidSession,
  revokeSession,
  AudioQuote,
} from './server/storage.ts';

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup file uploads directory
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e5)}`;
    cb(null, `${cleanBase}-${unique}${ext}`);
  },
});

const uploadImage = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WebP) are allowed'));
    }
  },
});

const uploadAudio = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith('audio/') ||
      file.originalname.match(/\.(mp3|wav|ogg|m4a|aac|weba|flac)$/i)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files (MP3, WAV, OGG, M4A, AAC) are allowed'));
    }
  },
});

// Authentication middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const tokenHeader = req.headers['x-admin-token'] as string;
  const token = authHeader?.replace(/^Bearer\s+/i, '') || tokenHeader;

  if (!token || !isValidSession(token)) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
  }
  next();
}

// --- Public API Routes ---

// Get site configuration and active count
app.get('/api/site-config', (_req, res) => {
  const db = loadDatabase();
  const verifiedClipsCount = db.clips.filter(
    (c) => c.enabled && c.verified && Boolean(c.audioUrl && c.audioUrl.trim())
  ).length;
  const draftClipsCount = db.clips.filter(
    (c) => !c.verified || !c.audioUrl || !c.audioUrl.trim()
  ).length;

  res.json({
    portraitUrl: db.config.portraitUrl,
    placeholderUsed: db.config.placeholderUsed,
    themeSongUrl: db.config.themeSongUrl,
    title: db.config.title,
    subtitle: db.config.subtitle,
    updatedAt: db.config.updatedAt,
    activeClipsCount: verifiedClipsCount,
    draftClipsCount,
    totalClipsCount: db.clips.length,
  });
});

// Get active arranged quotes for public visitors
app.get('/api/clips', (_req, res) => {
  const db = loadDatabase();
  const activeClips = db.clips
    .filter((clip) => clip.enabled !== false)
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      id: c.id,
      quote: c.quote,
      audioUrl: c.audioUrl || '',
      sourceUrl: c.sourceUrl || '',
      date: c.date || '',
      verified: Boolean(c.verified),
      audioType: c.audioType || 'direct',
      embedProvider: c.embedProvider,
    }));
  res.json(activeClips);
});

// --- Admin Authentication Routes ---

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const db = loadDatabase();
  const isValid = verifyPassword(password, db.adminPasswordHash, db.adminSalt);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = createSessionToken();
  res.json({ success: true, token });
});

app.get('/api/admin/check-auth', (req, res) => {
  const authHeader = req.headers.authorization;
  const tokenHeader = req.headers['x-admin-token'] as string;
  const token = authHeader?.replace(/^Bearer\s+/i, '') || tokenHeader;

  if (token && isValidSession(token)) {
    return res.json({ authenticated: true });
  }
  return res.json({ authenticated: false });
});

app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const tokenHeader = req.headers['x-admin-token'] as string;
  const token = authHeader?.replace(/^Bearer\s+/i, '') || tokenHeader;
  if (token) {
    revokeSession(token);
  }
  res.json({ success: true });
});

app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const db = loadDatabase();
  const isValid = verifyPassword(currentPassword, db.adminPasswordHash, db.adminSalt);
  if (!isValid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const newHash = hashPassword(newPassword);
  db.adminPasswordHash = newHash.hash;
  db.adminSalt = newHash.salt;
  saveDatabase(db);

  res.json({ success: true, message: 'Password updated successfully' });
});

// --- Admin Clip Management Routes ---

app.get('/api/admin/clips', requireAdmin, (_req, res) => {
  const db = loadDatabase();
  const sorted = [...db.clips].sort((a, b) => a.order - b.order);
  res.json(sorted);
});

app.post('/api/admin/clips', requireAdmin, (req, res) => {
  const { quote, audioUrl, sourceUrl, date, verified, enabled, audioType, embedProvider, notes } = req.body;

  if (!quote || typeof quote !== 'string' || !quote.trim()) {
    return res.status(400).json({ error: 'Bangla quote text is required' });
  }

  const isVerified = Boolean(verified);
  const cleanAudioUrl = (audioUrl || '').trim();

  // If marked verified, must have matching audio URL
  if (isVerified && !cleanAudioUrl) {
    return res.status(400).json({ error: 'Matching audio URL is required before verifying and publishing a quote' });
  }

  const db = loadDatabase();
  const nextId = db.clips.length > 0 ? Math.max(...db.clips.map((c) => c.id)) + 1 : 1;
  const nextOrder = db.clips.length > 0 ? Math.max(...db.clips.map((c) => c.order)) + 1 : 1;

  const newClip: AudioQuote = {
    id: nextId,
    quote: quote.trim(),
    audioUrl: cleanAudioUrl,
    sourceUrl: (sourceUrl || '').trim(),
    date: (date || '').trim(),
    verified: isVerified,
    enabled: enabled !== false,
    order: nextOrder,
    audioType: audioType || 'direct',
    embedProvider: embedProvider || undefined,
    notes: (notes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  db.clips.push(newClip);
  saveDatabase(db);
  res.status(201).json(newClip);
});

app.put('/api/admin/clips/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = loadDatabase();
  const index = db.clips.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Clip not found' });
  }

  const current = db.clips[index];
  const { quote, audioUrl, sourceUrl, date, verified, enabled, audioType, embedProvider, notes } = req.body;

  const effectiveAudioUrl = audioUrl !== undefined ? String(audioUrl).trim() : current.audioUrl;
  const isNowVerified = verified !== undefined ? Boolean(verified) : current.verified;

  if (isNowVerified && !effectiveAudioUrl) {
    return res.status(400).json({ error: 'Matching audio URL is required before verifying and publishing a quote' });
  }

  if (quote !== undefined) current.quote = String(quote).trim();
  if (audioUrl !== undefined) current.audioUrl = effectiveAudioUrl;
  if (sourceUrl !== undefined) current.sourceUrl = String(sourceUrl).trim();
  if (date !== undefined) current.date = String(date).trim();
  if (verified !== undefined) current.verified = isNowVerified;
  if (enabled !== undefined) current.enabled = Boolean(enabled);
  if (audioType !== undefined) current.audioType = audioType;
  if (embedProvider !== undefined) current.embedProvider = embedProvider;
  if (notes !== undefined) current.notes = String(notes).trim();

  saveDatabase(db);
  res.json(current);
});

app.delete('/api/admin/clips/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = loadDatabase();
  const index = db.clips.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Clip not found' });
  }

  const removed = db.clips[index];
  // If the audio URL is a local upload, clean it up
  if (removed.audioUrl && removed.audioUrl.startsWith('/uploads/')) {
    const localFile = path.resolve(process.cwd(), removed.audioUrl.replace(/^\//, ''));
    if (fs.existsSync(localFile)) {
      try {
        fs.unlinkSync(localFile);
      } catch (err) {
        console.warn('Could not delete audio file:', err);
      }
    }
  }

  db.clips.splice(index, 1);
  saveDatabase(db);
  res.json({ success: true, id });
});

app.post('/api/admin/clips/reorder', requireAdmin, (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds must be an array of numbers' });
  }

  const db = loadDatabase();
  orderedIds.forEach((id: number, index: number) => {
    const clip = db.clips.find((c) => c.id === id);
    if (clip) {
      clip.order = index + 1;
    }
  });

  saveDatabase(db);
  res.json({ success: true, clips: db.clips.sort((a, b) => a.order - b.order) });
});

// --- Admin Upload Routes ---

// Upload authentic portrait
app.post('/api/admin/upload-portrait', requireAdmin, uploadImage.single('portrait'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  const db = loadDatabase();
  // If previously uploaded custom portrait, optionally clean it up
  if (db.config.portraitUrl && db.config.portraitUrl.startsWith('/uploads/')) {
    const oldFile = path.resolve(process.cwd(), db.config.portraitUrl.replace(/^\//, ''));
    if (fs.existsSync(oldFile)) {
      try {
        fs.unlinkSync(oldFile);
      } catch {
        // ignore
      }
    }
  }

  const relativeUrl = `/uploads/${req.file.filename}`;
  db.config.portraitUrl = relativeUrl;
  db.config.placeholderUsed = false;
  db.config.updatedAt = new Date().toISOString();
  saveDatabase(db);

  res.json({
    success: true,
    portraitUrl: relativeUrl,
    placeholderUsed: false,
  });
});

// Reset portrait to placeholder
app.post('/api/admin/reset-portrait', requireAdmin, (_req, res) => {
  const db = loadDatabase();
  if (db.config.portraitUrl && db.config.portraitUrl.startsWith('/uploads/')) {
    const oldFile = path.resolve(process.cwd(), db.config.portraitUrl.replace(/^\//, ''));
    if (fs.existsSync(oldFile)) {
      try {
        fs.unlinkSync(oldFile);
      } catch {
        // ignore
      }
    }
  }

  db.config.portraitUrl = null;
  db.config.placeholderUsed = true;
  db.config.updatedAt = new Date().toISOString();
  saveDatabase(db);

  res.json({
    success: true,
    portraitUrl: null,
    placeholderUsed: true,
  });
});

// Update Theme Song URL
app.post('/api/admin/update-theme-song', requireAdmin, (req, res) => {
  const { themeSongUrl } = req.body;
  const db = loadDatabase();
  db.config.themeSongUrl = themeSongUrl ? String(themeSongUrl).trim() : null;
  db.config.updatedAt = new Date().toISOString();
  saveDatabase(db);
  res.json({ success: true, themeSongUrl: db.config.themeSongUrl });
});

// Upload audio file
app.post('/api/admin/upload-audio', requireAdmin, uploadAudio.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  const relativeUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    audioUrl: relativeUrl,
    filename: req.file.originalname,
    size: req.file.size,
  });
});

// --- Error handler for uploads ---
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message || 'An error occurred' });
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- Vite / Frontend Serving ---
async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (isProd: ${isProd})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
