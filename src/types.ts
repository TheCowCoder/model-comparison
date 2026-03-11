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

export interface Model {
  id: string;
  name: string;
  subtitle?: string;
  color?: string;
  scores: Record<string, string>;
  stats?: ModelStats;
}

export interface AppState {
  benchmarks: Benchmark[];
  models: Model[];
}
