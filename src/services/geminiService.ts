import { Benchmark, Model } from '../types';
import { parseLeaderboardQueryRequest, scrapeBenchmarksRequest } from './api';

export const parseLeaderboardQuery = async (query: string, models: Model[], benchmarks: Benchmark[]) => {
  return parseLeaderboardQueryRequest(query, models, benchmarks);
};

export const scrapeBenchmarksForModel = async (modelName: string, benchmarks: Benchmark[], signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new Error('Aborted');
  }

  const request = scrapeBenchmarksRequest(modelName, benchmarks);

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
