import { GoogleGenAI, Type } from '@google/genai';
import { buildLeaderboardPrompt } from './lib/geminiPrompts';
import { initialData, sanitizeAppState } from './lib/appState';
import { filterModelsByLeaderboardRegex, inferLeaderboardQueryFallback, sanitizeLeaderboardQueryResult } from './lib/leaderboard';
import { resolveLeaderboardSearchModel } from './lib/searchModels';
import { scrapeBenchmarksHybrid } from './lib/benchmarkScraper';

const ADMIN_COOKIE = 'admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const SCRAPE_RATE_LIMIT_MAX_REQUESTS = 90;
const SCRAPE_RATE_LIMIT_WINDOW_MS = 60 * 1000;

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

function getRetryAfterSeconds(key: string) {
  const current = rateLimitStore.get(key);
  if (!current) return 60;
  return Math.max(1, Math.ceil((current.resetAt - Date.now()) / 1000));
}

async function loadState(env: Env) {
  const row = await env.DB.prepare('SELECT value FROM app_state WHERE key = ?').bind('primary').first();
  if (row?.value) {
    try {
      return sanitizeAppState(JSON.parse(row.value as string));
    } catch {
      return sanitizeAppState(initialData);
    }
  }

  const chunkRows = await env.DB.prepare('SELECT chunk FROM app_state_chunks WHERE state_key = ? ORDER BY part_index ASC').bind('primary').all();
  const chunks = Array.isArray(chunkRows.results) ? chunkRows.results : [];
  if (chunks.length === 0) {
    return sanitizeAppState(initialData);
  }

  try {
    const combined = chunks.map((entry: any) => String(entry.chunk || '')).join('');
    return sanitizeAppState(JSON.parse(combined));
  } catch {
    return sanitizeAppState(initialData);
  }
}

async function saveState(env: Env, value: unknown) {
  const sanitized = sanitizeAppState(value);
  const serialized = JSON.stringify(sanitized);
  const chunkSize = 50000;
  const chunks: string[] = [];

  for (let index = 0; index < serialized.length; index += chunkSize) {
    chunks.push(serialized.slice(index, index + chunkSize));
  }

  const statements = [
    env.DB.prepare('CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS app_state_chunks (state_key TEXT NOT NULL, part_index INTEGER NOT NULL, chunk TEXT NOT NULL, PRIMARY KEY (state_key, part_index))'),
    env.DB.prepare('DELETE FROM app_state WHERE key = ?').bind('primary'),
    env.DB.prepare('DELETE FROM app_state_chunks WHERE state_key = ?').bind('primary'),
  ];

  chunks.forEach((chunk, index) => {
    statements.push(
      env.DB.prepare('INSERT INTO app_state_chunks (state_key, part_index, chunk) VALUES (?, ?, ?)').bind('primary', index, chunk)
    );
  });

  await env.DB.batch(statements);
  return sanitized;
}

function createGeminiClient(env: Env) {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

async function parseLeaderboardQuery(env: Env, query: string, models: any[], benchmarks: any[], searchModel?: string) {
  const ai = createGeminiClient(env);
  const fallback = inferLeaderboardQueryFallback(query, models, benchmarks);
  const resolvedSearchModel = resolveLeaderboardSearchModel(searchModel);

  try {
    const response = await ai.models.generateContent({
      model: resolvedSearchModel,
      contents: buildLeaderboardPrompt(query, models, benchmarks),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            modelRegex: { type: Type.STRING, nullable: true },
            sorts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  kind: { type: Type.STRING },
                  id: { type: Type.STRING },
                  direction: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const sanitized = sanitizeLeaderboardQueryResult(parsed, models, benchmarks);
    const mergedSorts = [...sanitized.sorts];
    for (const sort of fallback.sorts) {
      if (!mergedSorts.some((entry) => entry.kind === sort.kind && entry.id === sort.id)) {
        mergedSorts.push(sort);
      }
    }

    return {
      modelRegex: sanitized.modelRegex && filterModelsByLeaderboardRegex(models, sanitized.modelRegex).length > 0
        ? sanitized.modelRegex
        : fallback.modelRegex,
      sorts: mergedSorts.length > 0 ? mergedSorts : fallback.sorts,
    };
  } catch {
    return fallback;
  }
}

async function scrapeBenchmarksForModel(env: Env, modelName: string, benchmarks: any[], modelId?: string) {
  void env;
  return scrapeBenchmarksHybrid(modelName, benchmarks, modelId);
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
      const searchModel = typeof body?.searchModel === 'string' ? body.searchModel : undefined;

      if (!query) {
        return json({ error: 'Query is required' }, { status: 400 });
      }

      try {
        return json(await parseLeaderboardQuery(env, query, models, benchmarks, searchModel));
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
      if (!checkRateLimit(rateKey, SCRAPE_RATE_LIMIT_MAX_REQUESTS, SCRAPE_RATE_LIMIT_WINDOW_MS)) {
        return json(
          { error: 'Scrape rate limit reached. Please slow down.' },
          { status: 429, headers: { 'Retry-After': String(getRetryAfterSeconds(rateKey)) } },
        );
      }

      const body: any = await request.json();
      const modelName = typeof body?.modelName === 'string' ? body.modelName.trim().slice(0, 160) : '';
      const modelId = typeof body?.modelId === 'string' ? body.modelId.trim().slice(0, 200) : '';
      const benchmarks = Array.isArray(body?.benchmarks) ? body.benchmarks : [];

      if (!modelName) {
        return json({ error: 'Model name is required' }, { status: 400 });
      }

      try {
        return json(await scrapeBenchmarksForModel(env, modelName, benchmarks, modelId || undefined));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to scrape benchmarks';
        return json({ error: message }, { status: 500 });
      }
    }

    return env.ASSETS.fetch(request);
  },
};