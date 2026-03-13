import { Benchmark } from '../types';

type BenchmarkId = Benchmark['id'];

interface SourceScores {
  scores: Record<string, string>;
  source: string;
}

interface BenchmarkRule {
  aliases: string[];
  format: 'percent' | 'raw';
}

interface ArtificialAnalysisModel {
  name?: string;
  short_name?: string;
  slug?: string;
  model_url?: string;
  hle?: number | null;
  gpqa?: number | null;
  scicode?: number | null;
  tau2?: number | null;
  terminalbench_hard?: number | null;
  mmmu_pro?: number | null;
}

const artificialAnalysisFieldMap: Partial<Record<BenchmarkId, keyof ArtificialAnalysisModel>> = {
  hle: 'hle',
  gpqa: 'gpqa',
  terminal: 'terminalbench_hard',
  scicode: 'scicode',
  t2: 'tau2',
  mmmu: 'mmmu_pro',
};

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const ARTIFICIAL_ANALYSIS_MODELS_URL = 'https://artificialanalysis.ai/models';
const CACHE_TTL_MS = 15 * 60 * 1000;

const textCache = new Map<string, { expiresAt: number; value: string }>();
const jsonCache = new Map<string, { expiresAt: number; value: unknown }>();

const benchmarkRules: Record<BenchmarkId, BenchmarkRule> = {
  hle: { aliases: ["Humanity's Last Exam", 'Humanitys Last Exam', 'HLE'], format: 'percent' },
  arc: { aliases: ['ARC-AGI-2', 'ARC AGI 2', 'ARC Prize Verified'], format: 'percent' },
  gpqa: { aliases: ['GPQA Diamond', 'GPQA'], format: 'percent' },
  terminal: { aliases: ['Terminal-Bench 2.0', 'Terminal Bench 2.0', 'Terminal-Bench', 'TerminalBench'], format: 'percent' },
  'swe-verified': { aliases: ['SWE-Bench Verified', 'SWE Bench Verified'], format: 'percent' },
  'swe-pro': { aliases: ['SWE-Bench Pro (Public)', 'SWE Bench Pro (Public)', 'SWE-Bench Pro'], format: 'percent' },
  livecode: { aliases: ['LiveCodeBench Pro', 'LiveCodeBench', 'LCB'], format: 'raw' },
  scicode: { aliases: ['SciCode'], format: 'percent' },
  apex: { aliases: ['APEX-Agents', 'Apex Agents'], format: 'percent' },
  gdpval: { aliases: ['GDPval-AA', 'GDPval'], format: 'raw' },
  t2: { aliases: ['τ2-bench', 'tau2-bench', 'tau 2 bench', 'Tau 2 Bench', 'T2 Bench'], format: 'percent' },
  mcp: { aliases: ['MCP Atlas'], format: 'percent' },
  browsecomp: { aliases: ['BrowseComp', 'BrowserComp'], format: 'percent' },
  mmmu: { aliases: ['MMMU Pro', 'MMMU-Pro', 'MMMU'], format: 'percent' },
  mmmlu: { aliases: ['MMMLU'], format: 'percent' },
  mrcr: { aliases: ['MRCR v2', 'MRCR'], format: 'percent' },
};

const officialBenchmarkUrls: Partial<Record<BenchmarkId, string>> = {
  hle: 'https://labs.scale.com/leaderboard/humanitys_last_exam_text_only',
  'swe-pro': 'https://labs.scale.com/leaderboard/swe_bench_pro_public',
  mcp: 'https://labs.scale.com/leaderboard/mcp_atlas',
  'swe-verified': 'https://www.swebench.com/verified.html',
  browsecomp: 'https://llm-stats.com/benchmarks/browsecomp',
  terminal: 'https://www.tbench.ai/leaderboard/terminal-bench/2.0',
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedForms(modelName: string, modelId?: string) {
  const values = new Set<string>();
  const add = (value?: string) => {
    if (!value) return;
    const normalized = normalizeText(value);
    if (!normalized) return;
    values.add(normalized);

    if (value.includes(':')) {
      const withoutProvider = normalizeText(value.split(':').slice(1).join(':'));
      if (withoutProvider) values.add(withoutProvider);
    }

    if (value.includes('/')) {
      const lastSegment = normalizeText(value.split('/').pop() || '');
      if (lastSegment) values.add(lastSegment);
    }
  };

  add(modelName);
  add(modelId);
  return Array.from(values);
}

function maybeFormatScore(value: string, format: BenchmarkRule['format']) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (format === 'percent') {
    if (trimmed.includes('%')) {
      return trimmed;
    }
    return `${trimmed}%`;
  }

  return trimmed;
}

