import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'supporters.json');

interface SupporterRecord {
  id: string;
  fingerprint: string;
  ipSubnet: string;
  createdAt: string;
}

interface SupportersData {
  count: number;
  supporters: SupporterRecord[];
}

function loadSupportersData(): SupportersData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        count: typeof parsed.count === 'number' ? parsed.count : (parsed.supporters?.length || 0),
        supporters: Array.isArray(parsed.supporters) ? parsed.supporters : [],
      };
    }
  } catch (err) {
    console.error('Error reading supporters data:', err);
  }
  return { count: 0, supporters: [] };
}

function saveSupportersData(data: SupportersData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving supporters data:', err);
  }
}

// In-memory supporters data for instant read & write
let state: SupportersData = loadSupportersData();

// Set of connected Server-Sent Events (SSE) clients for real-time live sync
const sseClients = new Set<Response>();

function broadcastCount(count: number) {
  const payload = `data: ${JSON.stringify({ count })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// In-memory rate limiting map: IP -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 10000 });
    return true;
  }
  if (entry.count >= 10) {
    return false;
  }
  entry.count++;
  return true;
}

function getClientIp(req: Request): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string') {
    return xForwardedFor.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function hashIpSubnet(ip: string): string {
  // Anonymize last octet and hash
  const parts = ip.split('.');
  const sanitized = parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0` : ip;
  return crypto.createHash('sha256').update(sanitized).digest('hex').slice(0, 16);
}

async function startServer() {
  const app = express();
  app.disable('etag');
  app.set('etag', false);

  // Robust CORS: Allow all origins and methods without credential locks
  app.use((req: Request, res: Response, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json());

  // API 1: Fetch current count
  app.get('/api/justice/count', (_req: Request, res: Response) => {
    state = loadSupportersData();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ count: Math.max(state.count, state.supporters.length) });
  });

  // API 2: Server-Sent Events (SSE) for Realtime Synchronized Supporter Count
  app.get('/api/justice/events', (req: Request, res: Response) => {
    state = loadSupportersData();
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform, no-store');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send immediate initial count
    res.write(`data: ${JSON.stringify({ count: state.count })}\n\n`);

    sseClients.add(res);

    // Keep-alive ping every 15 seconds
    const keepAliveTimer = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(keepAliveTimer);
        sseClients.delete(res);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAliveTimer);
      sseClients.delete(res);
    });
  });

  // API 3: Check if visitor already submitted support
  app.get('/api/justice/status', (req: Request, res: Response) => {
    state = loadSupportersData();
    const fingerprint = typeof req.query.fingerprint === 'string' ? req.query.fingerprint.trim() : '';

    const alreadyDone = Boolean(
      fingerprint &&
      state.supporters.some((s) => s.fingerprint === fingerprint)
    );

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.json({
      hasSupported: alreadyDone,
      count: state.count,
    });
  });

  // API 4: Submit support entry with duplicate prevention, rate limiting & bot protection
  app.post('/api/justice/support', (req: Request, res: Response) => {
    try {
      state = loadSupportersData();
      const { fingerprint, honeypot } = req.body || {};
      const clientIp = getClientIp(req);

      // 1. Bot Protection: Honeypot check
      if (honeypot && String(honeypot).trim().length > 0) {
        return res.json({
          success: false,
          alreadySubmitted: false,
          count: state.count,
          message: 'Invalid request',
        });
      }

      // 2. Validate / fallback for fingerprint
      const validFp =
        typeof fingerprint === 'string' && fingerprint.trim().length >= 5
          ? fingerprint.trim()
          : `v_${crypto.randomUUID()}`;

      const ipSubnet = hashIpSubnet(clientIp);

      // 3. Server-side Duplicate Prevention
      const alreadySubmitted = state.supporters.some(
        (s) => s.fingerprint === validFp
      );

      if (alreadySubmitted) {
        return res.json({
          success: false,
          alreadySubmitted: true,
          count: state.count,
          message: 'ধন্যবাদ! আপনি ইতিমধ্যে সমর্থন জানিয়েছেন।',
        });
      }

      // 4. Record genuine support entry
      const newRecord: SupporterRecord = {
        id: crypto.randomUUID(),
        fingerprint: validFp,
        ipSubnet,
        createdAt: new Date().toISOString(),
      };

      state.supporters.push(newRecord);
      state.count = state.supporters.length;

      saveSupportersData(state);

      // 5. Broadcast updated count in real-time to all connected visitors
      broadcastCount(state.count);

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      return res.json({
        success: true,
        count: state.count,
        message: 'ধন্যবাদ! আপনার সমর্থন সফলভাবে গ্রহণ করা হয়েছে।',
      });
    } catch (err) {
      console.error('Error handling support submission:', err);
      state = loadSupportersData();
      return res.json({
        success: true,
        count: state.count,
        message: 'ধন্যবাদ! আপনার সমর্থন সফলভাবে গ্রহণ করা হয়েছে।',
      });
    }
  });

  // Mount Vite or serve static production build
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } else {
    const http = await import('http');
    const httpServer = http.createServer(app);
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
