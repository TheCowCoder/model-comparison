import { AppState, Benchmark, LeaderboardQueryResult, Model } from '../types';

export class RequestError extends Error {
  status: number;
  retryAfterMs?: number;

  constructor(message: string, status: number, retryAfterMs?: number) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function parseRetryAfterMs(value: string | null) {
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  const timestamp = Date.parse(value);
  if (Number.isFinite(timestamp)) {
    return Math.max(0, timestamp - Date.now());
  }

  return undefined;
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const { signal, ...rest } = init || {};
  const response = await fetch(input, {
    credentials: 'include',
    ...rest,
    ...(signal ? { signal } : {}),
    headers: {
      'Content-Type': 'application/json',
      ...(rest.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    const retryAfterMs = parseRetryAfterMs(response.headers.get('Retry-After'));
    try {
      const data = await response.json();
      if (data?.error) {
        message = data.error;
      }
    } catch {
      // Ignore JSON parse errors and use the generic message.
    }
    throw new RequestError(message, response.status, retryAfterMs);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function fetchAppState(): Promise<AppState | null> {
  return request<AppState | null>('/api/data', { method: 'GET' });
}

export function saveAppState(state: AppState): Promise<{ success: true }> {
  return request<{ success: true }>('/api/data', {
    method: 'POST',
    body: JSON.stringify(state),
  });
}

export function exportAppState(): Promise<AppState | null> {
  return request<AppState | null>('/api/data/export', { method: 'GET' });
}

export function loginAdmin(password: string): Promise<{ authenticated: boolean }> {
  return request<{ authenticated: boolean }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function getAdminSession(): Promise<{ authenticated: boolean }> {
  return request<{ authenticated: boolean }>('/api/auth/session', { method: 'GET' });
}

export function logoutAdmin(): Promise<void> {
  return request<void>('/api/auth/logout', { method: 'POST' });
}

export function parseLeaderboardQueryRequest(query: string, models: Model[], benchmarks: Benchmark[], searchModel: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  const slim = models.map(m => ({ id: m.id, name: m.name, subtitle: m.subtitle }));

  return request<LeaderboardQueryResult>('/api/leaderboard-query', {
    method: 'POST',
    body: JSON.stringify({ query, models: slim, benchmarks, searchModel }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
}

export function scrapeBenchmarksRequest(modelName: string, benchmarks: Benchmark[], modelId?: string) {
  return request<Record<string, string>>('/api/scrape', {
    method: 'POST',
    body: JSON.stringify({ modelName, modelId, benchmarks }),
  });
}