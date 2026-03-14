export interface Benchmark {
  id: string;
  name: string;
  subtext1: string;
  subtext2: string;
}

export interface ModelStats {
  humanUnderstanding: number;
  intelligence: number;
  speed: number;
  frontend: number;
  backend: number;
  comprehensiveScore: number;
  contextLength: number;
  pricePer1M: number;
}

export type LeaderboardStatKey = Pick<ModelStats,
  'humanUnderstanding' |
  'comprehensiveScore' |
  'intelligence' |
  'speed' |
  'frontend' |
  'backend'
> extends infer SelectedStats
  ? keyof SelectedStats
  : never;

export type LeaderboardSortKind = 'stat' | 'benchmark';
export type LeaderboardSortDirection = 'asc' | 'desc';

export interface LeaderboardSortTarget {
  kind: LeaderboardSortKind;
  id: string;
  direction: LeaderboardSortDirection;
}

export interface LeaderboardQueryResult {
  modelRegex: string | null;
  sorts: LeaderboardSortTarget[];
}

export interface Model {
  id: string;
  name: string;
  subtitle?: string;
  color?: string;
  scores: Record<string, string>;
  stats?: ModelStats;
  intelligenceCategories?: string[];
  copilotDescription?: string;
}

export interface AppState {
  benchmarks: Benchmark[];
  models: Model[];
}
