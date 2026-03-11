import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Model, Benchmark } from '../types';
import { scrapeBenchmarksForModel } from '../services/geminiService';

const ANIMAL_POOL = [
  { name: 'wolf', emoji: '🐺', color: '#60a5fa' },
  { name: 'falcon', emoji: '🦅', color: '#f59e0b' },
  { name: 'panther', emoji: '🐆', color: '#a78bfa' },
  { name: 'shark', emoji: '🦈', color: '#34d399' },
  { name: 'bear', emoji: '🐻', color: '#fb923c' },
  { name: 'eagle', emoji: '🦅', color: '#f472b6' },
  { name: 'cobra', emoji: '🐍', color: '#22d3ee' },
  { name: 'tiger', emoji: '🐯', color: '#fbbf24' },
  { name: 'hawk', emoji: '🦅', color: '#e879f9' },
  { name: 'lion', emoji: '🦁', color: '#fb7185' },
];

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'system' | 'progress';
  color?: string;
  prefix?: string;
}

interface Scraper {
  id: string;
  name: string;
  emoji: string;
  color: string;
  queue: Model[];
  completed: number;
  total: number;
  currentModel: string | null;
  abortController: AbortController;
  startTime: number;
  isRunning: boolean;
}

interface ParallelTerminalProps {
  models: Model[];
  benchmarks: Benchmark[];
  getModels: () => Model[];
  getBenchmarks: () => Benchmark[];
  onApply: (modelId: string, newScores: Record<string, string>) => void | Promise<void>;
}

// Shared claimed set so multiple scrapers don't overlap
const claimedModelIds = new Set<string>();

