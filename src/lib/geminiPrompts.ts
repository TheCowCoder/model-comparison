import { leaderboardStatColumns } from './leaderboard';
import { promptTemplates } from './generated/prompts';
import { Benchmark, Model } from '../types';

function fillPromptTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => values[key] ?? '');
}

export function buildLeaderboardPrompt(query: string, models: Model[], benchmarks: Benchmark[]) {
  return fillPromptTemplate(promptTemplates.leaderboardSearch, {
    query,
    availableModels: models.map((model) => `- ${model.id} (${model.name})`).join('\n'),
    availableBenchmarks: benchmarks.map((benchmark) => `- ${benchmark.id} (${benchmark.name})`).join('\n'),
    availableStats: leaderboardStatColumns.map((stat) => `- ${stat.key} (${stat.label})`).join('\n'),
  });
}

export function buildScrapePrompt(modelName: string, benchmarks: Benchmark[]) {
  return fillPromptTemplate(promptTemplates.benchmarkScrape, {
    modelName,
    benchmarkDescriptions: benchmarks.map((benchmark) => `- ${benchmark.name} (${benchmark.subtext1}, ${benchmark.subtext2})`).join('\n'),
    benchmarkIds: benchmarks.map((benchmark) => `- ${benchmark.id}`).join('\n'),
  });
}