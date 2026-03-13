import { fetchText, extractScoreNearModel } from './src/lib/benchmarkScraper.ts';
(async () => {
    const text = await fetchText('https://www.vellum.ai/llm-leaderboard');
    const index = text.indexOf('Claude Opus 4.5');
    console.log("Chunk near Opus 4.5:");
    console.log(text.substring(index, index + 250));
})();
