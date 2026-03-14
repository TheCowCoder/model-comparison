import {
  Benchmark,
  LeaderboardQueryResult,
  LeaderboardSortDirection,
  LeaderboardSortTarget,
  LeaderboardStatKey,
  Model,
} from '../types';
import { getCopilotDescriptionForModel } from '../data/copilotModelDescriptions';

export const leaderboardStatColumns: Array<{ key: LeaderboardStatKey; label: string; aliases: string[] }> = [
  { key: 'humanUnderstanding', label: 'Human Understanding', aliases: ['human understanding', 'understanding', 'human intelligence', 'human intellect', 'human intellegnece', 'human intelligencee'] },
  { key: 'comprehensiveScore', label: 'Comprehensive Score', aliases: ['comprehensive score', 'overall score', 'overall'] },
  { key: 'intelligence', label: 'Intelligence (Est.)', aliases: ['intelligence', 'smartest', 'reasoning'] },
  { key: 'speed', label: 'Speed (Est.)', aliases: ['speed', 'fast', 'faster', 'fastest', 'latency', 'low latency', 'quick', 'quicker', 'quickest', 'responsive', 'snappy', 'blazing fast', 'blazingly fast'] },
  { key: 'frontend', label: 'Frontend UI (Est.)', aliases: ['frontend', 'front-end', 'ui', 'frontend ui'] },
  { key: 'backend', label: 'Backend Robustness (Est.)', aliases: ['backend', 'back-end', 'coding', 'robustness'] },
];

export const DEFAULT_RANKING_SORTS: LeaderboardSortTarget[] = [
  { kind: 'stat', id: 'comprehensiveScore', direction: 'desc' },
  { kind: 'stat', id: 'intelligence', direction: 'desc' },
];

const RANKING_INTENT_PATTERN = /\b(best|better|top|rank|ranking|compare|comparison|recommend|recommended|quality|strongest|smartest|highest|lowest|fast|faster|fastest|speed|latency|slow|slowest|cheapest|price|cost)\b/;
const SPEED_INTENT_PATTERN = /\b(speed|fast|faster|fastest|quick|quicker|quickest|latency|responsive|snappy|blazing|blazingly|instant)\b/;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeModelRegexSource(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 180) {
    return null;
  }

  const source = trimmed.startsWith('/') && trimmed.endsWith('/') ? trimmed.slice(1, -1) : trimmed;
  if (!source || /\n|\r/.test(source) || /\\[1-9]/.test(source) || /\(\?</.test(source)) {
    return null;
  }

  try {
    void new RegExp(source, 'i');
    return source;
  } catch {
    return null;
  }
}

function buildCompactModelRegex(terms: Array<string | null | undefined>) {
  const normalizedTerms = Array.from(new Set(
    terms
      .map((term) => (typeof term === 'string' ? normalizeText(term) : ''))
      .filter((term) => term.length >= 2)
  ));

  if (normalizedTerms.length === 0) {
    return null;
  }

  if (normalizedTerms.length === 1) {
    return `\\b${escapeRegExp(normalizedTerms[0])}\\b`;
  }

  return `\\b(?:${normalizedTerms.map((term) => escapeRegExp(term)).join('|')})\\b`;
}

export function getLeaderboardModelSearchText(model: Pick<Model, 'id' | 'name' | 'subtitle'>) {
  const copilotDescription = getCopilotDescriptionForModel({ id: model.id, name: model.name }) || '';
  return normalizeText(`${model.id} ${model.name} ${model.subtitle || ''} ${copilotDescription}`);
}

export function filterModelsByLeaderboardRegex<T extends Pick<Model, 'id' | 'name' | 'subtitle'>>(models: T[], modelRegex: string | null | undefined) {
  const source = sanitizeModelRegexSource(modelRegex);
  if (!source) {
    return models;
  }

  const expression = new RegExp(source, 'i');
  return models.filter((model) => expression.test(getLeaderboardModelSearchText(model)));
}

