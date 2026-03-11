import { AppState, Benchmark, Model } from '../types';

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data?.error) {
        message = data.error;
      }
    } catch {
      // Ignore JSON parse errors and use the generic message.
    }
    throw new Error(message);
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

export function parseLeaderboardQueryRequest(query: string, models: Model[], benchmarks: Benchmark[]) {
  return request<{ benchmarkId: string | null; modelIds: string[] }>('/api/leaderboard-query', {
    method: 'POST',
    body: JSON.stringify({ query, models, benchmarks }),
  });
}

export function scrapeBenchmarksRequest(modelName: string, benchmarks: Benchmark[]) {
  return request<Record<string, string>>('/api/scrape', {
    method: 'POST',
    body: JSON.stringify({ modelName, benchmarks }),
  });
}