import { Model } from '../types';

const deterministicOffset = (value: string, max: number) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100000;
  }
  return (hash / 100000) * max;
};

export const fetchOpenRouterModels = async (): Promise<Model[]> => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (!response.ok) throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    const data = await response.json();

    if (!data || !data.data) {
      throw new Error('Invalid response format from OpenRouter');
    }

    return data.data.map((apiModel: any) => {
      // Safely parse pricing
      const prompt = parseFloat(apiModel.pricing?.prompt || '0');
      const completion = parseFloat(apiModel.pricing?.completion || '0');
      const avgPricePer1M = (((isNaN(prompt) ? 0 : prompt) + (isNaN(completion) ? 0 : completion)) / 2) * 1000000;

      const contextLength = apiModel.context_length || 4096;

      // --- MATH HEAVY HEURISTICS ---
      
      // 1. Intelligence (0-100)
      let intelligence = 50;
      const idLower = apiModel.id.toLowerCase();
      const offset = deterministicOffset(apiModel.id, 10);

      if (idLower.includes('opus') || idLower.includes('gpt-4') || idLower.includes('gpt-5') || idLower.includes('sonnet-3.5') || idLower.includes('gemini-1.5-pro') || idLower.includes('gemini-2') || idLower.includes('gemini-3') || idLower.includes('claude-3.5') || idLower.includes('o1') || idLower.includes('o3') || idLower.includes('o4')) {
        intelligence = 92 + deterministicOffset(apiModel.id, 6); // Top tier
      } else if (idLower.includes('sonnet') || idLower.includes('gpt-4o-mini') || idLower.includes('gemini-1.5-flash') || idLower.includes('70b') || idLower.includes('72b') || idLower.includes('llama-3.1-405b')) {
        intelligence = 80 + deterministicOffset(apiModel.id, 10); // High tier
      } else if (idLower.includes('8b') || idLower.includes('haiku') || idLower.includes('mixtral') || idLower.includes('gemma') || idLower.includes('phi-3')) {
        intelligence = 65 + deterministicOffset(apiModel.id, 10); // Mid tier
      } else {
        // Fallback: estimate based on price (more expensive usually means larger/smarter)
        intelligence = Math.min(95, 45 + (avgPricePer1M * 1.5) + offset * 0.2);
      }

      // 2. Speed (0-100)
      // Inverse of intelligence (bigger models are slower), but boosted by fast providers/architectures
      let speed = 100 - (intelligence * 0.5);
      if (idLower.includes('groq') || idLower.includes('fast') || idLower.includes('edge') || idLower.includes('together')) {
        speed = Math.min(100, speed + 35);
      } else if (idLower.includes('mini') || idLower.includes('flash') || idLower.includes('haiku') || idLower.includes('8b')) {
        speed = Math.min(100, speed + 25);
      }
      
      // Clamp speed
      speed = Math.max(10, Math.min(100, speed));

      // 3. Comprehensive Score (0-100)
      // Weighted average: 45% Intelligence, 35% Speed, 20% Context Length
      const contextScore = Math.min(100, (Math.log2(contextLength) / Math.log2(2000000)) * 100);
      const comprehensiveScore = (intelligence * 0.5) + (speed * 0.3) + (contextScore * 0.2);

      return {
        id: apiModel.id,
        name: apiModel.name || apiModel.id.split('/').pop() || 'Unknown Model',
        subtitle: apiModel.description?.slice(0, 60) + (apiModel.description?.length > 60 ? '...' : '') || 'AI Model',
        scores: {},
        stats: {
          humanUnderstanding: 0,
          intelligence,
          speed,
          frontend: intelligence * 0.9,
          backend: intelligence * 0.95,
          comprehensiveScore,
          contextLength,
          pricePer1M: avgPricePer1M
        }
      };
    });
  } catch (error) {
    console.error("Failed to fetch OpenRouter models", error);
    throw error; // Re-throw to handle in UI
  }
};
