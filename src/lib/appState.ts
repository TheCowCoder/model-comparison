import { AppState, Benchmark, Model } from '../types';
import { defaultModelsList } from '../data/defaultModels';

export const defaultBenchmarks: Benchmark[] = [
  { id: 'hle', name: "Humanity's Last Exam", subtext1: 'Academic reasoning\n(full set, text + MM)', subtext2: 'No tools\nSearch (blocklist)\n+ Code' },
  { id: 'arc', name: 'ARC-AGI-2', subtext1: 'Abstract reasoning puzzles', subtext2: 'ARC Prize Verified' },
  { id: 'gpqa', name: 'GPQA Diamond', subtext1: 'Scientific knowledge', subtext2: 'No tools' },
  { id: 'terminal', name: 'Terminal-Bench 2.0', subtext1: 'Agentic terminal coding', subtext2: 'Terminus-2 harness\nOther best self-reported harness' },
  { id: 'swe-verified', name: 'SWE-Bench Verified', subtext1: 'Agentic coding', subtext2: 'Single attempt' },
  { id: 'swe-pro', name: 'SWE-Bench Pro (Public)', subtext1: 'Diverse agentic coding tasks', subtext2: 'Single attempt' },
  { id: 'livecode', name: 'LiveCodeBench Pro', subtext1: 'Competitive coding problems\nfrom Codeforces, ICPC, and IOI', subtext2: 'Elo' },
  { id: 'scicode', name: 'SciCode', subtext1: 'Scientific research coding', subtext2: '' },
  { id: 'apex', name: 'APEX-Agents', subtext1: 'Long horizon professional tasks', subtext2: '' },
  { id: 'gdpval', name: 'GDPval-AA Elo', subtext1: 'Expert tasks', subtext2: '' },
  { id: 't2', name: 'τ2-bench', subtext1: 'Agentic tool use', subtext2: 'Retail\nTelecom' },
  { id: 'mcp', name: 'MCP Atlas', subtext1: 'Multi-step workflows using MCP', subtext2: '' },
  { id: 'browsecomp', name: 'BrowseComp', subtext1: 'Agentic search', subtext2: 'Search + Python\n+ Browse' },
  { id: 'mmmu', name: 'MMMU Pro', subtext1: 'Multimodal understanding\nand reasoning', subtext2: 'No tools' },
  { id: 'mmmlu', name: 'MMMLU', subtext1: 'Multilingual Q&A', subtext2: '' },
  { id: 'mrcr', name: 'MRCR v2 (8-needle)', subtext1: 'Long context performance', subtext2: '128k (average)\n1M (pointwise)' },
];

export const initialData: AppState = {
  benchmarks: defaultBenchmarks,
  models: defaultModelsList,
};

