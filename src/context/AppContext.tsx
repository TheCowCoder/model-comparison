import React, { createContext, useContext, useEffect, useState } from 'react';
import { Benchmark, Model, AppState } from '../types';
import { fetchOpenRouterModels } from '../services/openRouterService';
import { fetchAppState } from '../services/api';
import { initialData, injectDerivedStats, normalizeModelStats, sanitizeAppState } from '../lib/appState';

interface AppContextType extends AppState {
  addModel: (model: Model) => void;
  updateModel: (id: string, model: Model) => void;
  deleteModel: (id: string) => void;
  setModels: (models: Model[] | ((prev: Model[]) => Model[])) => void;
  setBenchmarks: (benchmarks: Benchmark[] | ((prev: Benchmark[]) => Benchmark[])) => void;
  isLoading: boolean;
  loadError: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchAppState();
        if (data) {
          const parsed = sanitizeAppState(data);
          if (parsed.models.length < 5) {
            try {
              const fetched = await fetchOpenRouterModels();
              if (fetched && fetched.length > 0) {
                parsed.models = injectDerivedStats(fetched);
              }
            } catch (err) {
              console.warn('Initial OpenRouter fetch failed', err);
            }
          }
          setState(parsed);
          setLoadError(null);
        } else {
          try {
            const fetched = await fetchOpenRouterModels();
            if (fetched && fetched.length > 0) {
              setState(prev => ({ ...prev, models: injectDerivedStats(fetched) }));
            }
          } catch (err) {
            console.warn('Initial OpenRouter fetch failed', err);
          }
        }
      } catch (e) {
        console.error('Failed to load data from server', e);
        setLoadError('Unable to load the latest benchmark data. Showing the last built-in dataset.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const addModel = (model: Model) => {
    setState(prev => ({ ...prev, models: [...prev.models, normalizeModelStats(model)] }));
  };

  const updateModel = (id: string, updatedModel: Model) => {
    setState(prev => ({
      ...prev,
      models: prev.models.map(m => m.id === id ? normalizeModelStats(updatedModel) : m)
    }));
  };

  const deleteModel = (id: string) => {
    setState(prev => ({
      ...prev,
      models: prev.models.filter(m => m.id !== id)
    }));
  };

  const setModels = (models: Model[] | ((prev: Model[]) => Model[])) => {
    setState(prev => ({
      ...prev,
      models: injectDerivedStats(typeof models === 'function' ? models(prev.models) : models)
    }));
  };

  const setBenchmarks = (benchmarks: Benchmark[] | ((prev: Benchmark[]) => Benchmark[])) => {
    setState(prev => ({
      ...prev,
      benchmarks: typeof benchmarks === 'function' ? benchmarks(prev.benchmarks) : benchmarks
    }));
  };

  return (
    <AppContext.Provider value={{ ...state, addModel, updateModel, deleteModel, setModels, setBenchmarks, isLoading, loadError }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
