import { GoogleGenAI, Type } from '@google/genai';
import { buildLeaderboardPrompt, buildScrapePrompt } from './lib/geminiPrompts';
import { initialData, sanitizeAppState } from './lib/appState';

const ADMIN_COOKIE = 'admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface Env {
  DB: any;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  GEMINI_API_KEY?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
}

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}

function parseCookies(cookieHeader?: string | null) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (!key) continue;
    cookies[key] = rest.join('=');
  }
  return cookies;
}

function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  return atob(padded);
}

async function signValue(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  const bytes = new Uint8Array(signature);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function createSessionToken(secret: string) {
  const payload = JSON.stringify({ role: 'admin', exp: Date.now() + SESSION_TTL_MS });
  const encoded = base64UrlEncode(payload);
  return `${encoded}.${await signValue(secret, encoded)}`;
}

async function verifySessionToken(secret: string, token: string | undefined) {
  if (!token) return false;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return false;
  const expected = await signValue(secret, encoded);
  if (expected !== signature) return false;

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

async function safeCompare(secret: string, input: string, expected: string) {
  const [inputHash, expectedHash] = await Promise.all([
    signValue(secret, input),
    signValue(secret, expected),
  ]);
  return inputHash === expectedHash;
}

function getClientKey(request: Request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
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

async function loadState(env: Env) {
  const row = await env.DB.prepare('SELECT value FROM app_state WHERE key = ?').bind('primary').first();
  if (!row?.value) {
    return sanitizeAppState(initialData);
  }

  try {
    return sanitizeAppState(JSON.parse(row.value as string));
  } catch {
    return sanitizeAppState(initialData);
  }
}

async function saveState(env: Env, value: unknown) {
  const sanitized = sanitizeAppState(value);
  await env.DB.prepare(
    'INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
  ).bind('primary', JSON.stringify(sanitized)).run();
  return sanitized;
}

function createGeminiClient(env: Env) {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

async function parseLeaderboardQuery(env: Env, query: string, models: any[], benchmarks: any[]) {
  const ai = createGeminiClient(env);
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

async function scrapeBenchmarksForModel(env: Env, modelName: string, benchmarks: any[]) {
  const ai = createGeminiClient(env);
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

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const sessionSecret = env.SESSION_SECRET || env.ADMIN_PASSWORD || 'development-session-secret';
    const cookies = parseCookies(request.headers.get('cookie'));

    if (url.pathname === '/health') {
      return json({ ok: true, runtime: 'cloudflare-worker', timestamp: new Date().toISOString() });
    }

    if (url.pathname === '/api/auth/session' && request.method === 'GET') {
      return json({ authenticated: await verifySessionToken(sessionSecret, cookies[ADMIN_COOKIE]) });
    }

    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      if (!env.ADMIN_PASSWORD) {
        return json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
      }

      const rateKey = `login:${getClientKey(request)}`;
      if (!checkRateLimit(rateKey, 10, 10 * 60 * 1000)) {
        return json({ error: 'Too many login attempts. Try again shortly.' }, { status: 429 });
      }

      const body: any = await request.json();
      const password = typeof body?.password === 'string' ? body.password : '';
      const authenticated = await safeCompare(sessionSecret, password, env.ADMIN_PASSWORD);
      if (!authenticated) {
        return json({ error: 'Invalid password' }, { status: 401 });
      }

      const token = await createSessionToken(sessionSecret);
      return json(
        { authenticated: true },
        { headers: { 'Set-Cookie': `${ADMIN_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; SameSite=Lax; Secure` } }
      );
    }

    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      return new Response(null, {
        status: 204,
        headers: { 'Set-Cookie': `${ADMIN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure` },
      });
    }

    if (url.pathname === '/api/data' && request.method === 'GET') {
      return json(await loadState(env));
    }

    if (url.pathname === '/api/data/export' && request.method === 'GET') {
      const authenticated = await verifySessionToken(sessionSecret, cookies[ADMIN_COOKIE]);
      if (!authenticated) {
        return json({ error: 'Authentication required' }, { status: 401 });
      }
      return json(await loadState(env));
    }

    if (url.pathname === '/api/data' && request.method === 'POST') {
      const authenticated = await verifySessionToken(sessionSecret, cookies[ADMIN_COOKIE]);
      if (!authenticated) {
        return json({ error: 'Authentication required' }, { status: 401 });
      }

      await saveState(env, await request.json());
      return json({ success: true });
    }

    if (url.pathname === '/api/leaderboard-query' && request.method === 'POST') {
      const rateKey = `query:${getClientKey(request)}`;
      if (!checkRateLimit(rateKey, 30, 60 * 1000)) {
        return json({ error: 'Search rate limit reached. Please wait a moment.' }, { status: 429 });
      }

      const body: any = await request.json();
      const query = typeof body?.query === 'string' ? body.query.trim().slice(0, 400) : '';
      const models = Array.isArray(body?.models) ? body.models : [];
      const benchmarks = Array.isArray(body?.benchmarks) ? body.benchmarks : [];

      if (!query) {
        return json({ error: 'Query is required' }, { status: 400 });
      }

      try {
        return json(await parseLeaderboardQuery(env, query, models, benchmarks));
      } catch {
        return json({ error: 'Failed to parse leaderboard query' }, { status: 500 });
      }
    }

    if (url.pathname === '/api/scrape' && request.method === 'POST') {
      const authenticated = await verifySessionToken(sessionSecret, cookies[ADMIN_COOKIE]);
      if (!authenticated) {
        return json({ error: 'Authentication required' }, { status: 401 });
      }

      const rateKey = `scrape:${getClientKey(request)}`;
      if (!checkRateLimit(rateKey, 12, 60 * 1000)) {
        return json({ error: 'Scrape rate limit reached. Please slow down.' }, { status: 429 });
      }

      const body: any = await request.json();
      const modelName = typeof body?.modelName === 'string' ? body.modelName.trim().slice(0, 160) : '';
      const benchmarks = Array.isArray(body?.benchmarks) ? body.benchmarks : [];

      if (!modelName) {
        return json({ error: 'Model name is required' }, { status: 400 });
      }

      try {
        return json(await scrapeBenchmarksForModel(env, modelName, benchmarks));
      } catch {
        return json({ error: 'Failed to scrape benchmarks' }, { status: 500 });
      }
    }

    return env.ASSETS.fetch(request);
  },
};