function formatNumericScore(value: number, format: BenchmarkRule['format']) {
  if (!Number.isFinite(value)) return null;

  if (format === 'percent') {
    const percentValue = value <= 1 ? value * 100 : value;
    const normalized = Number(percentValue.toFixed(percentValue >= 100 ? 0 : 1));
    return `${normalized}%`;
  }

  const normalized = Number(value.toFixed(value >= 100 ? 0 : 3));
  return `${normalized}`;
}

function extractScoreFromText(text: string, benchmarkId: BenchmarkId) {
  const rule = benchmarkRules[benchmarkId];
  if (!rule) return null;

  for (const alias of rule.aliases) {
    const escapedAlias = escapeRegExp(alias).replace(/\s+/g, '\\s+');
    const afterRegex = new RegExp(`${escapedAlias}[^\\d%]{0,40}(\\d{1,4}(?:\\.\\d+)?)\\s*(%)?`, 'i');
    const afterMatch = text.match(afterRegex);
    if (afterMatch?.[1]) {
      const formatted = maybeFormatScore(afterMatch[2] ? `${afterMatch[1]}%` : afterMatch[1], rule.format);
      if (formatted) return formatted;
    }

    const beforeRegex = new RegExp(`(\\d{1,4}(?:\\.\\d+)?)\\s*(%)?[^\\n]{0,40}${escapedAlias}`, 'i');
    const beforeMatch = text.match(beforeRegex);
    if (beforeMatch?.[1]) {
      const formatted = maybeFormatScore(beforeMatch[2] ? `${beforeMatch[1]}%` : beforeMatch[1], rule.format);
      if (formatted) return formatted;
    }
  }

  return null;
}

function extractScoreNearModel(rawText: string, modelCandidates: string[], format: BenchmarkRule['format']) {
  for (const candidate of modelCandidates) {
    if (!candidate) continue;

    const hyphenFriendly = escapeRegExp(candidate).replace(/\s+/g, '[-\\s]*');
    const regex = new RegExp(`${hyphenFriendly}[^\\d]{0,40}(\\d{1,3}(?:\\.\\d+)?)\\s*(%)?`, 'i');
    
    // We might have multiple matches, we want the first sensible one
    let match: RegExpExecArray | null;
    let localText = rawText;
    while ((match = regex.exec(localText))) {
      const numValue = parseFloat(match[1]);
      
      // Strict % filtering
      if (format === 'percent') {
        if (!isNaN(numValue) && numValue > 0 && numValue <= 100) {
          // It's a plausible percentage
          const formatted = maybeFormatScore(match[2] ? `${match[1]}%` : match[1], format);
          if (formatted) return formatted;
        }
      } else {
        // Raw scores
        const formatted = maybeFormatScore(match[2] ? `${match[1]}%` : match[1], format);
        if (formatted) return formatted;
      }
      
      // If it wasn't a valid match (e.g. 2025), keep searching in the rest of the string
      localText = localText.substring(match.index + match[0].length);
    }
  }

  return null;
}

async function fetchText(url: string) {
  const cached = textCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ai-model-comparison/1.0',
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      },
    });
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }
    const text = await response.text();
    textCache.set(url, { expiresAt: Date.now() + CACHE_TTL_MS, value: text });
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const cached = jsonCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ai-model-comparison/1.0',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }
    const json = await response.json() as T;
    jsonCache.set(url, { expiresAt: Date.now() + CACHE_TTL_MS, value: json });
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

function decodeNextFlightPayload(html: string) {
  const parts: string[] = [];
  const regex = /self\.__next_f\.push\(\[\d+,"([\s\S]*?)"\]\)/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const raw = match[1]
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n');

    try {
      parts.push(JSON.parse(`"${raw}"`) as string);
    } catch {
      // Skip malformed chunks and continue decoding the rest of the stream.
    }
  }

  return parts.join('');
}

function decodeEmbeddedJsonStrings(html: string) {
  return html
    .replace(/\\"/g, '"')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u003d/g, '=')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r');
}

