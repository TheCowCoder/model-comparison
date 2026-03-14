# Intelligence Categories - Quick Reference

## How It Works

1. **Automatic Model Enrichment**: When the app loads, each model is automatically enriched with its intelligence categories based on its name and official description.

2. **Natural Language Search**: Users can search in the leaderboard using natural language to find models matching specific capabilities.

3. **Seamless Integration**: Categories are included in the leaderboard search text, so models are found when users search for capability keywords.

## Implementation Summary

### Files Created/Modified

**New Files:**
- `src/data/modelCategories.ts` - Intelligence category definitions and model descriptions
- `src/lib/modelEnrichment.ts` - Functions to enrich models with categories
- `src/components/IntelligenceCategoryBadges.tsx` - UI components for displaying categories
- `INTELLIGENCE_CATEGORIES.md` - Full documentation

**Modified Files:**
- `src/types.ts` - Added `intelligenceCategories?: string[]` to Model interface
- `src/lib/appState.ts` - Apply enrichment to models on initialization
- `src/lib/leaderboard.ts` - Enhanced search to support category filtering

## Example Usage

### Code Example: Search Results

When a user searches for **"Agentic tasks and architectural level coding analysis"**, the system:

1. Detects keywords matching categories: "agentic-tasks" and "architectural-analysis"
2. Finds all models with those categories
3. Returns matches like:
   - GPT-5.1 Codex Max (agentic-tasks, tool-use)
   - GPT-5.2-Codex (agentic-tasks, tool-use)
   - GPT-5.1 (architectural-analysis, complex-reasoning)
   - GPT-5.2 (architectural-analysis, complex-reasoning)

### UI Example: Using Category Components

```tsx
import { CategoriesList } from '@/components/IntelligenceCategoryBadges';

// In a model card or detail view:
<CategoriesList 
  categories={model.intelligenceCategories}
  size="md"
/>
```

## Category Mapping Example

Here's how models are categorized (from the provided data):

```
GPT-4.1
├─ lightweight-coding
└─ fast-responses

GPT-5.1
├─ architectural-analysis
└─ complex-reasoning

GPT-5.1 Codex Max
├─ agentic-tasks
└─ tool-use

Claude Haiku 4.5
├─ lightweight-coding
└─ fast-responses

Claude Opus 4.6
├─ complex-reasoning
└─ architectural-analysis
```

## Integration Points

### 1. **Leaderboard Search**
- File: `src/lib/leaderboard.ts`
- Function: `filterModelsByCategories()`
- Usage: Automatically called during query fallback inference

### 2. **Model Display**
- Component: `IntelligenceCategoryBadges.tsx`
- Usage: Can be embedded in model cards, detail views, comparison views

### 3. **Filter UI**
- Component: `CategorySelector`
- Usage: Can be added to admin panel for category management

### 4. **Data Enrichment**
- File: `src/lib/modelEnrichment.ts`
- Function: `enrichModelsWithCategories()`
- Called: During app initialization in `appState.ts`

## How to Extend

### Add More Models
Edit `src/data/modelCategories.ts`:

```typescript
{
  model: 'New Model Name',
  description: 'What this model does',
  categories: ['category-id-1', 'category-id-2'],
}
```

### Add New Categories
Edit `src/data/modelCategories.ts`:

```typescript
export const allCategories: Array<{...}> = [
  // ... existing categories
  {
    id: 'new-category',
    label: 'Display Label',
    description: 'What this category represents',
  },
]
```

### Use in Custom Components
Any component can import and use the utilities:

```typescript
import { CategoryBadge, CategoriesList } from '@/components/IntelligenceCategoryBadges';
import { enrichModelWithCategories } from '@/lib/modelEnrichment';
```

## Search Query Examples

The system handles all these query types:

1. **Direct Category**: `"agentic tasks"` → Finds all agentic models
2. **Multi-Category**: `"fast responses and code generation"` → Finds models with both
3. **Descriptive**: `"models good at editing code quickly"` → Matches editor-workflows + fast-responses
4. **Combined with Stats**: `"agentic models with high intelligence"` → Category + stat filter
5. **With Benchmarks**: `"architectural analysis for SWE-Bench"` → Category + benchmark filter

## Performance Notes

- Category enrichment happens once at initialization
- Search uses text matching with word boundaries (efficient)
- Categories are stored in-memory with models (no database calls)
- No performance impact on existing search functionality

---

**Version**: 1.0  
**Last Updated**: March 2026