export function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function parseScoreValue(scoreStr: string | undefined): number | null {
  if (!scoreStr || scoreStr === '—') return null;
  const match = scoreStr.replace(/,/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

export function calculateComprehensiveScore(intelligence: number, speed: number, contextLength: number): number {
  const contextScore = clamp((Math.log2(Math.max(1, contextLength)) / Math.log2(2000000)) * 100, 0, 100);
  return clamp((intelligence * 0.5) + (speed * 0.3) + (contextScore * 0.2), 0, 100);
}

function computeDynamicStat(
  model: Model,
  configs: Array<{ id: string; weight: number; isElo?: boolean; maxScale?: number }>,
  hardcodedFallback: number
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const { id, weight, isElo, maxScale } of configs) {
    const value = parseScoreValue(model.scores[id]);
    if (value !== null) {
      let normalized = value;
      if (isElo && maxScale) {
        normalized = (value / maxScale) * 100;
      } else if (maxScale) {
        normalized = (value / maxScale) * 100;
      }
      
      weightedSum += clamp(normalized, 0, 100) * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight > 0) {
    // Base benchmark average
    const avg = weightedSum / totalWeight;
    // Ensure scores are spread beautifully across 50-95 based on realistic distributions
    return clamp((avg * 0.8) + 35, 0, 100);
  }
  return clamp(hardcodedFallback, 0, 100);
}

export function calculateHumanUnderstanding(model: Model, intelligence: number): number {
  const benchmarkWeights = [
    { id: 'hle', weight: 1.5 },
    { id: 'gpqa', weight: 1.2 },
    { id: 'mmmu', weight: 1.3 },
    { id: 'mmmlu', weight: 1.0 },
    { id: 'mrcr', weight: 0.8 },
    { id: 'browsecomp', weight: 1.2 },
  ];

  let totalWeight = 0;
  let weightedSum = 0;

  for (const { id, weight } of benchmarkWeights) {
    const value = parseScoreValue(model.scores[id]);
    if (value !== null) {
      weightedSum += value * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight > 0) {
    const benchmarkComponent = weightedSum / totalWeight;
    // Mix benchmark average with the intelligence calculation to get a tuned rating
    return clamp(benchmarkComponent * 0.5 + intelligence * 0.45 + 5, 0, 100);
  }

  return clamp(intelligence * 0.85, 0, 100);
}

export function calculateIntelligence(model: Model): number {
  return computeDynamicStat(model, [
    { id: 'arc', weight: 1.5 },
    { id: 'gpqa', weight: 1.2 },
    { id: 'hle', weight: 1.5 },
    { id: 'mmmu', weight: 1.0 },
    { id: 'mmmlu', weight: 0.8 }
  ], model.stats?.intelligence ?? 50);
}

export function calculateFrontend(model: Model): number {
  return computeDynamicStat(model, [
    { id: 'browsecomp', weight: 1.5 },
    { id: 'swe-verified', weight: 1.2 },
    { id: 'swe-pro', weight: 1.0 },
    { id: 'mcp', weight: 1.0 }
  ], model.stats?.frontend ?? 45);
}

export function calculateBackend(model: Model): number {
  return computeDynamicStat(model, [
    { id: 'terminal', weight: 1.5 },
    { id: 'scicode', weight: 1.2 },
    { id: 'apex', weight: 1.0 },
    { id: 't2', weight: 1.0 },
    { id: 'livecode', weight: 1.2, isElo: true, maxScale: 3500 },
    { id: 'gdpval', weight: 1.0, isElo: true, maxScale: 2000 }
  ], model.stats?.backend ?? 47.5);
}

export function calculateSpeed(model: Model, intelligence: number): number {
  // Try to use a speed-related stat if any, otherwise fallback to inverse of intelligence with modifiers
  // MRCR (Long context) can be a proxy for how fast they process large contexts, or we just rely on name
  let speed = 100 - (intelligence * 0.5);
  const idLower = model.name.toLowerCase();
  
  if (idLower.includes('groq') || idLower.includes('fast') || idLower.includes('edge') || 
      idLower.includes('lite') || idLower.includes('mini') || idLower.includes('flash') || 
      idLower.includes('8b') || idLower.includes('haiku')) {
    speed += 30;
  }
  
  const value = parseScoreValue(model.scores['mrcr']);
  if (value !== null) {
    // Let mrcr score slightly boost speed assumption if very high
    speed += (value / 100) * 10;
  }
  
  return clamp(speed, 10, 100);
}

export function normalizeModelStats(model: Model): Model {
  // If baseline stats exist we use them for missing values, else 50, but primary source is dynamic calculation.
  const intelligence = clamp(calculateIntelligence(model), 0, 100);
  const speed = clamp(calculateSpeed(model, intelligence), 0, 100);
  const frontend = clamp(calculateFrontend(model), 0, 100);
  const backend = clamp(calculateBackend(model), 0, 100);
  
  const contextLength = Math.max(1, Math.round(toFiniteNumber(model.stats?.contextLength, 128000)));
  const pricePer1M = Math.max(0, toFiniteNumber(model.stats?.pricePer1M, 0));

  const withBaseStats: Model = {
    ...model,
    stats: {
      ...model.stats,
      intelligence,
      speed,
      frontend,
      backend,
      contextLength,
      pricePer1M,
      comprehensiveScore: 0,
      humanUnderstanding: 0,
    },
  };

  const humanUnderstanding = clamp(calculateHumanUnderstanding(withBaseStats, intelligence), 0, 100);
  const comprehensiveScore = calculateComprehensiveScore(intelligence, speed, contextLength);

  return {
    ...withBaseStats,
    stats: {
      ...withBaseStats.stats!,
      humanUnderstanding,
      comprehensiveScore,
    },
  };
}

export function injectDerivedStats(models: Model[]): Model[] {
  return models.map((model) => normalizeModelStats(model));
}

function sanitizeText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.slice(0, maxLength) || fallback;
}

function sanitizeOptionalText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || undefined;
}

function sanitizeScores(scores: unknown): Record<string, string> {
  if (!scores || typeof scores !== 'object') return {};

  const result: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(scores)) {
    if (typeof key !== 'string' || !key.trim()) continue;
    if (typeof rawValue !== 'string') continue;
    const value = rawValue.trim().slice(0, 64);
    result[key.trim()] = value || '—';
  }
  return result;
}

export function sanitizeBenchmark(value: unknown): Benchmark | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Benchmark>;
  const id = sanitizeText(candidate.id, '', 64);
  if (!id) return null;

  return {
    id,
    name: sanitizeText(candidate.name, id, 120),
    subtext1: sanitizeText(candidate.subtext1, '', 240),
    subtext2: sanitizeText(candidate.subtext2, '', 240),
  };
}

export function sanitizeModel(value: unknown): Model | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Model>;
  const id = sanitizeText(candidate.id, '', 120);
  const name = sanitizeText(candidate.name, '', 160);
  if (!id || !name) return null;

  const model: Model = {
    id,
    name,
    subtitle: sanitizeOptionalText(candidate.subtitle, 160),
    color: sanitizeOptionalText(candidate.color, 32),
    scores: sanitizeScores(candidate.scores),
    stats: candidate.stats,
  };

  return normalizeModelStats(model);
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const item of items) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }

  return deduped;
}

export function sanitizeAppState(value: unknown): AppState {
  const candidate = (value && typeof value === 'object' ? value : {}) as Partial<AppState>;

  const incomingBenchmarks = Array.isArray(candidate.benchmarks)
    ? candidate.benchmarks.map(sanitizeBenchmark).filter((entry): entry is Benchmark => entry !== null)
    : [];

  const incomingModels = Array.isArray(candidate.models)
    ? candidate.models.map(sanitizeModel).filter((entry): entry is Model => entry !== null)
    : [];

  const benchmarkMap = new Map<string, Benchmark>();
  for (const benchmark of [...incomingBenchmarks, ...defaultBenchmarks]) {
    if (!benchmarkMap.has(benchmark.id)) {
      benchmarkMap.set(benchmark.id, benchmark);
    }
  }

  const mergedModels = dedupeById(incomingModels);
  if (mergedModels.length === 0) {
    return {
      benchmarks: Array.from(benchmarkMap.values()),
      models: injectDerivedStats(initialData.models),
    };
  }

  return {
    benchmarks: Array.from(benchmarkMap.values()),
    models: injectDerivedStats(mergedModels),
  };
}