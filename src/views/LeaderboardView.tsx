import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Loader2, Search, Sparkles, Trophy, ChevronDown, X } from 'lucide-react';
import { parseLeaderboardQuery } from '../services/geminiService';
import { parseScoreValue } from '../lib/appState';
import { DEFAULT_RANKING_SORTS, filterModelsByLeaderboardRegex, leaderboardStatColumns, inferLeaderboardQueryFallback, queryImpliesRanking } from '../lib/leaderboard';
import { DEFAULT_LEADERBOARD_SEARCH_MODEL, LEADERBOARD_SEARCH_MODEL_OPTIONS } from '../lib/searchModels';
import { Benchmark, LeaderboardSortTarget, LeaderboardStatKey, Model } from '../types';

type LeaderboardColumn =
  | { kind: 'stat'; id: LeaderboardStatKey; label: string; rank: number | null }
  | { kind: 'benchmark'; id: string; label: string; rank: number | null };

export default function LeaderboardView() {
  const { models, benchmarks, loadError } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filteredModels, setFilteredModels] = useState<Model[]>(models);
  const [activeSorts, setActiveSorts] = useState<LeaderboardSortTarget[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [searchModel, setSearchModel] = useState<string>(DEFAULT_LEADERBOARD_SEARCH_MODEL);
  const [searchFilterLabel, setSearchFilterLabel] = useState<string | null>(null);
  const [searchFilteredCount, setSearchFilteredCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilteredModels(applyModelFilter(models, selectedModelIds));
  }, [models]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyModelFilter = (list: Model[], selected: Set<string>) => {
    if (selected.size === 0) return list;
    return list.filter(m => selected.has(m.id));
  };

  const toggleModel = (id: string) => {
    setSelectedModelIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    let result = applyModelFilter(models, selectedModelIds);
    if (activeSorts.length > 0) {
      result = [...result].sort((a, b) => compareModels(a, b, activeSorts));
    }
    setFilteredModels(result);
  }, [selectedModelIds]);

  const getSortValue = (model: Model, sort: LeaderboardSortTarget): number | null => {
    if (sort.kind === 'stat') {
      const value = model.stats?.[sort.id];
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    }

    return parseScoreValue(model.scores[sort.id]);
  };

  const compareModels = (left: Model, right: Model, sorts: LeaderboardSortTarget[]) => {
    for (const sort of sorts) {
      const leftValue = getSortValue(left, sort);
      const rightValue = getSortValue(right, sort);

      if (leftValue === null && rightValue === null) continue;
      if (leftValue === null) return 1;
      if (rightValue === null) return -1;
      if (leftValue === rightValue) continue;

      if (sort.direction === 'asc') {
        return leftValue - rightValue;
      }

      return rightValue - leftValue;
    }

    return left.name.localeCompare(right.name);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSorts([]);
    setSearchFilterLabel(null);
    setSearchFilteredCount(0);
    setFilteredModels(applyModelFilter(models, selectedModelIds));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      handleClearSearch();
      return;
    }

    setIsSearching(true);
    try {
      const fallback = inferLeaderboardQueryFallback(searchQuery, models, benchmarks);
      let result;
      try {
        result = await parseLeaderboardQuery(searchQuery, models, benchmarks, searchModel);
      } catch {
        result = fallback;
      }

      const resolvedSorts = result.sorts.length > 0
        ? result.sorts
        : queryImpliesRanking(searchQuery)
          ? fallback.sorts.length > 0
            ? fallback.sorts
            : DEFAULT_RANKING_SORTS
          : [];
      
      let newFilteredModels = filterModelsByLeaderboardRegex(models, result.modelRegex);
      if (result.modelRegex && newFilteredModels.length > 0 && newFilteredModels.length < models.length) {
        setSearchFilterLabel('AI filter applied');
        setSearchFilteredCount(newFilteredModels.length);
      } else {
        setSearchFilterLabel(null);
        setSearchFilteredCount(0);
      }

      newFilteredModels = applyModelFilter(newFilteredModels, selectedModelIds);

      if (resolvedSorts.length > 0) {
        setActiveSorts(resolvedSorts);
        newFilteredModels = [...newFilteredModels].sort((a, b) => compareModels(a, b, resolvedSorts));
      } else {
        setActiveSorts([]);
      }

      setFilteredModels(newFilteredModels);
    } catch (error) {
      console.error("Search failed", error);
      const fallback = inferLeaderboardQueryFallback(searchQuery, models, benchmarks);
      let newFilteredModels = filterModelsByLeaderboardRegex(models, fallback.modelRegex);
      if (fallback.modelRegex && newFilteredModels.length > 0 && newFilteredModels.length < models.length) {
        setSearchFilterLabel('AI filter applied');
        setSearchFilteredCount(newFilteredModels.length);
      } else {
        setSearchFilterLabel(null);
        setSearchFilteredCount(0);
      }
      newFilteredModels = applyModelFilter(newFilteredModels, selectedModelIds);
      if (fallback.sorts.length > 0) {
        setActiveSorts(fallback.sorts);
        newFilteredModels = [...newFilteredModels].sort((a, b) => compareModels(a, b, fallback.sorts));
      } else {
        setActiveSorts([]);
      }
      setFilteredModels(newFilteredModels);
    } finally {
      setIsSearching(false);
    }
  };

  const activeSortKeySet = new Set(activeSorts.map((sort) => `${sort.kind}:${sort.id}`));
  const activeColumns: LeaderboardColumn[] = activeSorts.flatMap((sort, index) => {
    if (sort.kind === 'stat') {
      const stat = leaderboardStatColumns.find((entry) => entry.key === sort.id);
      return stat ? [{ kind: 'stat' as const, id: stat.key, label: stat.label, rank: index + 1 }] : [];
    }

    const benchmark = benchmarks.find((entry) => entry.id === sort.id);
    return benchmark ? [{ kind: 'benchmark' as const, id: benchmark.id, label: benchmark.name, rank: index + 1 }] : [];
  });

  const inactiveStatColumns: LeaderboardColumn[] = leaderboardStatColumns
    .filter((stat) => !activeSortKeySet.has(`stat:${stat.key}`))
    .map((stat) => ({ kind: 'stat' as const, id: stat.key, label: stat.label, rank: null }));

  const inactiveBenchmarkColumns: LeaderboardColumn[] = benchmarks
    .filter((benchmark) => !activeSortKeySet.has(`benchmark:${benchmark.id}`))
    .map((benchmark) => ({ kind: 'benchmark' as const, id: benchmark.id, label: benchmark.name, rank: null }));

  const visibleColumns = [...activeColumns, ...inactiveStatColumns, ...inactiveBenchmarkColumns];

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
              Ask for multiple benchmarks or stats, list a few models, or leave the query broad to sort the whole leaderboard by the closest matching criteria.
            </p>
          </div>
          <div className="rounded-[24px] border border-neutral-200 bg-neutral-950 p-6 text-white shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Current dataset</div>
            <div className="mt-4 text-4xl font-bold">{models.length}</div>
            <div className="mt-1 text-sm text-white/65">models with benchmark and derived score coverage</div>
            {loadError && <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{loadError}</div>}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm flex flex-col mb-4">
          <form onSubmit={handleSearch} className="p-4 flex flex-col gap-3 bg-neutral-50 rounded-xl lg:flex-row lg:items-center">
            <Search className="text-neutral-400" size={20} />
            <input 
              type="text" 
              placeholder='Try: "high human understanding, high browsecomp, gemini only" or "best for day trading"' 
              className="bg-transparent border-none outline-none w-full text-neutral-700"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              disabled={isSearching}
            />
            <label className="flex items-center gap-2 whitespace-nowrap text-sm text-neutral-600 lg:ml-auto">
              <span>AI search model</span>
              <select
                value={searchModel}
                onChange={(e) => setSearchModel(e.target.value)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-500"
                disabled={isSearching}
              >
                {LEADERBOARD_SEARCH_MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button 
              type="submit" 
              disabled={isSearching}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : "Search"}
            </button>
          </form>
        </div>

        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setModelDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:border-neutral-400 transition-colors shadow-sm"
            >
              <span>Filter models{selectedModelIds.size > 0 ? ` (${selectedModelIds.size})` : ''}</span>
              <ChevronDown size={14} />
            </button>
            {modelDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-neutral-200 rounded-xl shadow-xl z-50">
                <div className="p-2 border-b border-neutral-100">
                  <input
                    type="text"
                    placeholder="Search models…"
                    className="w-full px-3 py-1.5 text-sm border border-neutral-200 rounded-lg outline-none focus:border-blue-400"
                    value={modelSearch}
                    onChange={e => setModelSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <ul className="max-h-72 overflow-y-auto">
                  {models
                    .filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()) || (m.subtitle || '').toLowerCase().includes(modelSearch.toLowerCase()))
                    .map(m => (
                      <li
                        key={m.id}
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer"
                        onClick={() => toggleModel(m.id)}
                      >
                        <span className={`flex-shrink-0 flex h-4 w-4 items-center justify-center rounded border ${selectedModelIds.has(m.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-neutral-300'}`}>
                          {selectedModelIds.has(m.id) && <span className="text-[10px]">✓</span>}
                        </span>
                        <span className="truncate">{m.name}</span>
                        <span className="ml-auto text-xs text-neutral-400 flex-shrink-0">{m.subtitle}</span>
                      </li>
                    ))}
                </ul>
                {selectedModelIds.size > 0 && (
                  <div className="p-2 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => { setSelectedModelIds(new Set()); setModelSearch(''); }}
                      className="w-full text-xs text-red-600 hover:text-red-700 py-1"
                    >
                      Clear selection
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedModelIds.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {[...selectedModelIds].map((id: string) => {
                const m = models.find(model => model.id === id);
                return m ? (
                  <span key={id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-200">
                    {m.name}
                    <X size={12} className="cursor-pointer hover:text-blue-900" onClick={() => toggleModel(id)} />
                  </span>
                ) : null;
              })}
            </div>
          )}

          {searchFilterLabel && (
            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full border border-purple-200">
              Search filter: {searchFilterLabel} ({searchFilteredCount} models)
              <X size={12} className="cursor-pointer hover:text-purple-900" onClick={() => { setSearchFilterLabel(null); handleClearSearch(); }} />
            </span>
          )}
        </div>

        {activeColumns.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 flex items-center gap-2">
            <span className="font-semibold">Sorted by:</span>
            <span>{activeColumns.map((column) => `${column.rank}. ${column.label}`).join(' -> ')}</span>
          </div>
        )}

        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-neutral-100 shadow-sm">
                <tr>
                  <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200 sticky left-0 bg-neutral-100 z-10">Model</th>
                  {visibleColumns.map(column => {
                    const isActive = column.rank !== null;
                    const headerClassName = column.kind === 'stat'
                      ? isActive
                        ? 'bg-blue-100 text-blue-900 border-b border-r border-blue-200'
                        : 'text-red-900 border-b border-r border-red-300 bg-red-100/40'
                      : isActive
                        ? 'bg-blue-100 text-blue-900 border-b border-blue-200'
                        : 'text-neutral-600 border-b border-neutral-200';

                    return (
                      <th key={`${column.kind}:${column.id}`} className={`p-4 text-sm font-semibold whitespace-nowrap ${headerClassName}`}>
                        <div className="flex items-center gap-2">
                          <span>{column.label}</span>
                          {isActive && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1.5 text-[10px] font-bold text-white">
                              {column.rank}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
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
                    {visibleColumns.map(column => {
                      const isActive = column.rank !== null;
                      if (column.kind === 'stat') {
                        return (
                          <td
                            key={`${column.kind}:${column.id}`}
                            className={`p-4 whitespace-nowrap border-r ${isActive ? 'border-blue-200 bg-blue-50 font-semibold text-blue-950' : 'border-red-300 bg-red-50/45 text-red-900 font-semibold'}`}
                          >
                            {renderStatValue(model, column.id)}
                          </td>
                        );
                      }

                      return (
                        <td key={`${column.kind}:${column.id}`} className={`p-4 whitespace-nowrap ${isActive ? 'bg-blue-50 font-semibold text-blue-950' : ''}`}>
                          {model.scores[column.id] || '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {filteredModels.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-8 text-center text-neutral-500">
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
