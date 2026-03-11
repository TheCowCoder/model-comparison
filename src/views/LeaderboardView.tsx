import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Loader2, Search, Sparkles, Trophy } from 'lucide-react';
import { parseLeaderboardQuery } from '../services/geminiService';
import { Model, Benchmark } from '../types';

const statsColumns: Array<{ key: keyof NonNullable<Model['stats']>; label: string }> = [
  { key: 'humanUnderstanding', label: 'Human Understanding' },
  { key: 'comprehensiveScore', label: 'Comprehensive Score' },
  { key: 'intelligence', label: 'Intelligence (Est.)' },
  { key: 'speed', label: 'Speed (Est.)' },
  { key: 'frontend', label: 'Frontend UI (Est.)' },
  { key: 'backend', label: 'Backend Robustness (Est.)' },
];

export default function LeaderboardView() {
  const { models, benchmarks, loadError } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filteredModels, setFilteredModels] = useState<Model[]>(models);
  const [sortBenchmarkId, setSortBenchmarkId] = useState<string | null>(null);

  useEffect(() => {
    setFilteredModels(models);
  }, [models]);

  const parseScore = (scoreStr: string | undefined): number | null => {
    if (!scoreStr || scoreStr === '—') return null;
    const cleanStr = scoreStr.replace(/,/g, '');
    const match = cleanStr.match(/[\d.]+/);
    if (match) {
      return parseFloat(match[0]);
    }
    return null;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setFilteredModels(models);
      setSortBenchmarkId(null);
      return;
    }

    setIsSearching(true);
    try {
      const result = await parseLeaderboardQuery(searchQuery, models, benchmarks);
      
      let newFilteredModels = models;
      if (result.modelIds && result.modelIds.length > 0) {
        newFilteredModels = models.filter(m => result.modelIds.includes(m.id));
      }

      if (result.benchmarkId) {
        setSortBenchmarkId(result.benchmarkId);
        newFilteredModels = [...newFilteredModels].sort((a, b) => {
          const scoreA = parseScore(a.scores[result.benchmarkId!]);
          const scoreB = parseScore(b.scores[result.benchmarkId!]);
          
          if (scoreA === null && scoreB === null) return 0;
          if (scoreA === null) return 1;
          if (scoreB === null) return -1;
          
          return scoreB - scoreA; // Descending order
        });
      } else {
        setSortBenchmarkId(null);
      }

      setFilteredModels(newFilteredModels);
    } catch (error) {
      console.error("Search failed", error);
      alert("Failed to parse search query.");
    } finally {
      setIsSearching(false);
    }
  };

  const sortBenchmark = sortBenchmarkId ? benchmarks.find(b => b.id === sortBenchmarkId) : null;

  const renderStatValue = (model: Model, key: keyof NonNullable<Model['stats']>) => {
    const value = model.stats?.[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
    return `${Math.round(value)}/100`;
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-neutral-500 hover:text-neutral-900 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
              <Trophy className="text-yellow-500" /> Leaderboards
            </h1>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[24px] border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
              <Sparkles size={14} /> Natural-language ranking
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-neutral-950">Find the best models faster</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
              Ask for a benchmark, list a few models, or leave the query broad to sort the whole leaderboard by the closest matching test.
            </p>
          </div>
          <div className="rounded-[24px] border border-neutral-200 bg-neutral-950 p-6 text-white shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Current dataset</div>
            <div className="mt-4 text-4xl font-bold">{models.length}</div>
            <div className="mt-1 text-sm text-white/65">models with benchmark and derived score coverage</div>
            {loadError && <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{loadError}</div>}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden flex flex-col mb-8">
          <form onSubmit={handleSearch} className="p-4 border-b border-neutral-200 flex items-center gap-3 bg-neutral-50">
            <Search className="text-neutral-400" size={20} />
            <input 
              type="text" 
              placeholder='Try: "rank by browsecomp" or "benchmark: hle models: gpt-5, claude sonnet"' 
              className="bg-transparent border-none outline-none w-full text-neutral-700"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              disabled={isSearching}
            />
            <button 
              type="submit" 
              disabled={isSearching}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : "Search"}
            </button>
          </form>
        </div>

        {sortBenchmark && (
          <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 flex items-center gap-2">
            <span className="font-semibold">Sorted by:</span> {sortBenchmark.name}
          </div>
        )}

        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-neutral-100 shadow-sm">
                <tr>
                  <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200 sticky left-0 bg-neutral-100 z-10">Model</th>
                  {statsColumns.map(stat => (
                    <th key={stat.key} className="p-4 text-sm font-semibold text-red-900 border-b border-r border-red-300 bg-red-100/40 whitespace-nowrap">
                      {stat.label}
                    </th>
                  ))}
                  {benchmarks.map(b => (
                    <th key={b.id} className={`p-4 text-sm font-semibold border-b border-neutral-200 whitespace-nowrap ${sortBenchmarkId === b.id ? 'bg-blue-100 text-blue-800' : 'text-neutral-600'}`}>
                      {b.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((model, idx) => (
                  <tr key={model.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                    <td className="p-4 font-medium text-neutral-900 sticky left-0 bg-white z-10 border-r border-neutral-100 min-w-[280px]">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 font-mono text-xs">#{idx + 1}</span>
                        <div>
                          <div className="font-semibold text-neutral-950">{model.name}</div>
                          <div className="text-xs text-neutral-500">{model.subtitle || model.id}</div>
                        </div>
                      </div>
                    </td>
                    {statsColumns.map(stat => (
                      <td key={stat.key} className="p-4 whitespace-nowrap border-r border-red-300 bg-red-50/45 text-red-900 font-semibold">
                        {renderStatValue(model, stat.key)}
                      </td>
                    ))}
                    {benchmarks.map(b => (
                      <td key={b.id} className={`p-4 whitespace-nowrap ${sortBenchmarkId === b.id ? 'bg-blue-50/30 font-semibold' : ''}`}>
                        {model.scores[b.id] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
                {filteredModels.length === 0 && (
                  <tr>
                    <td colSpan={benchmarks.length + statsColumns.length + 1} className="p-8 text-center text-neutral-500">
                      No models found matching your query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
