import { Model } from '../types';

export interface CopilotModelDescription {
  model: string;
  description: string;
}

export interface CopilotDescriptionMatchSource {
  model: string;
  snippet: string;
  matchedTerms: string[];
}

export interface CopilotDescriptionMatchResult {
  modelIds: Set<string>;
  terms: string[];
  sources: CopilotDescriptionMatchSource[];
}

export const copilotModelDescriptions: CopilotModelDescription[] = [
  {
    model: 'GPT-4.1',
    description: 'Fast, accurate code completions and explanations.',
  },
  {
    model: 'GPT-5 mini',
    description: 'Fast, accurate code completions and explanations. Reliable default for most coding and writing tasks. Works well across languages and frameworks. Delivers deep reasoning and debugging with faster responses and lower resource usage than GPT-5. Supports multimodal input for visual reasoning tasks.',
  },
  {
    model: 'GPT-5.1',
    description: 'Multi-step problem solving and architecture-level code analysis.',
  },
  {
    model: 'GPT-5.1-Codex',
    description: 'Multi-step problem solving and architecture-level code analysis.',
  },
  {
    model: 'GPT-5.1 Codex Max',
    description: 'Agentic tasks.',
  },
  {
    model: 'GPT-5.1-Codex-Mini',
    description: 'Multi-step problem solving and architecture-level code analysis.',
  },
  {
    model: 'GPT-5.2',
    description: 'Multi-step problem solving and architecture-level code analysis.',
  },
  {
    model: 'GPT-5.2-Codex',
    description: 'Agentic tasks.',
  },
  {
    model: 'GPT-5.3-Codex',
    description: 'Agentic tasks. Delivers higher-quality code on complex engineering tasks like features, tests, debugging, refactors, and reviews without lengthy instructions.',
  },
  {
    model: 'GPT-5.4',
    description: 'Multi-step problem solving and architecture-level code analysis. Great at complex reasoning, code analysis, and technical decision-making.',
  },
  {
    model: 'Claude Haiku 4.5',
    description: 'Fast, reliable answers to lightweight coding questions. Balances fast responses with quality output. Ideal for small tasks and lightweight code explanations.',
  },
  {
    model: 'Claude Opus 4.5',
    description: 'Complex problem-solving challenges, sophisticated reasoning.',
  },
  {
    model: 'Claude Opus 4.6',
    description: 'Complex problem-solving challenges, sophisticated reasoning. Anthropic\'s most powerful model. Improves on Claude Opus 4.5.',
  },
  {
    model: 'Claude Opus 4.6 (fast mode) (preview)',
    description: 'Complex problem-solving challenges, sophisticated reasoning.',
  },
  {
    model: 'Claude Sonnet 4.0',
    description: 'Performance and practicality, perfectly balanced for coding workflows.',
  },
  {
    model: 'Claude Sonnet 4.5',
    description: 'Complex problem-solving challenges, sophisticated reasoning.',
  },
  {
    model: 'Claude Sonnet 4.6',
    description: 'Complex problem-solving challenges, sophisticated reasoning. Improves on Sonnet 4.5 with more reliable completions and smarter reasoning under pressure.',
  },
  {
    model: 'Gemini 2.5 Pro',
    description: 'Complex code generation, debugging, and research workflows.',
  },
  {
    model: 'Gemini 3 Flash',
    description: 'Fast, reliable answers to lightweight coding questions.',
  },
  {
    model: 'Gemini 3 Pro',
    description: 'Complex code generation, debugging, and research workflows. Advanced reasoning across long contexts and scientific or technical analysis.',
  },
  {
    model: 'Gemini 3.1 Pro',
    description: 'Effective and efficient edit-then-test loops with high tool precision.',
  },
  {
    model: 'Grok Code Fast 1',
    description: 'Fast, accurate code completions and explanations. Specialized for coding tasks. Performs well on code generation, and debugging across multiple languages.',
  },
  {
    model: 'Qwen2.5',
    description: 'Code generation, reasoning, and code repair / debugging.',
  },
  {
    model: 'Raptor mini',
    description: 'Fast, accurate code completions and explanations. Specialized for fast, accurate inline suggestions and explanations.',
  },
  {
    model: 'Goldeneye',
    description: 'Complex problem-solving challenges and sophisticated reasoning.',
  },
];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'of', 'is', 'it', 'its', 'by',
  'with', 'that', 'this', 'from', 'best', 'top', 'models', 'model', 'high', 'low', 'good',
  'great', 'most', 'only', 'level', 'tasks', 'task', 'analysis', 'coding',
]);

function canonicalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function extractSearchTerms(query: string) {
  return Array.from(
    new Set(
      normalize(query)
        .split(' ')
        .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)),
    ),
  );
}

const descriptionByCanonicalName = new Map<string, string>(
  copilotModelDescriptions.map((entry) => [canonicalize(entry.model), entry.description]),
);

export function getCopilotDescriptionForModel(model: Pick<Model, 'name' | 'id'>) {
  const byName = descriptionByCanonicalName.get(canonicalize(model.name));
  if (byName) return byName;

  const byId = descriptionByCanonicalName.get(canonicalize(model.id));
  if (byId) return byId;

  const modelCanonical = canonicalize(model.name);
  for (const [canonicalName, description] of descriptionByCanonicalName) {
    if (modelCanonical.includes(canonicalName) || canonicalName.includes(modelCanonical)) {
      return description;
    }
  }

  return null;
}

export function matchModelsByCopilotDescriptions(query: string, models: Model[]): CopilotDescriptionMatchResult {
  const terms = extractSearchTerms(query);
  if (terms.length === 0) {
    return { modelIds: new Set<string>(), terms: [], sources: [] };
  }

  const sources: CopilotDescriptionMatchSource[] = [];
  const modelIds = new Set<string>();

  for (const model of models) {
    const description = getCopilotDescriptionForModel(model);
    if (!description) continue;

    const descriptionLower = description.toLowerCase();
    const matchedTerms = terms.filter((term) => descriptionLower.includes(term));
    if (matchedTerms.length === 0) continue;

    modelIds.add(model.id);

    const sentences = description.split(/(?<=[.!?])\s+/);
    let bestSentence = description;
    let bestScore = 0;
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const score = matchedTerms.filter((term) => sentenceLower.includes(term)).length;
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence;
      }
    }

    sources.push({
      model: model.name,
      snippet: bestSentence,
      matchedTerms,
    });
  }

  sources.sort((a, b) => b.matchedTerms.length - a.matchedTerms.length || a.model.localeCompare(b.model));

  return {
    modelIds,
    terms,
    sources: sources.slice(0, 6),
  };
}
