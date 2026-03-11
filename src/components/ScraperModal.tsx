import React, { useState, useRef, useEffect } from 'react';
import { Model, Benchmark } from '../types';
import { scrapeBenchmarksForModel } from '../services/geminiService';
import { Loader2, Check, X, Sparkles, Play, Square, Terminal } from 'lucide-react';
import { ParallelTerminal } from './ParallelTerminal';

export const ScraperModal = ({ 
  isOpen, 
  onClose, 
  models, 
  benchmarks, 
  onApply,
  getModels,
  getBenchmarks,
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  models: Model[], 
  benchmarks: Benchmark[],
  onApply: (modelId: string, newScores: Record<string, string>) => void | Promise<void>,
  getModels: () => Model[],
  getBenchmarks: () => Benchmark[],
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<Record<string, string> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [mode, setMode] = useState<'manual' | 'auto' | 'parallel'>('manual');
  const [isAutoScraping, setIsAutoScraping] = useState(false);
  const [autoScrapePriorityInput, setAutoScrapePriorityInput] = useState('');
  const [logs, setLogs] = useState<{time: string, message: string, type: 'info'|'success'|'error'}[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

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
    if (
      second &&
      second.extraTokenCount === best.extraTokenCount &&
      second.modelNameLength === best.modelNameLength
    ) {
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

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!isOpen) return null;

  const selectedModel = models.find(m => m.id === selectedModelId);

  const addLog = (message: string, type: 'info'|'success'|'error' = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message, type }]);
  };

  const handleScrape = async () => {
    if (!selectedModel) return;
    setIsScraping(true);
    setScrapedData(null);
    
    abortControllerRef.current = new AbortController();
    
    try {
      const scores = await scrapeBenchmarksForModel(selectedModel.name, benchmarks, abortControllerRef.current.signal);
      setScrapedData(scores);
    } catch (e: any) {
      console.error("Scrape error:", e);
      if (e.message !== 'Aborted') {
        alert(`Failed to scrape: ${e.message}`);
      }
    } finally {
      setIsScraping(false);
    }
  };

  const handleAutoScrape = async () => {
    setIsAutoScraping(true);
    setLogs([]);
    const { queue, prioritizedModels, recognizedEntries, unmatchedQueries, remainingUnfinishedCount } = buildAutoScrapeQueue();

    if (queue.length === 0) {
      addLog("No models to scrape. Add priority lines or ensure there are unfinished models.", "error");
      setIsAutoScraping(false);
      return;
    }

    addLog(`Starting auto-scrape for ${queue.length} models.`, "info");
    if (recognizedEntries.length > 0) {
      addLog(`Recognized ${recognizedEntries.length} model(s) from your priority list:`, "info");
      recognizedEntries.forEach(({ query, model }) => {
        addLog(`- "${query}" -> ${model.name}`, "success");
      });
    }
    if (unmatchedQueries.length > 0) {
      addLog(`Unmatched entries: ${unmatchedQueries.join(', ')}`, "error");
    }
    if (prioritizedModels.length > 0) {
      addLog(`Scraping recognized models first (${prioritizedModels.length}).`, "info");
    }
    if (remainingUnfinishedCount > 0) {
      addLog(`Then continuing with ${remainingUnfinishedCount} unfinished model(s).`, "info");
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    for (const model of queue) {
      if (signal.aborted) {
        addLog("Auto-scrape aborted by user.", "error");
        break;
      }
      
      addLog(`Scraping benchmarks for ${model.name}...`, "info");
      try {
        const scores = await scrapeBenchmarksForModel(model.name, benchmarks, signal);
        if (signal.aborted) break;
        
        await onApply(model.id, scores);
        addLog(`Successfully updated ${model.name}.`, "success");
        
        // Add a small delay between requests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e: any) {
        if (e.message === 'Aborted') {
          addLog("Auto-scrape aborted by user.", "error");
          break;
        }
        addLog(`Failed to scrape ${model.name}: ${e.message}`, "error");
      }
    }
    
    if (!signal.aborted) {
      addLog("Auto-scrape completed for all models!", "success");
    }
    setIsAutoScraping(false);
  };

  const stopAutoScrape = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAutoScraping(false);
  };

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full overflow-hidden flex flex-col max-h-[90vh] ${mode === 'parallel' ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <div className="p-6 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
          <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="text-purple-500"/> AI Benchmark Scraper</h2>
          <button onClick={handleClose} className="text-neutral-500 hover:text-neutral-900"><X size={20}/></button>
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
            Auto Scrape All
          </button>
          <button 
            className={`pb-3 px-2 font-medium text-sm transition-colors ${mode === 'parallel' ? 'border-b-2 border-purple-600 text-purple-700' : 'text-neutral-500 hover:text-neutral-800'}`}
            onClick={() => setMode('parallel')}
          >
            ⚡ Parallel Terminal
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {mode === 'manual' && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Select Model to Scrape</label>
                <div className="flex gap-3">
                  <select 
                    className="flex-1 p-3 border border-neutral-300 rounded-xl bg-white"
                    value={selectedModelId}
                    onChange={e => { setSelectedModelId(e.target.value); setScrapedData(null); }}
                  >
                    <option value="">-- Select a model --</option>
                    {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <button 
                    onClick={handleScrape}
                    disabled={!selectedModelId || isScraping}
                    className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isScraping ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                    Scrape
                  </button>
                </div>
              </div>

              {scrapedData && selectedModel && (
                <div className="border border-neutral-200 rounded-xl overflow-hidden">
                  <div className="bg-neutral-50 p-3 border-b border-neutral-200 font-semibold text-neutral-700">
                    Proposed Changes (Diff)
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-neutral-100 text-xs uppercase text-neutral-500">
                      <tr>
                        <th className="p-3">Benchmark</th>
                        <th className="p-3">Current</th>
                        <th className="p-3">Scraped</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarks.map(bm => {
                        const current = selectedModel.scores[bm.id] || "—";
                        const scraped = scrapedData[bm.id] || "—";
                        const changed = current !== scraped;
                        
                        return (
                          <tr key={bm.id} className="border-b border-neutral-100">
                            <td className="p-3 font-medium text-sm">{bm.name}</td>
                            <td className={`p-3 text-sm ${changed ? 'text-red-500 line-through opacity-70' : 'text-neutral-600'}`}>{current}</td>
                            <td className={`p-3 text-sm font-bold ${changed ? 'text-green-600' : 'text-neutral-600'}`}>{scraped}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
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

          {mode === 'auto' && (
            <div className="flex flex-col h-full min-h-[300px]">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Priority Models (newline-separated, semantic match)
                </label>
                <textarea
                  value={autoScrapePriorityInput}
                  onChange={e => setAutoScrapePriorityInput(e.target.value)}
                  disabled={isAutoScraping}
                  placeholder={'Examples:\nGPT-5.4 Pro\nQwen 9b\nseed mini'}
                  className="w-full p-3 border border-neutral-300 rounded-xl bg-white text-sm min-h-[100px] disabled:bg-neutral-100"
                />
                <p className="text-xs text-neutral-500 mt-2">
                  Auto scrape runs matched models in this order first, then continues with the next unfinished models.
                </p>
              </div>

              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-neutral-600">
                  Automatically scrape and save benchmark data for prioritized models first, then unfinished models.
                </p>
                {!isAutoScraping ? (
                  <button 
                    onClick={handleAutoScrape}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Play size={16}/> Start Auto Scrape
                  </button>
                ) : (
                  <button 
                    onClick={stopAutoScrape}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 flex items-center gap-2"
                  >
                    <Square size={16}/> Stop
                  </button>
                )}
              </div>

              <div className="flex-1 bg-neutral-900 rounded-xl p-4 font-mono text-sm overflow-y-auto border border-neutral-800 shadow-inner flex flex-col min-h-[250px]">
                <div className="flex items-center gap-2 text-neutral-400 mb-2 pb-2 border-b border-neutral-800">
                  <Terminal size={16} />
                  <span>Scraper Logs</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1">
                  {logs.length === 0 && (
                    <div className="text-neutral-600 italic">Waiting to start...</div>
                  )}
                  {logs.map((log, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-neutral-500 shrink-0">[{log.time}]</span>
                      <span className={
                        log.type === 'error' ? 'text-red-400' : 
                        log.type === 'success' ? 'text-green-400' : 
                        'text-neutral-300'
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-3">
          <button onClick={handleClose} className="px-5 py-2.5 text-neutral-600 font-medium hover:bg-neutral-200 rounded-xl transition-colors">
            {mode === 'auto' && isAutoScraping ? 'Close (Stops scrape)' : 'Close'}
          </button>
          {mode === 'manual' && (
            <button 
              onClick={async () => {
                if (selectedModelId && scrapedData) {
                  await onApply(selectedModelId, scrapedData);
                  handleClose();
                }
              }}
              disabled={!scrapedData}
              className="px-5 py-2.5 bg-green-600 text-white font-medium hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Check size={18}/> Apply & Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
