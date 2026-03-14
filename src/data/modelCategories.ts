/**
 * Intelligence categories for AI models based on their capabilities
 * These categories help users find models suited for specific tasks
 */

export type IntelligenceCategory = 
  | 'lightweight-coding'
  | 'architectural-analysis'
  | 'agentic-tasks'
  | 'complex-reasoning'
  | 'code-generation'
  | 'fast-responses'
  | 'debugging'
  | 'research-workflows'
  | 'tool-use'
  | 'multimodal'
  | 'reasoning-inference'
  | 'editor-workflows';

export interface ModelDescription {
  model: string;
  description: string;
  categories: IntelligenceCategory[];
}

/**
 * Model descriptions and their intelligence categories
 * Based on official model descriptions from vendors
 */
export const modelDescriptions: ModelDescription[] = [
  {
    model: 'GPT-4.1',
    description: 'Fast, accurate code completions and explanations.',
    categories: ['lightweight-coding', 'fast-responses'],
  },
  {
    model: 'GPT-5 mini',
    description: 'Fast, accurate code completions and explanations. Reliable default for most coding and writing tasks. Works well across languages and frameworks. Delivers deep reasoning and debugging with faster responses and lower resource usage than GPT-5. Supports multimodal input for visual reasoning tasks.',
    categories: ['lightweight-coding', 'fast-responses', 'debugging', 'multimodal'],
  },
  {
    model: 'GPT-5.1',
    description: 'Multi-step problem solving and architecture-level code analysis.',
    categories: ['architectural-analysis', 'complex-reasoning'],
  },
  {
    model: 'GPT-5.1-Codex',
    description: 'Multi-step problem solving and architecture-level code analysis.',
    categories: ['architectural-analysis', 'complex-reasoning', 'code-generation'],
  },
  {
    model: 'GPT-5.1 Codex Max',
    description: 'Agentic tasks.',
    categories: ['agentic-tasks', 'tool-use'],
  },
  {
    model: 'GPT-5.1-Codex-Mini',
    description: 'Multi-step problem solving and architecture-level code analysis.',
    categories: ['architectural-analysis', 'complex-reasoning'],
  },
  {
    model: 'GPT-5.2',
    description: 'Multi-step problem solving and architecture-level code analysis.',
    categories: ['architectural-analysis', 'complex-reasoning'],
  },
  {
    model: 'GPT-5.2-Codex',
    description: 'Agentic tasks.',
    categories: ['agentic-tasks', 'tool-use'],
  },
  {
    model: 'GPT-5.3-Codex',
    description: 'Agentic tasks. Delivers higher-quality code on complex engineering tasks like features, tests, debugging, refactors, and reviews without lengthy instructions.',
    categories: ['agentic-tasks', 'tool-use', 'debugging', 'code-generation'],
  },
  {
    model: 'GPT-5.4',
    description: 'Multi-step problem solving and architecture-level code analysis. Great at complex reasoning, code analysis, and technical decision-making.',
    categories: ['architectural-analysis', 'complex-reasoning'],
  },
  {
    model: 'Claude Haiku 4.5',
    description: 'Fast, reliable answers to lightweight coding questions. Balances fast responses with quality output. Ideal for small tasks and lightweight code explanations.',
    categories: ['lightweight-coding', 'fast-responses'],
  },
  {
    model: 'Claude Opus 4.5',
    description: 'Complex problem-solving challenges, sophisticated reasoning.',
    categories: ['complex-reasoning', 'architectural-analysis'],
  },
  {
    model: 'Claude Opus 4.6',
    description: 'Complex problem-solving challenges, sophisticated reasoning. Anthropic\'s most powerful model. Improves on Claude Opus 4.5.',
    categories: ['complex-reasoning', 'architectural-analysis'],
  },
  {
    model: 'Claude Opus 4.6 (fast mode) (preview)',
    description: 'Complex problem-solving challenges, sophisticated reasoning.',
    categories: ['complex-reasoning', 'architectural-analysis'],
  },
  {
    model: 'Claude Sonnet 4.0',
    description: 'Performance and practicality, perfectly balanced for coding workflows.',
    categories: ['editor-workflows', 'code-generation'],
  },
  {
    model: 'Claude Sonnet 4.5',
    description: 'Complex problem-solving challenges, sophisticated reasoning.',
    categories: ['complex-reasoning', 'code-generation'],
  },
  {
    model: 'Claude Sonnet 4.6',
    description: 'Complex problem-solving challenges, sophisticated reasoning. Improves on Sonnet 4.5 with more reliable completions and smarter reasoning under pressure.',
    categories: ['complex-reasoning', 'code-generation'],
  },
  {
    model: 'Gemini 2.5 Pro',
    description: 'Complex code generation, debugging, and research workflows.',
    categories: ['code-generation', 'debugging', 'research-workflows'],
  },
  {
    model: 'Gemini 3 Flash',
    description: 'Fast, reliable answers to lightweight coding questions.',
    categories: ['lightweight-coding', 'fast-responses'],
  },
  {
    model: 'Gemini 3 Pro',
    description: 'Complex code generation, debugging, and research workflows. Advanced reasoning across long contexts and scientific or technical analysis.',
    categories: ['code-generation', 'debugging', 'research-workflows', 'complex-reasoning'],
  },
  {
    model: 'Gemini 3.1 Pro',
    description: 'Effective and efficient edit-then-test loops with high tool precision.',
    categories: ['editor-workflows', 'tool-use'],
  },
  {
    model: 'Grok Code Fast 1',
    description: 'Fast, accurate code completions and explanations. Specialized for coding tasks. Performs well on code generation, and debugging across multiple languages.',
    categories: ['fast-responses', 'code-generation', 'debugging'],
  },
  {
    model: 'Qwen2.5',
    description: 'Code generation, reasoning, and code repair / debugging.',
    categories: ['code-generation', 'debugging', 'reasoning-inference'],
  },
  {
    model: 'Raptor mini',
    description: 'Fast, accurate code completions and explanations. Specialized for fast, accurate inline suggestions and explanations.',
    categories: ['lightweight-coding', 'fast-responses'],
  },
  {
    model: 'Goldeneye',
    description: 'Complex problem-solving challenges and sophisticated reasoning.',
    categories: ['complex-reasoning', 'reasoning-inference'],
  },
];

