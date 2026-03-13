import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Model, Benchmark } from '../types';
import { scrapeBenchmarksForModel } from '../services/geminiService';
import { Loader2, Check, X, Sparkles, Play, Square, Terminal, Pause, ChevronDown, ChevronUp } from 'lucide-react';
import { ParallelTerminal } from './ParallelTerminal';

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface ScrapeHistoryEntry {
  id: string;
  modelId: string;
  modelName: string;
  mode: 'manual' | 'auto';
  savedAt: string;
  previousScores: Record<string, string>;
  scores: Record<string, string>;
  filledCount: number;
}

export const ScraperModal = ({
  isOpen,
  onClose,
  models,
  benchmarks,
  onApply,
  getModels,
  getBenchmarks,
  embedded = false,
}: {
  isOpen: boolean,
  onClose: () => void,
  models: Model[],
  benchmarks: Benchmark[],
  onApply: (modelId: string, newScores: Record<string, string>) => void | Promise<void>,
  getModels: () => Model[],
  getBenchmarks: () => Benchmark[],
  embedded?: boolean,
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<Record<string, string> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [mode, setMode] = useState<'manual' | 'auto' | 'parallel'>('manual');
  const [autoStatus, setAutoStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [autoScrapePriorityInput, setAutoScrapePriorityInput] = useState('');
  const [autoQueue, setAutoQueue] = useState<Model[]>([]);
  const [autoIndex, setAutoIndex] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scrapeHistory, setScrapeHistory] = useState<ScrapeHistoryEntry[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const logsEndRef = useRef<HTMLDivElement>(null);
  const haltRequestedRef = useRef(false);

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const tokenize = (value: string) => {
    const normalized = normalizeText(value);
    return normalized ? normalized.split(' ') : [];
  };

  const getModelTokenSet = (model: Model) => new Set([...tokenize(model.name), ...tokenize(model.id)]);

  const getQueryTokens = (query: string) => {
    const rawTokens = tokenize(query);
    if (rawTokens.length === 0) return [];

    const significant = rawTokens.filter((token) => token.length >= 3 || /\d/.test(token));
    return significant.length > 0 ? significant : rawTokens;
  };

  const isUnfinishedModel = (model: Model) => {
    return benchmarks.some((benchmark) => {
      const score = model.scores?.[benchmark.id];
      return !score || score === '—';
    });
  };

  const matchModelFromQuery = (query: string, usedIds: Set<string>) => {
    const queryNorm = normalizeText(query);
    if (!queryNorm) return null;

    const availableModels = models.filter((model) => !usedIds.has(model.id));

    const exact = availableModels.find((model) => {
      const nameNorm = normalizeText(model.name);
      const idNorm = normalizeText(model.id);
      return queryNorm === nameNorm || queryNorm === idNorm;
    });
    if (exact) return exact;

    const strictPrefix = availableModels.find((model) => {
      const nameNorm = normalizeText(model.name);
      const idNorm = normalizeText(model.id);
      if (queryNorm.length < 4) return false;
      return nameNorm.startsWith(queryNorm) || idNorm.startsWith(queryNorm);
    });
    if (strictPrefix) return strictPrefix;

    const queryTokens = getQueryTokens(query);
    if (queryTokens.length === 0) return null;

    const candidates = availableModels
      .map((model) => {
        const tokenSet = getModelTokenSet(model);
        const allTokensPresent = queryTokens.every((token) => tokenSet.has(token));
        if (!allTokensPresent) return null;

        const extraTokenCount = Math.max(0, tokenSet.size - queryTokens.length);
        const modelNameLength = model.name.length;
        return { model, extraTokenCount, modelNameLength };
      })
      .filter((entry): entry is { model: Model; extraTokenCount: number; modelNameLength: number } => entry !== null)
      .sort((a, b) => {
        if (a.extraTokenCount !== b.extraTokenCount) return a.extraTokenCount - b.extraTokenCount;
        return a.modelNameLength - b.modelNameLength;
      });

    if (candidates.length === 0) return null;

    const [best, second] = candidates;
    if (second && second.extraTokenCount === best.extraTokenCount && second.modelNameLength === best.modelNameLength) {
      return null;
    }

    return best.model;
  };

  const buildAutoScrapeQueue = () => {
    const requestedLines = autoScrapePriorityInput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const usedIds = new Set<string>();
    const prioritizedModels: Model[] = [];
    const unmatchedQueries: string[] = [];
    const recognizedEntries: { query: string; model: Model }[] = [];

    requestedLines.forEach((query) => {
      const matched = matchModelFromQuery(query, usedIds);
      if (!matched) {
        unmatchedQueries.push(query);
        return;
      }
      usedIds.add(matched.id);
      prioritizedModels.push(matched);
      recognizedEntries.push({ query, model: matched });
    });

    const remainingUnfinished = models.filter((model) => !usedIds.has(model.id) && isUnfinishedModel(model));
    return {
      queue: [...prioritizedModels, ...remainingUnfinished],
      prioritizedModels,
      recognizedEntries,
      unmatchedQueries,
      remainingUnfinishedCount: remainingUnfinished.length,
    };
  };

  const selectedModel = useMemo(() => models.find((model) => model.id === selectedModelId), [models, selectedModelId]);
  const scrapedBenchmarkCount = scrapedData ? Object.values(scrapedData).filter((value) => value && value !== '—').length : 0;
  const scrapedBenchmarks = useMemo(() => {
    if (!selectedModel || !scrapedData) return [];
    return benchmarks.filter((benchmark) => scrapedData[benchmark.id]);
  }, [benchmarks, scrapedData, selectedModel]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString(), message, type }]);
  };

  const recordHistory = (entry: Omit<ScrapeHistoryEntry, 'id' | 'savedAt' | 'filledCount'>) => {
    const id = `${entry.modelId}-${Date.now()}`;
    const filledCount = Object.values(entry.scores).filter((value) => value && value !== '—').length;
    setExpandedHistory((prev) => ({ ...prev, [id]: false }));
    setScrapeHistory((prev) => [
      {
        ...entry,
        id,
        filledCount,
        savedAt: new Date().toLocaleString(),
      },
      ...prev,
    ]);
  };

  const toggleHistoryEntry = (entryId: string) => {
    setExpandedHistory((prev) => ({ ...prev, [entryId]: !prev[entryId] }));
  };

  const runManualScrape = async () => {
    if (!selectedModel) return;
    setIsScraping(true);
    setScrapedData(null);
    abortControllerRef.current = new AbortController();

    try {
      const scores = await scrapeBenchmarksForModel(
        selectedModel.name,
        benchmarks,
        abortControllerRef.current.signal,
        selectedModel.id,
        (attempt, delayMs) => {
          addLog(`Rate limited while scraping ${selectedModel.name}. Retry ${attempt} in ${Math.round(delayMs / 1000)}s.`, 'error');
        },
      );
      setScrapedData(scores);
      if (Object.keys(scores).length === 0) {
        addLog(`No public benchmark matches found for ${selectedModel.name}.`, 'info');
      }
    } catch (error: any) {
      console.error('Scrape error:', error);
      if (error.message !== 'Aborted') {
        alert(`Failed to scrape: ${error.message}`);
      }
    } finally {
      setIsScraping(false);
    }
  };

  const saveManualScrape = async () => {
    if (!selectedModel || !scrapedData || Object.keys(scrapedData).length === 0) return;
    const previousScores = { ...selectedModel.scores };
    await onApply(selectedModel.id, scrapedData);
    recordHistory({
      modelId: selectedModel.id,
      modelName: selectedModel.name,
      mode: 'manual',
      previousScores,
      scores: scrapedData,
    });
  };

  const runAutoScrape = async (queue: Model[], startIndex: number) => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    for (let index = startIndex; index < queue.length; index += 1) {
      const model = queue[index];
      setAutoIndex(index);

      if (signal.aborted) {
        break;
      }

      addLog(`Scraping benchmarks for ${model.name}...`, 'info');
      try {
        const liveModel = getModels().find((entry) => entry.id === model.id) ?? model;
        const previousScores = { ...liveModel.scores };
        const scores = await scrapeBenchmarksForModel(
          model.name,
          getBenchmarks(),
          signal,
          model.id,
          (attempt, delayMs) => {
            addLog(`Rate limited on ${model.name}. Retry ${attempt} in ${Math.round(delayMs / 1000)}s.`, 'error');
          },
        );
        if (signal.aborted) {
          break;
        }

        if (Object.keys(scores).length === 0) {
          addLog(`No public benchmark matches found for ${model.name}.`, 'info');
          setAutoIndex(index + 1);
          await new Promise((resolve) => setTimeout(resolve, 750));
          continue;
        }

        await onApply(model.id, scores);
        recordHistory({
          modelId: model.id,
          modelName: model.name,
          mode: 'auto',
          previousScores,
          scores,
        });
        addLog(`Saved ${model.name}.`, 'success');
        setAutoIndex(index + 1);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error: any) {
        if (signal.aborted || error.message === 'Aborted') {
          break;
        }
        addLog(`Failed to scrape ${model.name}: ${error.message}`, 'error');
      }
    }

    if (haltRequestedRef.current) {
      haltRequestedRef.current = false;
      setAutoQueue([]);
      setAutoIndex(0);
      setAutoStatus('idle');
      addLog('Auto-scrape halted and queue cleared.', 'error');
      return;
    }

    if (signal.aborted) {
      setAutoStatus('paused');
      addLog('Auto-scrape paused. Resume will continue from the next model.', 'info');
      return;
    }

    setAutoIndex(queue.length);
    setAutoStatus('completed');
    addLog('Auto-scrape completed for all queued models.', 'success');
  };

  const handleStartAutoScrape = async () => {
    if (autoStatus === 'running') return;

    if (autoStatus === 'paused' && autoQueue.length > 0) {
      setAutoStatus('running');
      addLog(`Resuming auto-scrape at model ${autoIndex + 1} of ${autoQueue.length}.`, 'info');
      await runAutoScrape(autoQueue, autoIndex);
      return;
    }

    setLogs([]);
    const { queue, prioritizedModels, recognizedEntries, unmatchedQueries, remainingUnfinishedCount } = buildAutoScrapeQueue();
    if (queue.length === 0) {
      addLog('No models to scrape. Add priority lines or ensure there are unfinished models.', 'error');
      return;
    }

    setAutoQueue(queue);
    setAutoIndex(0);
    setAutoStatus('running');

    addLog(`Starting auto-scrape for ${queue.length} models.`, 'info');
    if (recognizedEntries.length > 0) {
      addLog(`Recognized ${recognizedEntries.length} model(s) from your priority list.`, 'info');
      recognizedEntries.forEach(({ query, model }) => addLog(`"${query}" -> ${model.name}`, 'success'));
    }
    if (unmatchedQueries.length > 0) {
      addLog(`Unmatched entries: ${unmatchedQueries.join(', ')}`, 'error');
    }
    if (prioritizedModels.length > 0) {
      addLog(`Scraping prioritized models first (${prioritizedModels.length}).`, 'info');
    }
    if (remainingUnfinishedCount > 0) {
      addLog(`Continuing with ${remainingUnfinishedCount} unfinished model(s).`, 'info');
    }

    await runAutoScrape(queue, 0);
  };

  const handlePauseAutoScrape = () => {
    if (autoStatus !== 'running') return;
    haltRequestedRef.current = false;
    abortControllerRef.current?.abort();
  };

  const handleHaltAutoScrape = () => {
    // Immediate abort of current fetch
    abortControllerRef.current?.abort();
    
    if (autoStatus === 'running') {
      haltRequestedRef.current = true;
      return;
    }

    setAutoQueue([]);
    setAutoIndex(0);
    setAutoStatus('idle');
    addLog('Auto-scrape halted and queue cleared.', 'error');
  };

  const handleClose = () => {
    abortControllerRef.current?.abort();
    onClose();
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (!embedded && !isOpen) {
      abortControllerRef.current?.abort();
    }
  }, [embedded, isOpen]);

  if (!embedded && !isOpen) return null;

  const autoCompleted = autoQueue.length > 0 ? Math.min(autoIndex, autoQueue.length) : 0;
  const autoProgressPercent = autoQueue.length > 0 ? Math.round((autoCompleted / autoQueue.length) * 100) : 0;

  const chrome = (
    <div className={`bg-white ${embedded ? 'h-full min-h-0 overflow-hidden rounded-xl border border-neutral-200 shadow-sm flex flex-col' : `rounded-2xl shadow-xl w-full overflow-hidden flex flex-col max-h-[90vh] ${mode === 'parallel' ? 'max-w-5xl' : 'max-w-6xl'}`}`}>
      <div className="p-6 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-neutral-900">
            <Sparkles className="text-purple-500" size={20} />
            AI Benchmark Scraper
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Scrape, pause, halt, and inspect saved benchmark pulls model by model.
          </p>
        </div>
        {!embedded && (
          <button onClick={handleClose} className="text-neutral-500 hover:text-neutral-900">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex border-b border-neutral-200 bg-neutral-50 px-6 pt-2 gap-4">
        <button
          className={`pb-3 px-2 font-medium text-sm transition-colors ${mode === 'manual' ? 'border-b-2 border-purple-600 text-purple-700' : 'text-neutral-500 hover:text-neutral-800'}`}
          onClick={() => setMode('manual')}
        >
          Manual Scrape
        </button>
        <button
          className={`pb-3 px-2 font-medium text-sm transition-colors ${mode === 'auto' ? 'border-b-2 border-purple-600 text-purple-700' : 'text-neutral-500 hover:text-neutral-800'}`}
          onClick={() => setMode('auto')}
        >
          Auto Scrape
        </button>
        <button
          className={`pb-3 px-2 font-medium text-sm transition-colors ${mode === 'parallel' ? 'border-b-2 border-purple-600 text-purple-700' : 'text-neutral-500 hover:text-neutral-800'}`}
          onClick={() => setMode('parallel')}
        >
          Parallel Terminal
        </button>
      </div>

      <div className={`flex-1 min-h-0 ${mode === 'parallel' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <div className={`grid gap-6 p-6 h-full min-h-0 ${mode === 'parallel' ? 'grid-cols-1' : 'lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]'}`}>
          <div className="min-w-0 min-h-0">
            {mode === 'manual' && (
              <div className="space-y-6 overflow-y-auto h-full pr-1">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Select Model to Scrape</label>
                  <div className="flex gap-3">
                    <select
                      className="flex-1 p-3 border border-neutral-300 rounded-xl bg-white"
                      value={selectedModelId}
                      onChange={(event) => {
                        setSelectedModelId(event.target.value);
                        setScrapedData(null);
                      }}
                    >
                      <option value="">-- Select a model --</option>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={runManualScrape}
                      disabled={!selectedModelId || isScraping}
                      className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isScraping ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                      Scrape
                    </button>
                  </div>
                </div>

                {scrapedData && selectedModel && (
                  <div className="border border-neutral-200 rounded-xl overflow-hidden">
                    <div className="bg-neutral-50 p-3 border-b border-neutral-200 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-neutral-700">Pulled Benchmarks</div>
                        <div className="text-xs text-neutral-500">
                          {scrapedBenchmarkCount > 0
                            ? `Previewing ${scrapedBenchmarkCount} benchmark${scrapedBenchmarkCount === 1 ? '' : 's'} found for ${selectedModel.name}`
                            : `No public benchmark matches were found for ${selectedModel.name}`}
                        </div>
                      </div>
                      {scrapedBenchmarkCount > 0 && (
                        <button
                          onClick={saveManualScrape}
                          className="px-4 py-2 bg-green-600 text-white font-medium hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Check size={16} /> Apply & Save
                        </button>
                      )}
                    </div>
                    {scrapedBenchmarkCount > 0 ? (
                      <table className="w-full text-left">
                        <thead className="bg-neutral-100 text-xs uppercase text-neutral-500">
                          <tr>
                            <th className="p-3">Benchmark</th>
                            <th className="p-3">Current</th>
                            <th className="p-3">Pulled</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scrapedBenchmarks.map((benchmark) => {
                            const current = selectedModel.scores[benchmark.id] || '—';
                            const scraped = scrapedData[benchmark.id] || '—';
                            const changed = current !== scraped;
                            return (
                              <tr key={benchmark.id} className="border-b border-neutral-100">
                                <td className="p-3 font-medium text-sm">{benchmark.name}</td>
                                <td className={`p-3 text-sm ${changed ? 'text-red-500 line-through opacity-70' : 'text-neutral-600'}`}>{current}</td>
                                <td className={`p-3 text-sm font-bold ${changed ? 'text-green-600' : 'text-neutral-600'}`}>{scraped}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-sm text-neutral-500">
                        The hybrid scraper only saves benchmarks it can verify from public sources. Missing benchmarks are omitted.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {mode === 'auto' && (
              <div className="flex flex-col h-full min-h-[420px] gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Priority Models (newline-separated, semantic match)
                  </label>
                  <textarea
                    value={autoScrapePriorityInput}
                    onChange={(event) => setAutoScrapePriorityInput(event.target.value)}
                    disabled={autoStatus === 'running'}
                    placeholder={'Examples:\nGPT-5.4 Pro\nQwen 9b\nseed mini'}
                    className="w-full p-3 border border-neutral-300 rounded-xl bg-white text-sm min-h-[100px] disabled:bg-neutral-100"
                  />
                  <div className="flex flex-col gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setAutoScrapePriorityInput(models.map(m => m.id).join('\n'))}
                      className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-lg text-sm font-medium transition-colors w-max"
                      disabled={autoStatus === 'running'}
                    >
                      Queue All Models
                    </button>
                    <p className="text-xs text-neutral-500">
                      Scrapes recognized models first, then keeps going through unfinished models.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-neutral-800">Sequential scraper</div>
                      <div className="text-sm text-neutral-500">
                        Saves every model as soon as the pull completes.
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleStartAutoScrape}
                        disabled={autoStatus === 'running'}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Play size={16} /> {autoStatus === 'paused' ? 'Resume' : 'Scrape'}
                      </button>
                      <button
                        onClick={handlePauseAutoScrape}
                        disabled={autoStatus !== 'running'}
                        className="bg-amber-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Pause size={16} /> Pause
                      </button>
                      <button
                        onClick={handleHaltAutoScrape}
                        disabled={autoStatus === 'idle' && autoQueue.length === 0}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Square size={16} /> Halt
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-purple-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${autoProgressPercent}%` }} />
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-purple-700 whitespace-nowrap">
                      {autoCompleted} / {autoQueue.length || 0}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-neutral-500 whitespace-nowrap">
                      {autoStatus}
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-[400px] bg-neutral-900 rounded-xl p-4 font-mono text-sm overflow-hidden border border-neutral-800 shadow-inner flex flex-col">
                  <div className="flex items-center gap-2 text-neutral-400 mb-2 pb-2 border-b border-neutral-800">
                    <Terminal size={16} />
                    <span>Scraper Logs</span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
                    {logs.length === 0 && (
                      <div className="text-neutral-600 italic">Waiting to start...</div>
                    )}
                    {logs.map((log, index) => (
                      <div key={`${log.time}-${index}`} className="flex gap-3">
                        <span className="text-neutral-500 shrink-0">[{log.time}]</span>
                        <span className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-neutral-300'}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>
            )}

            {mode === 'parallel' && (
              <ParallelTerminal
                models={models}
                benchmarks={benchmarks}
                getModels={getModels}
                getBenchmarks={getBenchmarks}
                onApply={onApply}
              />
            )}
          </div>

          {mode !== 'parallel' && (
            <div className="min-w-0 min-h-0 border border-neutral-200 rounded-xl overflow-hidden bg-white flex flex-col">
              <div className="bg-neutral-50 p-4 border-b border-neutral-200">
                <div className="font-semibold text-neutral-800">Saved Scrape Results</div>
                <div className="text-sm text-neutral-500">
                  Expand any saved model to inspect the pulled benchmarks.
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto max-h-[640px]">
                {scrapeHistory.length === 0 ? (
                  <div className="p-4 text-sm text-neutral-500">No saved scrape results yet.</div>
                ) : (
                  scrapeHistory.map((entry) => {
                    const visibleBenchmarks = benchmarks.filter((benchmark) => entry.scores[benchmark.id]);
                    const isExpanded = !!expandedHistory[entry.id];
                    return (
                      <div key={entry.id} className="border-b border-neutral-100 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => toggleHistoryEntry(entry.id)}
                          className="w-full p-4 text-left hover:bg-neutral-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-neutral-900 truncate">{entry.modelName}</div>
                              <div className="text-xs text-neutral-500 mt-1">
                                {entry.mode} save · {entry.filledCount} pulled · {entry.savedAt}
                              </div>
                            </div>
                            <div className="shrink-0 text-neutral-400">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4">
                            <div className="rounded-lg border border-neutral-200 overflow-hidden">
                              <table className="w-full text-left text-sm">
                                <thead className="bg-neutral-100 text-xs uppercase text-neutral-500">
                                  <tr>
                                    <th className="p-3">Benchmark</th>
                                    <th className="p-3">Previous</th>
                                    <th className="p-3">Pulled</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {visibleBenchmarks.map((benchmark) => {
                                    const previous = entry.previousScores[benchmark.id] || '—';
                                    const pulled = entry.scores[benchmark.id] || '—';
                                    const changed = previous !== pulled;
                                    return (
                                      <tr key={benchmark.id} className="border-t border-neutral-100 first:border-t-0">
                                        <td className="p-3 font-medium text-neutral-900">{benchmark.name}</td>
                                        <td className={`p-3 ${changed ? 'text-red-500 line-through opacity-70' : 'text-neutral-600'}`}>{previous}</td>
                                        <td className={`p-3 font-semibold ${changed ? 'text-green-600' : 'text-neutral-700'}`}>{pulled}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!embedded && (
        <div className="p-6 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-3">
          <button onClick={handleClose} className="px-5 py-2.5 text-neutral-600 font-medium hover:bg-neutral-200 rounded-xl transition-colors">
            Close
          </button>
        </div>
      )}
    </div>
  );

  return embedded ? chrome : <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">{chrome}</div>;
};
