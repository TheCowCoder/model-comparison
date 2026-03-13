export const LEADERBOARD_SEARCH_MODEL_OPTIONS = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview' },
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite Preview' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
] as const;

export type LeaderboardSearchModel = typeof LEADERBOARD_SEARCH_MODEL_OPTIONS[number]['value'];

export const DEFAULT_LEADERBOARD_SEARCH_MODEL: LeaderboardSearchModel = 'gemini-2.5-pro';

const allowedLeaderboardSearchModels = new Set<string>(
  LEADERBOARD_SEARCH_MODEL_OPTIONS.map((option) => option.value),
);

export function resolveLeaderboardSearchModel(searchModel?: string): LeaderboardSearchModel {
  if (searchModel && allowedLeaderboardSearchModels.has(searchModel)) {
    return searchModel as LeaderboardSearchModel;
  }

  return DEFAULT_LEADERBOARD_SEARCH_MODEL;
}