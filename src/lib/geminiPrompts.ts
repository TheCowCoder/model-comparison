import { Benchmark, Model } from '../types';

export function buildLeaderboardPrompt(query: string, models: Model[], benchmarks: Benchmark[]) {
  return `You are an AI assistant that parses search queries for an AI model leaderboard.

The user's query is: "${query}"

Available models:
${models.map((model) => `- ${model.id} (${model.name})`).join('\n')}

Available benchmarks:
${benchmarks.map((benchmark) => `- ${benchmark.id} (${benchmark.name})`).join('\n')}

Extract the requested benchmark ID and a list of requested model IDs. If the user does not specify any models, return an empty array for modelIds. If the user does not specify a benchmark, return null for benchmarkId.
Match the user's intent to the closest available IDs semantically.`;
}

export function buildScrapePrompt(modelName: string, benchmarks: Benchmark[]) {
  return `You are an AI benchmark expert. Provide realistic or known benchmark scores for the AI model "${modelName}".

The benchmarks we need are:
${benchmarks.map((benchmark) => `- ${benchmark.name} (${benchmark.subtext1}, ${benchmark.subtext2})`).join('\n')}

Return the scores as a JSON array of objects. Each object should have a "benchmarkId" and a "score". If a score is unknown, return "—".

Benchmark IDs to use:
${benchmarks.map((benchmark) => `- ${benchmark.id}`).join('\n')}`;
}