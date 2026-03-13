import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Model, ModelStats, Benchmark } from '../types';
import { ArrowLeft, Download, Loader2, LogOut, Save, Search, Sparkles, Plus, Trash2 } from 'lucide-react';
import { fetchOpenRouterModels } from '../services/openRouterService';
import { ScraperModal } from '../components/ScraperModal';
import { exportAppState, saveAppState } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminView() {
  const { models: contextModels, setModels: setContextModels, benchmarks: contextBenchmarks, setBenchmarks: setContextBenchmarks } = useAppContext();
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'models' | 'benchmarks' | 'scraper' | 'benchmarks-config' | 'import'>('models');
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [importJson, setImportJson] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Keep refs to always-current models/benchmarks so async callbacks never use stale closures
  const modelsRef = useRef(contextModels);
  const benchmarksRef = useRef(contextBenchmarks);
  useEffect(() => { modelsRef.current = contextModels; }, [contextModels]);
  useEffect(() => { benchmarksRef.current = contextBenchmarks; }, [contextBenchmarks]);

  const persistData = async (models: Model[], benchmarks: Benchmark[]) => {
    await saveAppState({ models, benchmarks });
  };

  const getModels = useCallback(() => modelsRef.current, []);
  const getBenchmarks = useCallback(() => benchmarksRef.current, []);

  const handleFetchOpenRouter = async (mode: 'merge' | 'replace' = 'merge') => {
    setIsLoading(true);
    try {
      const fetched = await fetchOpenRouterModels();
      
      if (mode === 'replace') {
        const existingMap = new Map<string, Model>(contextModels.map(m => [m.id, m]));
        const replaced = fetched.map(fm => {
          const ex = existingMap.get(fm.id);
          if (ex) {
            return { ...fm, scores: { ...fm.scores, ...ex.scores } };
          }
          return fm;
        });
        setContextModels(replaced);
        alert(`Replaced with ${fetched.length} models from OpenRouter (preserved existing scores).`);
      } else {
        // Merge fetched with contextModels
        const existingMap = new Map<string, Model>(contextModels.map(m => [m.id, m]));
        const merged = fetched.map(fm => {
          const ex = existingMap.get(fm.id);
          if (ex) {
            return { ...fm, scores: { ...fm.scores, ...ex.scores }, stats: ex.stats || fm.stats };
          }
          return fm;
        });
        const fetchedIds = new Set(fetched.map(m => m.id));
        const localOnly = contextModels.filter(m => !fetchedIds.has(m.id));
        const final = [...localOnly, ...merged];
        setContextModels(final);
        alert(`Merged ${fetched.length} models from OpenRouter.`);
      }
    } catch (error: any) {
      console.error("Failed to fetch models", error);
      alert(`Failed to fetch models from OpenRouter: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyScrapedScores = useCallback(async (modelId: string, newScores: Record<string, string>) => {
    const currentModels = modelsRef.current;
    const currentBenchmarks = benchmarksRef.current;
    const updatedModels = currentModels.map(m => {
      if (m.id === modelId) {
        return {
          ...m,
          scores: { ...m.scores, ...newScores }
        };
      }
      return m;
    });

    setContextModels(updatedModels);

    try {
      await persistData(updatedModels, currentBenchmarks);
    } catch (e) {
      console.error('Failed to persist scraped scores', e);
    }
  }, [setContextModels]);

  const handlePublish = async () => {
    setPublishStatus(null);
    try {
      await persistData(contextModels, contextBenchmarks);
      setPublishStatus('Published successfully. The live site is now serving this dataset.');
    } catch (e) {
      setPublishStatus(e instanceof Error ? e.message : 'Failed to publish data to server');
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportAppState();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'benchmarks_data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export data');
    }
  };

  const updateStat = (id: string, field: keyof ModelStats, value: number) => {
    setContextModels(prev => prev.map(m => {
      if (m.id === id) {
        return {
          ...m,
          stats: {
            ...(m.stats || { humanUnderstanding: 0, intelligence: 0, speed: 0, frontend: 0, backend: 0, comprehensiveScore: 0, contextLength: 0, pricePer1M: 0 }),
            [field]: value
          }
        };
      }
      return m;
    }));
  };

  const updateBenchmark = (id: string, field: keyof Benchmark, value: string) => {
    setContextBenchmarks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const deleteBenchmark = (id: string) => {
    setContextBenchmarks(prev => prev.filter(b => b.id !== id));
  };

  const addBenchmark = () => {
    const newId = `bench-${Date.now()}`;
    setContextBenchmarks(prev => [...prev, { id: newId, name: 'New Benchmark', subtext1: '', subtext2: '' }]);
  };

  const filteredModels = contextModels.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPossibleScores = contextModels.length * contextBenchmarks.length;
  let filledScores = 0;
  contextModels.forEach(m => {
    contextBenchmarks.forEach(b => {
      if (m.scores[b.id] && m.scores[b.id] !== "—") {
        filledScores++;
      }
    });
  });
  const scrapeProgress = totalPossibleScores > 0 ? Math.round((filledScores / totalPossibleScores) * 100) : 0;

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importJson);
      let newModels = [...contextModels];
      let newBenchmarks = [...contextBenchmarks];
      
      if (parsed.benchmarks_catalog) {
        Object.entries(parsed.benchmarks_catalog).forEach(([key, val]: any) => {
          if (!newBenchmarks.find(b => b.id === key)) {
            newBenchmarks.push({ id: key, name: val.name || key, subtext1: '', subtext2: '' });
          }
        });
      }
      
      if (parsed.models && !Array.isArray(parsed.models)) {
        Object.entries(parsed.models).forEach(([modelName, modelData]: any) => {
          let existingModel = newModels.find(m => m.name.toLowerCase() === modelName.toLowerCase() || m.id === modelName);
          if (!existingModel) {
            existingModel = {
              id: modelName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              name: modelName,
              subtitle: modelData.provider || '',
              scores: {}
            };
            newModels.push(existingModel);
          }
          
          if (modelData.benchmarks) {
            for (const [bk, bv] of Object.entries(modelData.benchmarks)) {
              let strVal = String(bv);
              if (typeof bv === 'number') {
                if (parsed.benchmarks_catalog?.[bk]?.type === 'percentage') {
                  strVal = bv + "%";
                }
                if (!strVal.includes('%') && bv <= 100 && bv > 0 && bv % 1 !== 0) {
                  strVal = bv + "%";
                }
              }
              existingModel.scores[bk] = strVal;
            }
          }
        });
      }

      if (Array.isArray(parsed.models)) {
        parsed.models.forEach((m: any) => {
          const existing = newModels.find(em => em.id === m.id || em.name === m.name);
          if (existing) {
            existing.scores = { ...existing.scores, ...(m.scores || {}) };
            if (m.stats) existing.stats = { ...existing.stats, ...m.stats };
          } else {
            newModels.push(m);
          }
        });
      }
      
      if (Array.isArray(parsed.benchmarks)) {
        parsed.benchmarks.forEach((b: any) => {
          if (!newBenchmarks.find(eb => eb.id === b.id)) {
            newBenchmarks.push(b);
          }
        });
      }

      setContextModels(newModels);
      setContextBenchmarks(newBenchmarks);
      await persistData(newModels, newBenchmarks);
      setImportStatus({ type: 'success', message: 'Import successful! Data merged.' });
    } catch (e: any) {
      setImportStatus({ type: 'error', message: 'Import failed: ' + e.message });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-neutral-500 hover:text-neutral-900 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Model Administration</h1>
              <p className="text-sm text-neutral-500">Protected publishing, benchmark management, and scrape workflows.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('scraper')}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
            >
              <Sparkles size={16} /> AI Scrape Benchmarks
            </button>
            <button
              onClick={() => handleFetchOpenRouter('merge')}
              disabled={isLoading}
              className="flex items-center gap-2 bg-white border border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors whitespace-nowrap"
              title="Add new models from OpenRouter without removing existing ones"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Merge OpenRouter
            </button>
            <button
              onClick={() => {
                if (confirm("This will replace your current model list with the latest from OpenRouter. Existing benchmark scores for matching models will be preserved. Continue?")) {
                  handleFetchOpenRouter('replace');
                }
              }}
              disabled={isLoading}
              className="flex items-center gap-2 bg-white border border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors whitespace-nowrap"
              title="Replace entire list with OpenRouter models"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Sync & Replace
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-white border border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors whitespace-nowrap"
            >
              Export JSON
            </button>
            <button
              onClick={handlePublish}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Save size={16} /> Publish to Site
            </button>
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 bg-white border border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors whitespace-nowrap"
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </div>

        {publishStatus && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${publishStatus.includes('Published successfully') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {publishStatus}
          </div>
        )}

        <div className="flex gap-4 mb-4 border-b border-neutral-200">
          <button 
            className={`pb-2 px-1 font-medium text-sm transition-colors ${activeTab === 'models' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-neutral-500 hover:text-neutral-800'}`}
            onClick={() => setActiveTab('models')}
          >
            Models
          </button>
          <button 
            className={`pb-2 px-1 font-medium text-sm transition-colors ${activeTab === 'benchmarks' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-neutral-500 hover:text-neutral-800'}`}
            onClick={() => setActiveTab('benchmarks')}
          >
            Benchmarks
          </button>
          <button 
            className={`pb-2 px-1 font-medium text-sm transition-colors ${activeTab === 'scraper' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-neutral-500 hover:text-neutral-800'}`}
            onClick={() => setActiveTab('scraper')}
          >
            Scraper
          </button>
          <button 
            className={`pb-2 px-1 font-medium text-sm transition-colors ${activeTab === 'benchmarks-config' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-neutral-500 hover:text-neutral-800'}`}
            onClick={() => setActiveTab('benchmarks-config')}
          >
            Benchmarks to Include
          </button>
          <button 
            className={`pb-2 px-1 font-medium text-sm transition-colors ${activeTab === 'import' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-neutral-500 hover:text-neutral-800'}`}
            onClick={() => setActiveTab('import')}
          >
            Import
          </button>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[75vh] min-h-0">
          {activeTab === 'models' && (
            <>
              <div className="p-4 border-b border-neutral-200 flex items-center gap-3 bg-neutral-50">
                <Search className="text-neutral-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Search models by name or ID..." 
                  className="bg-transparent border-none outline-none w-full text-neutral-700"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <div className="text-sm text-neutral-500 whitespace-nowrap">
                  {filteredModels.length} models
                </div>
              </div>
              
              <div className="overflow-auto flex-1 relative">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-neutral-100 shadow-sm z-10">
                <tr>
                  <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200">Model Name</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200">ID</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200">Intelligence (0-100)</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200">Speed (0-100)</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200">Frontend (0-100)</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200">Backend (0-100)</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200">Context</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200">Price / 1M</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map(model => (
                  <tr key={model.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                    <td className="p-4 font-medium text-neutral-900">
                      <div className="truncate max-w-[200px]" title={model.name}>{model.name}</div>
                    </td>
                    <td className="p-4 text-xs font-mono text-neutral-500">
                      <div className="truncate max-w-[150px]" title={model.id}>{model.id}</div>
                    </td>
                    <td className="p-4">
                      <input 
                        type="number" 
                        value={Math.round(model.stats?.intelligence || 0)} 
                        onChange={e => updateStat(model.id, 'intelligence', Number(e.target.value))}
                        className="w-20 p-1.5 border border-neutral-300 rounded text-sm text-right"
                      />
                    </td>
                    <td className="p-4">
                      <input 
                        type="number" 
                        value={Math.round(model.stats?.speed || 0)} 
                        onChange={e => updateStat(model.id, 'speed', Number(e.target.value))}
                        className="w-20 p-1.5 border border-neutral-300 rounded text-sm text-right"
                      />
                    </td>
                    <td className="p-4">
                      <input 
                        type="number" 
                        value={Math.round(model.stats?.frontend || 0)} 
                        onChange={e => updateStat(model.id, 'frontend', Number(e.target.value))}
                        className="w-20 p-1.5 border border-neutral-300 rounded text-sm text-right"
                      />
                    </td>
                    <td className="p-4">
                      <input 
                        type="number" 
                        value={Math.round(model.stats?.backend || 0)} 
                        onChange={e => updateStat(model.id, 'backend', Number(e.target.value))}
                        className="w-20 p-1.5 border border-neutral-300 rounded text-sm text-right"
                      />
                    </td>
                    <td className="p-4">
                      <input 
                        type="number" 
                        value={model.stats?.contextLength || 0} 
                        onChange={e => updateStat(model.id, 'contextLength', Number(e.target.value))}
                        className="w-24 p-1.5 border border-neutral-300 rounded text-sm text-right"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <span className="text-neutral-500 mr-1">$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          value={model.stats?.pricePer1M?.toFixed(2) || 0} 
                          onChange={e => updateStat(model.id, 'pricePer1M', Number(e.target.value))}
                          className="w-20 p-1.5 border border-neutral-300 rounded text-sm text-right"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredModels.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-500">
                      No models found. Try loading from OpenRouter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </>
          )}

          {activeTab === 'benchmarks' && (
            <>
              <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Search className="text-neutral-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search models by name or ID..." 
                    className="bg-transparent border-none outline-none w-full md:w-64 text-neutral-700"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <div className="text-sm text-neutral-500 whitespace-nowrap">
                    {filteredModels.length} models
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="text-sm font-medium text-neutral-700 whitespace-nowrap">
                    Scraping Progress: {filledScores} / {totalPossibleScores}
                  </div>
                  <div className="w-32 md:w-48 bg-neutral-200 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-purple-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${scrapeProgress}%` }}></div>
                  </div>
                  <div className="text-sm font-bold text-purple-700">{scrapeProgress}%</div>
                </div>
              </div>
              <div className="overflow-auto flex-1 relative">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-neutral-100 shadow-sm z-10">
                    <tr>
                      <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200 sticky left-0 bg-neutral-100 z-20">Model</th>
                      {contextBenchmarks.map(b => (
                        <th key={b.id} className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200 whitespace-nowrap">
                          {b.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModels.map((model, idx) => (
                      <tr key={model.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 font-medium text-neutral-900 sticky left-0 bg-white z-10 border-r border-neutral-100">
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-400 font-mono text-xs w-4">{idx + 1}.</span>
                            {model.name}
                          </div>
                        </td>
                        {contextBenchmarks.map(b => {
                          const score = model.scores[b.id];
                          const isFilled = score && score !== "—";
                          return (
                            <td key={b.id} className={`p-4 whitespace-nowrap ${isFilled ? 'text-neutral-900 font-medium' : 'text-neutral-400'}`}>
                              {score || "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {filteredModels.length === 0 && (
                      <tr>
                        <td colSpan={contextBenchmarks.length + 1} className="p-8 text-center text-neutral-500">
                          No models found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'benchmarks-config' && (
            <div className="overflow-auto flex-1 relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-neutral-100 shadow-sm z-10">
                  <tr>
                    <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200">ID</th>
                    <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200">Name</th>
                    <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200">Subtext 1</th>
                    <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200">Subtext 2</th>
                    <th className="p-4 text-sm font-semibold text-neutral-600 border-b border-neutral-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contextBenchmarks.map(bm => (
                    <tr key={bm.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                      <td className="p-4 text-xs font-mono text-neutral-500">{bm.id}</td>
                      <td className="p-4 font-medium text-neutral-900">
                        <input 
                          type="text" 
                          value={bm.name} 
                          onChange={e => updateBenchmark(bm.id, 'name', e.target.value)}
                          className="w-full p-1.5 border border-transparent hover:border-neutral-300 focus:border-blue-500 rounded text-sm bg-transparent focus:bg-white"
                        />
                      </td>
                      <td className="p-4">
                        <textarea 
                          value={bm.subtext1} 
                          onChange={e => updateBenchmark(bm.id, 'subtext1', e.target.value)}
                          className="w-full p-1.5 border border-transparent hover:border-neutral-300 focus:border-blue-500 rounded text-sm bg-transparent focus:bg-white resize-none"
                          rows={2}
                        />
                      </td>
                      <td className="p-4">
                        <textarea 
                          value={bm.subtext2} 
                          onChange={e => updateBenchmark(bm.id, 'subtext2', e.target.value)}
                          className="w-full p-1.5 border border-transparent hover:border-neutral-300 focus:border-blue-500 rounded text-sm bg-transparent focus:bg-white resize-none"
                          rows={2}
                        />
                      </td>
                      <td className="p-4">
                        <button onClick={() => deleteBenchmark(bm.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 border-t border-neutral-200 bg-neutral-50">
                <button onClick={addBenchmark} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
                  <Plus size={16} /> Add Benchmark
                </button>
              </div>
            </div>
          )}

          {activeTab === 'scraper' && (
            <div className="p-4 md:p-6 overflow-hidden flex-1 min-h-0 bg-neutral-50">
              <ScraperModal
                embedded
                isOpen={true}
                onClose={() => setActiveTab('models')}
                models={contextModels}
                benchmarks={contextBenchmarks}
                onApply={handleApplyScrapedScores}
                getModels={getModels}
                getBenchmarks={getBenchmarks}
              />
            </div>
          )}
          {activeTab === 'import' && (
            <div className="flex-1 flex flex-col p-6 min-h-0 bg-white">
              <h2 className="text-lg font-semibold mb-4">Import Data</h2>
              <p className="text-sm text-neutral-600 mb-4">
                Paste JSON data below. This will merge the new scores with existing models and keep all old values (like the current Gemini 2.5 Pro scores).
              </p>
              <textarea
                className="w-full flex-1 border border-neutral-300 rounded p-3 font-mono text-sm leading-relaxed mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Paste JSON here..."
                value={importJson}
                onChange={e => setImportJson(e.target.value)}
              />
              <div className="flex items-center gap-4">
                <button
                  onClick={handleImport}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition-colors"
                >
                  Merge and Save
                </button>
                {importStatus && (
                  <span className={`text-sm font-medium ${importStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {importStatus.message}
                  </span>
                )}
              </div>
            </div>
          )}        </div>
      </div>
    </div>
  );
}
