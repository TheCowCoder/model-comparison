import { Benchmark, Model } from '../types';
import { RequestError, parseLeaderboardQueryRequest, scrapeBenchmarksRequest } from './api';

const SCRAPE_RETRY_DELAYS_MS = [8000, 15000, 30000];

function isRateLimitError(error: unknown) {
  if (error instanceof RequestError) return error.status === 429;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('429') || message.includes('rate limit');
}

function delayWithAbort(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      reject(new Error('Aborted'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export const parseLeaderboardQuery = async (query: string, models: Model[], benchmarks: Benchmark[], searchModel: string) => {
  return parseLeaderboardQueryRequest(query, models, benchmarks, searchModel);
};

export const scrapeBenchmarksForModel = async (
  modelName: string,
  benchmarks: Benchmark[],
  signal?: AbortSignal,
  modelId?: string,
  onRetry?: (attempt: number, delayMs: number, error: Error) => void,
) => {
  if (signal?.aborted) {
    throw new Error('Aborted');
  }

  const runRequest = async () => scrapeBenchmarksRequest(modelName, benchmarks, modelId);

  const request = (async () => {
    let attempt = 0;
    for (;;) {
      try {
        return await runRequest();
      } catch (error) {
        if (signal?.aborted) {
          throw new Error('Aborted');
        }
        if (!isRateLimitError(error) || attempt >= SCRAPE_RETRY_DELAYS_MS.length) {
          throw error;
        }

        const retryError = error instanceof Error ? error : new Error('Rate limited');
        const hintedDelayMs = error instanceof RequestError ? error.retryAfterMs : undefined;
        const delayMs = hintedDelayMs && hintedDelayMs > 0
          ? Math.min(Math.max(hintedDelayMs, 1000), 120000)
          : SCRAPE_RETRY_DELAYS_MS[attempt];
        attempt += 1;
        onRetry?.(attempt, delayMs, retryError);
        await delayWithAbort(delayMs, signal);
      }
    }
  })();

  if (!signal) {
    return request;
  }

  return new Promise<Record<string, string>>((resolve, reject) => {
    const onAbort = () => reject(new Error('Aborted'));
    signal.addEventListener('abort', onAbort, { once: true });

    request
      .then((result) => {
        if (!signal.aborted) {
          resolve(result);
        }
      })
      .catch((error) => {
        if (!signal.aborted) {
          reject(error);
        }
      })
      .finally(() => {
        signal.removeEventListener('abort', onAbort);
      });
  });
};