function extractArtificialAnalysisModelsFromEscapedHtml(html: string) {
  const models: ArtificialAnalysisModel[] = [];
  const seen = new Set<string>();
  const shortNameRegex = /\\"short_name\\":\\"([^"\\]+)\\"/g;

  let match: RegExpExecArray | null;
  while ((match = shortNameRegex.exec(html))) {
    const chunkStart = Math.max(0, match.index - 2_500);
    const chunkEnd = Math.min(html.length, match.index + 2_500);
    const chunk = html.slice(chunkStart, chunkEnd);
    const slug = chunk.match(/\\"slug\\":\\"([^"\\]+)\\"/)?.[1];
    if (!slug) continue;

    const model: ArtificialAnalysisModel = {
      short_name: match[1],
      slug,
      hle: chunk.match(/\\"hle\\":([0-9.]+)/)?.[1] ? Number(chunk.match(/\\"hle\\":([0-9.]+)/)?.[1]) : null,
      gpqa: chunk.match(/\\"gpqa\\":([0-9.]+)/)?.[1] ? Number(chunk.match(/\\"gpqa\\":([0-9.]+)/)?.[1]) : null,
      scicode: chunk.match(/\\"scicode\\":([0-9.]+)/)?.[1] ? Number(chunk.match(/\\"scicode\\":([0-9.]+)/)?.[1]) : null,
      tau2: chunk.match(/\\"tau2\\":([0-9.]+)/)?.[1] ? Number(chunk.match(/\\"tau2\\":([0-9.]+)/)?.[1]) : null,
      terminalbench_hard: chunk.match(/\\"terminalbench_hard\\":([0-9.]+)/)?.[1] ? Number(chunk.match(/\\"terminalbench_hard\\":([0-9.]+)/)?.[1]) : null,
      mmmu_pro: chunk.match(/\\"mmmu_pro\\":([0-9.]+)/)?.[1] ? Number(chunk.match(/\\"mmmu_pro\\":([0-9.]+)/)?.[1]) : null,
    };

    const key = `${model.slug}:${model.short_name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    models.push(model);
  }

  return models.filter((model) =>
    [model.hle, model.gpqa, model.scicode, model.tau2, model.terminalbench_hard, model.mmmu_pro]
      .some((value) => typeof value === 'number'),
  );
}

function extractArtificialAnalysisModels(payload: string) {
  const models: ArtificialAnalysisModel[] = [];
  const stack: Array<{ start: number; candidate: boolean }> = [];
  let inString = false;
  let escaped = false;

  for (let index = 0; index < payload.length; index += 1) {
    const char = payload[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      stack.push({ start: index, candidate: false });
      continue;
    }

    if (stack.length > 0) {
      const current = stack[stack.length - 1];
      if (
        payload.startsWith('"short_name":"', index) ||
        payload.startsWith('"name":"', index) ||
        payload.startsWith('"slug":"', index) ||
        payload.startsWith('"gpqa":', index) ||
        payload.startsWith('"hle":', index) ||
        payload.startsWith('"scicode":', index) ||
        payload.startsWith('"tau2":', index) ||
        payload.startsWith('"terminalbench_hard":', index) ||
        payload.startsWith('"mmmu_pro":', index)
      ) {
        current.candidate = true;
      }
    }

    if (char !== '}' || stack.length === 0) continue;

    const frame = stack.pop();
    if (!frame?.candidate) continue;

    try {
      const parsed = JSON.parse(payload.slice(frame.start, index + 1)) as ArtificialAnalysisModel;
      if (
        typeof parsed.slug === 'string' &&
        (typeof parsed.name === 'string' || typeof parsed.short_name === 'string')
      ) {
        models.push(parsed);
      }
    } catch {
      // Ignore non-model objects that happen to include similar fields.
    }
  }

  return models;
}

function findBestArtificialAnalysisModelMatch(models: ArtificialAnalysisModel[], modelName: string, modelId?: string) {
  const candidates = normalizedForms(modelName, modelId);
  if (candidates.length === 0) return null;

  let best: ArtificialAnalysisModel | null = null;
  let bestScore = -1;

  for (const model of models) {
    const values = [model.name, model.short_name, model.slug, model.model_url]
      .map((value) => typeof value === 'string' ? normalizeText(value) : '')
      .filter(Boolean);

    let score = 0;
    for (const candidate of candidates) {
      for (const value of values) {
        if (candidate === value) score = Math.max(score, 1000);
        else if (value.includes(candidate) || candidate.includes(value)) score = Math.max(score, 750);
        else {
          const candidateTokens = candidate.split(' ');
          const matchedTokens = candidateTokens.filter((token) => value.includes(token)).length;
          if (matchedTokens > 0) {
            score = Math.max(score, Math.round((matchedTokens / candidateTokens.length) * 550));
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = model;
    }
  }

  return bestScore >= 450 ? best : null;
}

function hasArtificialAnalysisBenchmarkValue(
  model: ArtificialAnalysisModel,
  benchmarks: Benchmark[],
) {
  return benchmarks.some((benchmark) => {
    const field = artificialAnalysisFieldMap[benchmark.id];
    if (!field) return false;
    return typeof model[field] === 'number';
  });
}

function findBestOpenRouterModelMatch(models: any[], modelName: string, modelId?: string) {
  const candidates = normalizedForms(modelName, modelId);
  if (candidates.length === 0) return null;

  let best: any = null;
  let bestScore = -1;

  for (const model of models) {
    const values = [model.id, model.name, model.canonical_slug]
      .map((value) => typeof value === 'string' ? normalizeText(value) : '')
      .filter(Boolean);

    let score = 0;
    for (const candidate of candidates) {
      for (const value of values) {
        if (candidate === value) score = Math.max(score, 1000);
        else if (value.includes(candidate) || candidate.includes(value)) score = Math.max(score, 700);
        else {
          const candidateTokens = candidate.split(' ');
          const matchedTokens = candidateTokens.filter((token) => value.includes(token)).length;
          if (matchedTokens > 0) {
            score = Math.max(score, Math.round((matchedTokens / candidateTokens.length) * 500));
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = model;
    }
  }

  return bestScore >= 400 ? best : null;
}

async function scrapeFromOpenRouter(modelName: string, modelId: string | undefined, benchmarks: Benchmark[]): Promise<SourceScores | null> {
  const data = await fetchJson<{ data?: any[] }>(OPENROUTER_MODELS_URL);
  const models = Array.isArray(data.data) ? data.data : [];
  const matched = findBestOpenRouterModelMatch(models, modelName, modelId);
  if (!matched || typeof matched.description !== 'string') {
    return null;
  }

  const description = matched.description;
  const scores: Record<string, string> = {};
  for (const benchmark of benchmarks) {
    const score = extractScoreFromText(description, benchmark.id);
    if (score) {
      scores[benchmark.id] = score;
    }
  }

  return Object.keys(scores).length > 0 ? { scores, source: 'openrouter-model-claims' } : null;
}

async function scrapeFromOfficialLeaderboards(modelName: string, modelId: string | undefined, benchmarks: Benchmark[]): Promise<SourceScores | null> {
  const modelCandidates = normalizedForms(modelName, modelId);
  const scores: Record<string, string> = {};

  for (const benchmark of benchmarks) {
    const url = officialBenchmarkUrls[benchmark.id];
    const rule = benchmarkRules[benchmark.id];
    if (!url || !rule) continue;

    try {
      const pageText = await fetchText(url);
      const score = extractScoreNearModel(pageText, modelCandidates, rule.format);
      if (score) {
        scores[benchmark.id] = score;
      }
    } catch {
      // Ignore source-specific failures and continue with the hybrid pipeline.
    }
  }

  return Object.keys(scores).length > 0 ? { scores, source: 'official-leaderboards' } : null;
}

async function scrapeFromArtificialAnalysis(modelName: string, modelId: string | undefined, benchmarks: Benchmark[]): Promise<SourceScores | null> {
  const html = await fetchText(ARTIFICIAL_ANALYSIS_MODELS_URL);
  const payload = decodeNextFlightPayload(html);
  const escapedHtmlPayload = decodeEmbeddedJsonStrings(html);
  const models = [
    ...extractArtificialAnalysisModels(payload),
    ...extractArtificialAnalysisModels(escapedHtmlPayload),
    ...extractArtificialAnalysisModelsFromEscapedHtml(html),
  ];
  const benchmarkBearingModels = models.filter((model) => hasArtificialAnalysisBenchmarkValue(model, benchmarks));
  const matched = findBestArtificialAnalysisModelMatch(
    benchmarkBearingModels.length > 0 ? benchmarkBearingModels : models,
    modelName,
    modelId,
  );
  if (!matched) return null;

  const scores: Record<string, string> = {};
  for (const benchmark of benchmarks) {
    const rule = benchmarkRules[benchmark.id];
    const field = artificialAnalysisFieldMap[benchmark.id];
    if (!rule || !field) continue;

    const rawValue = matched[field];
    if (typeof rawValue !== 'number') continue;

    const formatted = formatNumericScore(rawValue, rule.format);
    if (formatted) {
      scores[benchmark.id] = formatted;
    }
  }

  return Object.keys(scores).length > 0 ? { scores, source: 'artificial-analysis' } : null;
}

async function scrapeBrowseComp(modelCandidates: string[]): Promise<string | null> {
  try {
    const textStats = await fetchText('https://llm-stats.com/benchmarks/browsecomp');
    const textKaggle = await fetchText('https://www.kaggle.com/benchmarks/openai/browsecomp');
    
    for (const candidate of modelCandidates) {
      if (!candidate) continue;
      const regex = new RegExp(`${escapeRegExp(candidate)}[^\\d]+(0\\.\\d{3})`, 'i');
      const match = textStats.match(regex);
      if (match?.[1]) {
         return `${(parseFloat(match[1]) * 100).toFixed(1)}%`;
      }
    }
    
    const kaggleScore = extractScoreNearModel(textKaggle, modelCandidates, 'percent');
    if (kaggleScore) return kaggleScore;
  } catch (e) {
    console.error("BrowseComp scrape error", e);
  }
  return null;
}

async function scrapeTerminalBench(modelCandidates: string[]): Promise<string | null> {
  try {
    const url = officialBenchmarkUrls.terminal;
    if (!url) return null;
    const text = await fetchText(url);
    return extractScoreNearModel(text, modelCandidates, 'percent');
  } catch (e) {
    console.error("Terminal-Bench scrape error", e);
  }
  return null;
}

async function scrapeGPQAAveraged(modelCandidates: string[], modelName: string, modelId?: string): Promise<string | null> {
  try {
    let valsScore: number | null = null;
    let vellumScore: number | null = null;
    let aaScore: number | null = null;

    try {
       const valsText = await fetchText('https://www.vals.ai/benchmarks/gpqa');
       const valsMatch = extractScoreNearModel(valsText, modelCandidates, 'percent');
       if (valsMatch) valsScore = parseFloat(valsMatch);
    } catch(e) {}

    try {
       const vellumText = await fetchText('https://www.vellum.ai/llm-leaderboard');
       const vellumMatch = extractScoreNearModel(vellumText, modelCandidates, 'percent');
       if (vellumMatch) vellumScore = parseFloat(vellumMatch);
    } catch(e) {}

    try {
       const html = await fetchText(ARTIFICIAL_ANALYSIS_MODELS_URL);
       const payload = decodeNextFlightPayload(html);
       const escapedHtmlPayload = decodeEmbeddedJsonStrings(html);
       const models = [
         ...extractArtificialAnalysisModels(payload),
         ...extractArtificialAnalysisModels(escapedHtmlPayload),
         ...extractArtificialAnalysisModelsFromEscapedHtml(html),
       ];
       const matched = findBestArtificialAnalysisModelMatch(models, modelName, modelId);
       if (matched?.gpqa) {
           aaScore = matched.gpqa <= 1 ? matched.gpqa * 100 : matched.gpqa;
       }
    } catch(e) {}

    const scores = [valsScore, vellumScore, aaScore].filter(s => s !== null && !isNaN(s as number)) as number[];
    if (scores.length > 0) {
      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
      return `${(Math.round(average * 10) / 10).toFixed(1)}%`;
    }
  } catch(e) {
     console.error("GPQA scrape error", e);
  }
  return null;
}

export async function scrapeBenchmarksHybrid(modelName: string, benchmarks: Benchmark[], modelId?: string) {
  const modelCandidates = normalizedForms(modelName, modelId);
  const requestedIds = new Set(benchmarks.map((b) => b.id));

  // Hyper-focused, blazingly fast pull for just the top 4 benchmarks, preserving old data elsewhere
  const [official, browsecomp, terminal, gpqa] = await Promise.allSettled([
    requestedIds.has('hle') ? scrapeFromOfficialLeaderboards(modelName, modelId, [{ id: 'hle', name: '', subtext1: '', subtext2: '' } as Benchmark]) : Promise.resolve(null),
    requestedIds.has('browsecomp') ? scrapeBrowseComp(modelCandidates) : Promise.resolve(null),
    requestedIds.has('terminal') ? scrapeTerminalBench(modelCandidates) : Promise.resolve(null),
    requestedIds.has('gpqa') ? scrapeGPQAAveraged(modelCandidates, modelName, modelId) : Promise.resolve(null),
  ]);

  const mergedScores: Record<string, string> = {};

  if (official.status === 'fulfilled' && official.value?.scores?.hle) {
    mergedScores['hle'] = official.value.scores.hle;
  }
  if (browsecomp.status === 'fulfilled' && browsecomp.value) {
    mergedScores['browsecomp'] = browsecomp.value;
  }
  if (terminal.status === 'fulfilled' && terminal.value) {
    mergedScores['terminal'] = terminal.value;
  }
  if (gpqa.status === 'fulfilled' && gpqa.value) {
    mergedScores['gpqa'] = gpqa.value;
  }

  return mergedScores;
}