function pushUniqueSort(target: LeaderboardSortTarget[], sort: LeaderboardSortTarget) {
  if (!target.some((entry) => entry.kind === sort.kind && entry.id === sort.id)) {
    target.push(sort);
  }
}

function findDirection(query: string, matchIndex: number, matchLength: number): LeaderboardSortDirection {
  const windowStart = Math.max(0, matchIndex - 18);
  const windowEnd = Math.min(query.length, matchIndex + matchLength + 18);
  const windowText = query.slice(windowStart, windowEnd);

  if (/\b(low|lowest|least|bottom|worst|ascending|asc|smallest)\b/.test(windowText)) {
    return 'asc';
  }

  return 'desc';
}

function findSpeedDirection(query: string, matchIndex: number, matchLength: number): LeaderboardSortDirection {
  const windowStart = Math.max(0, matchIndex - 24);
  const windowEnd = Math.min(query.length, matchIndex + matchLength + 24);
  const windowText = query.slice(windowStart, windowEnd);

  if (/\b(slow|slower|slowest|sluggish|high latency|highest latency|worse latency|worst latency)\b/.test(windowText)) {
    return 'asc';
  }

  return 'desc';
}

function findAliasPosition(query: string, aliases: string[]) {
  let bestIndex = Number.POSITIVE_INFINITY;
  let bestLength = 0;

  for (const alias of aliases) {
    const normalizedAlias = normalizeText(alias);
    if (!normalizedAlias) continue;
    const index = query.indexOf(normalizedAlias);
    if (index !== -1 && index < bestIndex) {
      bestIndex = index;
      bestLength = normalizedAlias.length;
    }
  }

  if (!Number.isFinite(bestIndex)) {
    return null;
  }

  return { index: bestIndex, length: bestLength };
}

function getBenchmarkAliases(benchmark: Benchmark) {
  return [benchmark.id, benchmark.name, benchmark.subtext1, benchmark.subtext2].filter(Boolean);
}

export function sanitizeLeaderboardQueryResult(raw: unknown, models: Model[], benchmarks: Benchmark[]): LeaderboardQueryResult {
  const validBenchmarkIds = new Set(benchmarks.map((benchmark) => benchmark.id));
  const validStatIds = new Set(leaderboardStatColumns.map((stat) => stat.key));

  const parsed = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  const modelRegex = sanitizeModelRegexSource(parsed.modelRegex);
  const sorts: LeaderboardSortTarget[] = [];
  const rawSorts = Array.isArray(parsed.sorts) ? parsed.sorts : [];

  for (const rawSort of rawSorts) {
    if (typeof rawSort !== 'object' || rawSort === null) continue;
    const sort = rawSort as Record<string, unknown>;
    const kind = sort.kind === 'stat' || sort.kind === 'benchmark' ? sort.kind : null;
    const id = typeof sort.id === 'string' ? sort.id : null;
    if (!kind || !id) continue;
    if (kind === 'stat' && !validStatIds.has(id as LeaderboardStatKey)) continue;
    if (kind === 'benchmark' && !validBenchmarkIds.has(id)) continue;

    pushUniqueSort(sorts, {
      kind,
      id,
      direction: sort.direction === 'asc' ? 'asc' : 'desc',
    });
  }

  const hasMatches = modelRegex ? filterModelsByLeaderboardRegex(models, modelRegex).length > 0 : false;

  return { modelRegex: hasMatches ? modelRegex : null, sorts };
}

export function queryImpliesRanking(query: string) {
  return RANKING_INTENT_PATTERN.test(normalizeText(query));
}

const MODEL_FAMILY_KEYWORDS = [
  'gemini', 'gpt', 'claude', 'llama', 'qwen', 'mistral', 'deepseek',
  'grok', 'phi', 'nova', 'command', 'o1', 'o3', 'o4', 'sonnet', 'opus', 'haiku',
];