// Map model names to their descriptions for quick lookup
export const modelNameToCategories = new Map<string, IntelligenceCategory[]>(
  modelDescriptions.map(m => [m.model, m.categories])
);

// Map model names to their Copilot descriptions for quick lookup
export const modelNameToDescription = new Map<string, string>(
  modelDescriptions.map(m => [m.model, m.description])
);

/**
 * Get all unique categories
 */
export const allCategories: Array<{ id: IntelligenceCategory; label: string; description: string }> = [
  {
    id: 'lightweight-coding',
    label: 'Lightweight Coding',
    description: 'Fast, accurate code completions and explanations for small tasks',
  },
  {
    id: 'architectural-analysis',
    label: 'Architectural Analysis',
    description: 'Multi-step problem solving and architecture-level code analysis',
  },
  {
    id: 'agentic-tasks',
    label: 'Agentic Tasks',
    description: 'Autonomous task execution with multi-step workflows',
  },
  {
    id: 'complex-reasoning',
    label: 'Complex Reasoning',
    description: 'Complex problem-solving and sophisticated reasoning',
  },
  {
    id: 'code-generation',
    label: 'Code Generation',
    description: 'High-quality code generation and synthesis',
  },
  {
    id: 'fast-responses',
    label: 'Fast Responses',
    description: 'Optimized for speed with minimal latency',
  },
  {
    id: 'debugging',
    label: 'Debugging',
    description: 'Debugging and error diagnosis capabilities',
  },
  {
    id: 'research-workflows',
    label: 'Research Workflows',
    description: 'Complex research and analysis workflows',
  },
  {
    id: 'tool-use',
    label: 'Tool Use',
    description: 'Precise tool calling and function integration',
  },
  {
    id: 'multimodal',
    label: 'Multimodal',
    description: 'Handles text, images, and other modalities',
  },
  {
    id: 'reasoning-inference',
    label: 'Reasoning & Inference',
    description: 'Advanced reasoning and inference capabilities',
  },
  {
    id: 'editor-workflows',
    label: 'Editor Workflows',
    description: 'Optimized for IDE integration and edit-then-test loops',
  },
];

/**
 * Search for models matching a query about capabilities
 * Uses fuzzy matching on category descriptions and labels
 */
export function searchModelsByCapability(query: string, categories: IntelligenceCategory[]): boolean {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Check against category labels and descriptions
  return categories.some(categoryId => {
    const category = allCategories.find(c => c.id === categoryId);
    if (!category) return false;
    
    const label = category.label.toLowerCase();
    const description = category.description.toLowerCase();
    
    // Check for exact word boundaries
    const words = normalizedQuery.split(/\s+/);
    return words.some(word => 
      label.includes(word) || description.includes(word)
    );
  });
}
