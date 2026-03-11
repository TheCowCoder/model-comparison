import 'dotenv/config';

import { GoogleGenAI, Type } from '@google/genai';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { sanitizeAppState, initialData } from './src/lib/appState';
import { buildLeaderboardPrompt, buildScrapePrompt } from './src/lib/geminiPrompts';

const DATA_FILE = path.join(process.cwd(), 'benchmarks_data.json');
const ADMIN_COOKIE = 'admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PORT = Number(process.env.PORT || 3000);
const sessionSecret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || randomBytes(32).toString('hex');
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signValue(value: string) {
  return createHmac('sha256', sessionSecret).update(value).digest('base64url');
}

function createSessionToken() {
  const payload = JSON.stringify({ role: 'admin', exp: Date.now() + SESSION_TTL_MS });
  const encoded = base64UrlEncode(payload);
  return `${encoded}.${signValue(encoded)}`;
}

function verifySessionToken(token: string | undefined) {
  if (!token) return false;

  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return false;

  const expected = signValue(encoded);
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return false;
    }
  } catch {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function parseCookies(cookieHeader?: string) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (!key) continue;
    cookies[key] = rest.join('=');
  }
  return cookies;
}

function setAdminCookie(res: express.Response, token: string) {
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; SameSite=Lax${secure ? '; Secure' : ''}`);
}

function clearAdminCookie(res: express.Response) {
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure ? '; Secure' : ''}`);
}

function safeCompare(input: string, expected: string) {
  const inputHash = createHmac('sha256', sessionSecret).update(input).digest();
  const expectedHash = createHmac('sha256', sessionSecret).update(expected).digest();
  return timingSafeEqual(inputHash, expectedHash);
}

function getClientKey(req: express.Request) {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0] || req.ip;
  return (forwarded?.split(',')[0] || req.ip || 'unknown').trim();
}

function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  return true;
}

async function readStateFromDisk() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return sanitizeAppState(JSON.parse(data));
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return sanitizeAppState(initialData);
    }
    throw error;
  }
}

async function writeStateToDisk(value: unknown) {
  const sanitized = sanitizeAppState(value);
  await fs.writeFile(DATA_FILE, JSON.stringify(sanitized, null, 2));
  return sanitized;
}

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set on the server');
  }
  return new GoogleGenAI({ apiKey });
}

async function parseLeaderboardQuery(query: string, models: any[], benchmarks: any[]) {
  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: buildLeaderboardPrompt(query, models, benchmarks),
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          benchmarkId: { type: Type.STRING, nullable: true },
          modelIds: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
  });

  try {
    const parsed = JSON.parse(response.text || '{}');
    return {
      benchmarkId: typeof parsed.benchmarkId === 'string' ? parsed.benchmarkId : null,
      modelIds: Array.isArray(parsed.modelIds) ? parsed.modelIds.filter((value: unknown) => typeof value === 'string') : [],
    };
  } catch {
    return { benchmarkId: null, modelIds: [] };
  }
}

async function scrapeBenchmarksForModel(modelName: string, benchmarks: any[]) {
  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: buildScrapePrompt(modelName, benchmarks),
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            benchmarkId: { type: Type.STRING },
            score: { type: Type.STRING },
          },
        },
      },
    },
  });

  try {
    const parsed = JSON.parse(response.text || '[]');
    const result: Record<string, string> = {};
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        if (typeof entry?.benchmarkId === 'string' && typeof entry?.score === 'string') {
          result[entry.benchmarkId] = entry.score;
        }
      }
    }
    return result;
  } catch {
    return {};
  }
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, runtime: 'node', timestamp: new Date().toISOString() });
  });

  app.get('/api/auth/session', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    res.json({ authenticated: verifySessionToken(cookies[ADMIN_COOKIE]) });
  });

  app.post('/api/auth/login', (req, res) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      res.status(500).json({ error: 'ADMIN_PASSWORD is not configured' });
      return;
    }

    const rateKey = `login:${getClientKey(req)}`;
    if (!checkRateLimit(rateKey, 10, 10 * 60 * 1000)) {
      res.status(429).json({ error: 'Too many login attempts. Try again shortly.' });
      return;
    }

    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!safeCompare(password, adminPassword)) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    setAdminCookie(res, createSessionToken());
    res.json({ authenticated: true });
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearAdminCookie(res);
    res.status(204).end();
  });

  app.get('/api/data', async (_req, res) => {
    try {
      res.json(await readStateFromDisk());
    } catch {
      res.status(500).json({ error: 'Failed to read data' });
    }
  });

  app.get('/api/data/export', async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    if (!verifySessionToken(cookies[ADMIN_COOKIE])) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      res.json(await readStateFromDisk());
    } catch {
      res.status(500).json({ error: 'Failed to export data' });
    }
  });

  app.post('/api/data', async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    if (!verifySessionToken(cookies[ADMIN_COOKIE])) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      await writeStateToDisk(req.body);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to save data' });
    }
  });

  app.post('/api/leaderboard-query', async (req, res) => {
    const rateKey = `query:${getClientKey(req)}`;
    if (!checkRateLimit(rateKey, 30, 60 * 1000)) {
      res.status(429).json({ error: 'Search rate limit reached. Please wait a moment.' });
      return;
    }

    const query = typeof req.body?.query === 'string' ? req.body.query.trim().slice(0, 400) : '';
    const models = Array.isArray(req.body?.models) ? req.body.models : [];
    const benchmarks = Array.isArray(req.body?.benchmarks) ? req.body.benchmarks : [];

    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    try {
      res.json(await parseLeaderboardQuery(query, models, benchmarks));
    } catch (error) {
      console.error('Failed to parse leaderboard query', error);
      res.status(500).json({ error: 'Failed to parse leaderboard query' });
    }
  });

  app.post('/api/scrape', async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    if (!verifySessionToken(cookies[ADMIN_COOKIE])) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const rateKey = `scrape:${getClientKey(req)}`;
    if (!checkRateLimit(rateKey, 12, 60 * 1000)) {
      res.status(429).json({ error: 'Scrape rate limit reached. Please slow down.' });
      return;
    }

    const modelName = typeof req.body?.modelName === 'string' ? req.body.modelName.trim().slice(0, 160) : '';
    const benchmarks = Array.isArray(req.body?.benchmarks) ? req.body.benchmarks : [];

    if (!modelName) {
      res.status(400).json({ error: 'Model name is required' });
      return;
    }

    try {
      res.json(await scrapeBenchmarksForModel(modelName, benchmarks));
    } catch (error) {
      console.error('Failed to scrape benchmarks', error);
      res.status(500).json({ error: 'Failed to scrape benchmarks' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