export const ParallelTerminal: React.FC<ParallelTerminalProps> = ({
  models,
  benchmarks,
  getModels,
  getBenchmarks,
  onApply,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [scrapers, setScrapers] = useState(new Map<string, Scraper>());
  const [priorityInput, setPriorityInput] = useState('');
  const scrapersRef = useRef(new Map<string, Scraper>());
  const logsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const usedAnimalIdx = useRef(0);
  const sessionStartTime = useRef<number | null>(null);
  const totalModelsTarget = useRef(0);

  useEffect(() => {
    scrapersRef.current = scrapers;
  }, [scrapers]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Reset claimed set when component mounts
  useEffect(() => {
    claimedModelIds.clear();
    return () => { claimedModelIds.clear(); };
  }, []);

  const addLog = useCallback((entry: Omit<LogEntry, 'time'>) => {
    setLogs(prev => [...prev, { ...entry, time: new Date().toLocaleTimeString() }]);
  }, []);

  const normalizeText = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

  const tokenize = (value: string) => {
    const n = normalizeText(value);
    return n ? n.split(' ') : [];
  };

  const scoreCandidate = (query: string, model: Model) => {
    const qn = normalizeText(query);
    if (!qn) return 0;
    const nn = normalizeText(model.name);
    const idn = normalizeText(model.id);
    if (qn === nn || qn === idn) return 1000;
    if (nn.includes(qn) || idn.includes(qn)) return 800;
    const qt = tokenize(query);
    if (qt.length === 0) return 0;
    const at = [...tokenize(model.name), ...tokenize(model.id)];
    let matched = 0;
    qt.forEach(t => { if (at.some(c => c.includes(t) || t.includes(c))) matched++; });
    const cov = matched / qt.length;
    return cov <= 0 ? 0 : Math.round(cov * 500);
  };

  const matchModel = (query: string, available: Model[], usedIds: Set<string>) => {
    let best: Model | null = null;
    let bestScore = 0;
    available.forEach(m => {
      if (usedIds.has(m.id)) return;
      const s = scoreCandidate(query, m);
      if (s > bestScore) { bestScore = s; best = m; }
    });
    return bestScore >= 250 ? best : null;
  };

  const isUnfinishedModel = (model: Model) => {
    return benchmarks.some(b => {
      const s = model.scores?.[b.id];
      return !s || s === '—';
    });
  };

  const buildQueue = (): Model[] => {
    const lines = priorityInput.split('\n').map(l => l.trim()).filter(Boolean);
    const usedIds = new Set<string>(claimedModelIds);
    const prioritized: Model[] = [];

    lines.forEach(q => {
      const m = matchModel(q, models, usedIds);
      if (m && isUnfinishedModel(m)) {
        usedIds.add(m.id);
        prioritized.push(m);
      }
    });

    const remaining = models.filter(m => !usedIds.has(m.id) && isUnfinishedModel(m));
    return [...prioritized, ...remaining];
  };

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const runScraper = async (scraper: Scraper) => {
    const { signal } = scraper.abortController;

    for (let i = 0; i < scraper.queue.length; i++) {
      if (signal.aborted) {
        addLog({ message: `halted.`, type: 'error', color: scraper.color, prefix: `${scraper.emoji} ${scraper.name}` });
        break;
      }
      const model = scraper.queue[i];

      // Update current model
      setScrapers(prev => {
        const next = new Map<string, Scraper>(prev);
        const s = next.get(scraper.id);
        if (s) next.set(scraper.id, { ...s, currentModel: model.name });
        return next;
      });

      addLog({ message: `scraping ${model.name}...`, type: 'info', color: scraper.color, prefix: `${scraper.emoji} ${scraper.name}` });

      try {
        const scores = await scrapeBenchmarksForModel(model.name, getBenchmarks(), signal);
        if (signal.aborted) break;

        await onApply(model.id, scores);

        const filledCount = Object.values(scores).filter(v => v && v !== '—').length;
        addLog({ message: `✓ ${model.name} — ${filledCount} benchmarks saved`, type: 'success', color: scraper.color, prefix: `${scraper.emoji} ${scraper.name}` });

        setScrapers(prev => {
          const next = new Map<string, Scraper>(prev);
          const s = next.get(scraper.id);
          if (s) next.set(scraper.id, { ...s, completed: s.completed + 1, currentModel: null });
          return next;
        });

        // Rate limit delay
        await new Promise(r => setTimeout(r, 1500));
      } catch (e: any) {
        if (signal.aborted) break;
        addLog({ message: `✗ ${model.name}: ${e.message}`, type: 'error', color: scraper.color, prefix: `${scraper.emoji} ${scraper.name}` });
        // Continue to next model
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!signal.aborted) {
      addLog({ message: `finished all assigned models!`, type: 'success', color: scraper.color, prefix: `${scraper.emoji} ${scraper.name}` });
    }

    setScrapers(prev => {
      const next = new Map<string, Scraper>(prev);
      const s = next.get(scraper.id);
      if (s) next.set(scraper.id, { ...s, isRunning: false, currentModel: null });
      return next;
    });
  };

  const handleSpawnScraper = () => {
    const queue = buildQueue();
    if (queue.length === 0) {
      addLog({ message: 'No unclaimed models left to scrape.', type: 'error' });
      return;
    }

    const animal = ANIMAL_POOL[usedAnimalIdx.current % ANIMAL_POOL.length];
    usedAnimalIdx.current++;

    // Claim models for this scraper
    queue.forEach(m => claimedModelIds.add(m.id));

    if (!sessionStartTime.current) sessionStartTime.current = Date.now();
    totalModelsTarget.current += queue.length;

    const scraper: Scraper = {
      id: `${animal.name}-${Date.now()}`,
      name: animal.name,
      emoji: animal.emoji,
      color: animal.color,
      queue,
      completed: 0,
      total: queue.length,
      currentModel: null,
      abortController: new AbortController(),
      startTime: Date.now(),
      isRunning: true,
    };

    setScrapers(prev => {
      const next = new Map<string, Scraper>(prev);
      next.set(scraper.id, scraper);
      return next;
    });

    addLog({ message: `spawned! Assigned ${queue.length} models.`, type: 'system', color: scraper.color, prefix: `${scraper.emoji} ${scraper.name}` });

    // Clear priority input after spawning since those models are now claimed
    setPriorityInput('');

    // Start the scraper async
    runScraper(scraper);
  };

  const handleHalt = (animalName: string) => {
    const name = animalName.toLowerCase().trim();
    let found = false;
    scrapersRef.current.forEach((s) => {
      if (s.name === name && s.isRunning) {
        s.abortController.abort();
        found = true;
        // Unclaim remaining models
        const remaining = s.queue.slice(s.completed);
        remaining.forEach(m => claimedModelIds.delete(m.id));
      }
    });
    if (!found) {
      addLog({ message: `No running scraper named "${animalName}" found.`, type: 'error' });
    }
  };

  const handleProgress = () => {
    const allScrapers: Scraper[] = Array.from(scrapersRef.current.values());
    if (allScrapers.length === 0) {
      addLog({ message: 'No scrapers have been spawned yet.', type: 'system' });
      return;
    }

    const totalCompleted = allScrapers.reduce((sum, s) => sum + s.completed, 0);
    const totalQueued = allScrapers.reduce((sum, s) => sum + s.total, 0);
    const pct = totalQueued > 0 ? Math.round((totalCompleted / totalQueued) * 100) : 0;

    const elapsed = sessionStartTime.current ? Date.now() - sessionStartTime.current : 0;
    const avgPerModel = totalCompleted > 0 ? elapsed / totalCompleted : 0;
    const remaining = totalQueued - totalCompleted;
    const eta = totalCompleted > 0 ? avgPerModel * remaining : 0;

    const barWidth = 30;
    const filled = Math.round((pct / 100) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

    addLog({ message: `──────────── PROGRESS ────────────`, type: 'system' });
    addLog({ message: `[${bar}] ${pct}%  (${totalCompleted}/${totalQueued} models)`, type: 'progress' });
    addLog({ message: `Elapsed: ${formatDuration(elapsed)}  |  ETA: ${totalCompleted > 0 ? formatDuration(eta) : '...'}`, type: 'system' });

    allScrapers.forEach(s => {
      const sPct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
      const status = s.isRunning ? (s.currentModel ? `working on ${s.currentModel}` : 'idle') : (s.completed === s.total ? 'done' : 'halted');
      addLog({
        message: `${sPct}% (${s.completed}/${s.total}) — ${status}`,
        type: 'info',
        color: s.color,
        prefix: `${s.emoji} ${s.name}`,
      });
    });

    addLog({ message: `──────────────────────────────────`, type: 'system' });
  };

  const processCommand = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Log the command itself
    addLog({ message: `> ${trimmed}`, type: 'system' });

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === 'spawn-scraper' || cmd === 'spawn') {
      handleSpawnScraper();
    } else if (cmd === 'halt' || cmd === 'stop') {
      const name = parts.slice(1).join(' ');
      if (!name) {
        addLog({ message: 'Usage: halt <animal-name>', type: 'error' });
      } else {
        handleHalt(name);
      }
    } else if (cmd === 'progress' || cmd === 'status') {
      handleProgress();
    } else if (cmd === 'help') {
      addLog({ message: 'Available commands:', type: 'system' });
      addLog({ message: '  spawn-scraper    Start a new scraper worker', type: 'system' });
      addLog({ message: '  halt <name>      Stop a scraper by animal name', type: 'system' });
      addLog({ message: '  progress         Show overall + per-scraper progress', type: 'system' });
      addLog({ message: '  help             Show this help message', type: 'system' });
    } else {
      addLog({ message: `Unknown command: "${cmd}". Type "help" for available commands.`, type: 'error' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      processCommand(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">
          Priority Models (optional, one per line)
        </label>
        <textarea
          value={priorityInput}
          onChange={e => setPriorityInput(e.target.value)}
          placeholder={'Paste model names/IDs here, one per line.\nThese get scraped first when you spawn-scraper.'}
          className="w-full p-2.5 border border-neutral-300 rounded-lg bg-white text-sm min-h-[72px] font-mono"
        />
      </div>

      <div className="flex-1 bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 shadow-inner flex flex-col min-h-[300px]">
        {/* Log area */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed space-y-0.5">
          {logs.length === 0 && (
            <div className="text-neutral-600 italic">
              Type <span className="text-green-400">help</span> for commands, or <span className="text-green-400">spawn-scraper</span> to start.
            </div>
          )}
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-neutral-600 shrink-0 select-none">[{log.time}]</span>
              {log.prefix && (
                <span className="font-bold shrink-0" style={{ color: log.color || '#fff' }}>
                  {log.prefix}
                </span>
              )}
              <span
                className={
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'system' ? 'text-neutral-400' :
                  log.type === 'progress' ? 'text-cyan-300 font-bold' :
                  'text-neutral-300'
                }
                style={log.prefix && log.type === 'info' ? { color: log.color } : undefined}
              >
                {log.message}
              </span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* Command input */}
        <div className="border-t border-neutral-800 bg-neutral-900 px-4 py-2.5 flex items-center gap-2">
          <span className="text-green-400 font-mono font-bold select-none">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="spawn-scraper | halt <name> | progress | help"
            className="flex-1 bg-transparent border-none outline-none text-neutral-200 font-mono text-sm placeholder-neutral-600"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
};
