# Intelligence Categories Feature Guide

## Overview
The AI Model Comparison tool now includes **Intelligence Categories** that allow you to search and filter models based on their core capabilities and intended use cases.

## Available Categories

### 1. **Lightweight Coding**
- Fast, accurate code completions and explanations
- Ideal for: Small tasks, quick fixes, simple code explanations
- Models: Claude Haiku 4.5, Gemini 3 Flash, GPT-4.1, Raptor mini

### 2. **Architectural Analysis**
- Multi-step problem solving and architecture-level code analysis
- Ideal for: Large codebases, system design, refactoring strategies
- Models: GPT-5.1, GPT-5.2, Claude Opus series, GPT-5.4

### 3. **Agentic Tasks**
- Autonomous task execution with multi-step workflows
- Ideal for: Complex automation, multi-step problem solving, agent orchestration
- Models: GPT-5.1 Codex Max, GPT-5.2-Codex, GPT-5.3-Codex

### 4. **Complex Reasoning**
- Advanced reasoning and sophisticated problem-solving
- Ideal for: Mathematical problems, logical reasoning, technical decision-making
- Models: Claude Opus 4.6, Claude Sonnet 4.6, Goldeneye

### 5. **Code Generation**
- High-quality code generation and synthesis
- Ideal for: Feature implementation, code creation, large-scale coding
- Models: Claude Sonnet 4.0 and 4.5, Grok Code Fast 1, Qwen2.5

### 6. **Fast Responses**
- Optimized for speed with minimal latency
- Ideal for: Real-time applications, high-throughput systems
- Models: Claude Haiku 4.5, Gemini 3 Flash, GPT-4.1

### 7. **Debugging**
- Specialized in error diagnosis and debugging capabilities
- Ideal for: Bug fixing, error analysis, test-driven development
- Models: Gemini 2.5 Pro, GPT-5 mini, Grok Code Fast 1

### 8. **Research Workflows**
- Complex research and analysis workflows
- Ideal for: Scientific research, technical analysis, research implementation
- Models: Gemini 2.5 Pro, Gemini 3 Pro

### 9. **Tool Use**
- Precise tool calling and function integration
- Ideal for: API integration, function calling, complex tool orchestration
- Models: Gemini 3.1 Pro, GPT-5.1 Codex Max, GPT-5.2-Codex

### 10. **Multimodal**
- Handles text, images, and other modalities
- Ideal for: Visual analysis, image understanding, cross-modal reasoning
- Models: GPT-5 mini

### 11. **Reasoning & Inference**
- Advanced reasoning and inference capabilities
- Ideal for: Deep reasoning tasks, complex inference
- Models: Qwen2.5, Goldeneye

### 12. **Editor Workflows**
- Optimized for IDE integration and edit-then-test loops
- Ideal for: IDE integration, rapid iteration, test automation
- Models: Claude Sonnet 4.0, Gemini 3.1 Pro

## How to Search by Categories

### Method 1: Natural Language Search
Simply type natural descriptions of what you need:

**Examples:**
- `"Agentic tasks and architectural level coding analysis"`
- `"Fast code completions for lightweight tasks"`
- `"Complex reasoning and problem-solving"`
- `"Debugging and error analysis"`
- `"Fast responses for real-time applications"`

The system will automatically:
1. Detect which categories match your search
2. Filter models that have those capabilities
3. Sort them by relevance

### Method 2: Category Keywords
Use specific category names or keywords:

**Examples:**
- `"best for agentic tasks"`
- `"models for architectural analysis"`
- `"fast response models"`
- `"complex reasoning capability"`

### Method 3: Combination Search
Combine categories with stats and benchmarks:

**Examples:**
- `"agentic tasks with high intelligence"`
- `"fast models for coding that score high on SWE-Bench"`
- `"complex reasoning and high speed"`

## How Categories Are Selected

Each model is tagged with categories based on:
1. **Official vendor descriptions** - The primary source of category assignment
2. **Demonstrated capabilities** - Validated through benchmarks and real-world usage
3. **Intended use cases** - As specified by the model creators

Categories are automatically matched when:
- A model's official description matches a category's definition
- The model name or ID relates to specific capability areas
- The model's benchmarks align with category requirements

## Search Examples

### Scenario 1: Quick Code Questions
**Search:** `"Fast responses and lightweight coding"`
**You'll find:** Models optimized for quick, accurate code completions

### Scenario 2: System Architecture Work
**Search:** `"Architectural analysis and complex reasoning"`
**You'll find:** Models suited for large-scale design and analysis

### Scenario 3: Automated Workflows
**Search:** `"Agentic tasks and tool use"`
**You'll find:** Models capable of autonomous multi-step execution

### Scenario 4: Research Projects
**Search:** `"Code generation and research workflows"`
**You'll find:** Models with both coding and research analysis capabilities

## Technical Implementation

- Categories are stored in the model's `intelligenceCategories` field
- Search matching is performed using keyword and fuzzy matching
- Categories are automatically applied during model initialization
- The search can detect both direct category mentions and related capability descriptions

## Extending Categories

To add more models or categories:

1. **Add to Model Data:** Update `src/data/modelCategories.ts` with new model descriptions and categories
2. **Regenerate Mappings:** The enrichment process automatically maps models to categories
3. **Search Updates:** The leaderboard search automatically uses the updated categories

---

**Note:** Categories are continuously refined based on model updates and new model releases.