const TOPIC_SORT_HINTS: Array<{ keywords: string[]; sorts: LeaderboardSortTarget[] }> = [
  {
    keywords: ['day trading', 'trading', 'day trader', 'finance', 'financial', 'market', 'markets', 'stocks', 'equities', 'options', 'forex'],
    sorts: [
      { kind: 'benchmark', id: 'browsecomp', direction: 'desc' },
      { kind: 'stat', id: 'humanUnderstanding', direction: 'desc' },
      { kind: 'benchmark', id: 'hle', direction: 'desc' },
    ],
  },
];

function detectFamilyFilter(query: string): string | null {
  if (!/\b(only|models|family|just|exclusive)\b/.test(query)) return null;
  for (const family of MODEL_FAMILY_KEYWORDS) {
    if (query.includes(family)) return family;
  }
  return null;
}

function applyTopicHints(query: string, target: LeaderboardSortTarget[]) {
  for (const hint of TOPIC_SORT_HINTS) {
    if (hint.keywords.some((keyword) => query.includes(keyword))) {
      for (const sort of hint.sorts) {
        pushUniqueSort(target, sort);
      }
    }
  }
}

export function inferLeaderboardQueryFallback(query: string, models: Model[], benchmarks: Benchmark[]): LeaderboardQueryResult {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return { modelRegex: null, sorts: [] };
  }

  const familyFilter = detectFamilyFilter(normalizedQuery);

  let modelRegex: string | null;
  if (familyFilter) {
    modelRegex = buildCompactModelRegex([familyFilter]);
  } else {
    const matchedTerms = models
      .filter((model) => {
        const aliases = [model.id, model.name, model.subtitle].filter((value): value is string => Boolean(value));
        return aliases.some((alias) => {
          const normalizedAlias = normalizeText(alias);
          return normalizedAlias.length >= 3 && normalizedQuery.includes(normalizedAlias);
        });
      })
      .flatMap((model) => [model.id, model.name]);

    modelRegex = buildCompactModelRegex(matchedTerms);
  }

  const matches: Array<{ position: number; sort: LeaderboardSortTarget }> = [];

  for (const stat of leaderboardStatColumns) {
    const match = findAliasPosition(normalizedQuery, [stat.label, stat.key, ...stat.aliases]);
    if (!match) continue;
    matches.push({
      position: match.index,
      sort: {
        kind: 'stat',
        id: stat.key,
        direction: stat.key === 'speed'
          ? findSpeedDirection(normalizedQuery, match.index, match.length)
          : findDirection(normalizedQuery, match.index, match.length),
      },
    });
  }

  for (const benchmark of benchmarks) {
    const match = findAliasPosition(normalizedQuery, getBenchmarkAliases(benchmark));
    if (!match) continue;
    matches.push({
      position: match.index,
      sort: {
        kind: 'benchmark',
        id: benchmark.id,
        direction: findDirection(normalizedQuery, match.index, match.length),
      },
    });
  }

  matches.sort((left, right) => left.position - right.position);

  const sorts: LeaderboardSortTarget[] = [];
  for (const match of matches) {
    pushUniqueSort(sorts, match.sort);
  }

  applyTopicHints(normalizedQuery, sorts);

  const hasSpeedIntent = SPEED_INTENT_PATTERN.test(normalizedQuery);
  if (hasSpeedIntent && !sorts.some((sort) => sort.kind === 'stat' && sort.id === 'speed')) {
    sorts.push({ kind: 'stat', id: 'speed', direction: findSpeedDirection(normalizedQuery, 0, normalizedQuery.length) });
  }

  if (sorts.some((sort) => sort.kind === 'stat' && sort.id === 'speed')) {
    pushUniqueSort(sorts, { kind: 'stat', id: 'comprehensiveScore', direction: 'desc' });
  }

  if (sorts.length === 0 && queryImpliesRanking(normalizedQuery)) {
    for (const sort of DEFAULT_RANKING_SORTS) {
      pushUniqueSort(sorts, sort);
    }
  }

  return {
    modelRegex,
    sorts,
  };
}