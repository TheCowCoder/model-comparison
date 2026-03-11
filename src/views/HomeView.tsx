import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BarChart3, Search, Shield } from 'lucide-react';

const AutocompleteInput = ({
  value,
  onChange,
  options,
  placeholder,
  accentColor,
  cursorClass
}: {
  value: string;
  onChange: (val: string) => void;
  options: { id: string, name: string }[];
  placeholder: string;
  accentColor: string;
  cursorClass: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className="relative w-full max-w-xs" ref={wrapperRef}>
      <div
        className={`flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 cursor-text transition-all focus-within:ring-2 focus-within:ring-${accentColor}-500`}
        onClick={() => setIsOpen(true)}
      >
        <Search className="text-white/50 mr-3" size={20} />
        <input
          type="text"
          className={`bg-transparent border-none outline-none text-white w-full text-lg placeholder-white/50 ${cursorClass}`}
          placeholder={selectedOption ? selectedOption.name : placeholder}
          value={isOpen ? search : (selectedOption ? selectedOption.name : '')}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-neutral-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          {filteredOptions.length > 0 ? (
            <ul className="max-h-60 overflow-y-auto">
              {filteredOptions.map(opt => (
                <li
                  key={opt.id}
                  className="px-4 py-3 text-white hover:bg-white/10 cursor-pointer transition-colors"
                  onClick={() => {
                    onChange(opt.id);
                    setSearch('');
                    setIsOpen(false);
                  }}
                >
                  {opt.name}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-white/50">No models found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default function HomeView() {
  const { models, loadError } = useAppContext();
  const navigate = useNavigate();
  const [model1, setModel1] = useState<string>('');
  const [model2, setModel2] = useState<string>('');

  const handleGo = () => {
    if (model1 && model2) {
      navigate(`/compare?m1=${model1}&m2=${model2}`);
    } else {
      alert("Please select two models to compare.");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight text-center">
          Compare AI Models
        </h1>

        <p className="max-w-2xl text-center text-sm md:text-base text-white/65 mb-8 leading-relaxed">
          Benchmark rankings, head-to-head comparisons, and a protected admin workflow for publishing updates.
        </p>

        {loadError && (
          <div className="mb-8 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {loadError}
          </div>
        )}
        
        <div className="h-8 mb-12 flex items-center justify-center">
          <div className="text-white/50 text-sm font-medium">
            {models.length} models available
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full mb-16">
          <AutocompleteInput
            value={model1}
            onChange={setModel1}
            options={models}
            placeholder="Select Model 1..."
            accentColor="red"
            cursorClass="caret-red-500 custom-caret-red"
          />

          <div className="text-white/50 font-bold text-2xl italic">V.S.</div>

          <AutocompleteInput
            value={model2}
            onChange={setModel2}
            options={models}
            placeholder="Select Model 2..."
            accentColor="blue"
            cursorClass="caret-blue-500 custom-caret-blue"
          />
        </div>

        <button
          onClick={handleGo}
          className="bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-bold text-xl py-4 px-16 rounded-full shadow-[0_0_40px_rgba(250,204,21,0.3)] transition-all transform hover:scale-105"
        >
          Go
        </button>

        <div className="mt-12 grid w-full max-w-2xl gap-4 md:grid-cols-[1.4fr_1fr]">
          <Link
            to="/leaderboards"
            className="group rounded-[24px] border border-cyan-300/25 bg-cyan-300/10 p-5 text-left shadow-[0_18px_60px_rgba(34,211,238,0.12)] transition hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-cyan-300/16"
          >
            <div className="mb-3 flex items-center gap-3 text-cyan-200">
              <BarChart3 size={18} />
              <span className="text-xs font-semibold uppercase tracking-[0.24em]">Explore Rankings</span>
            </div>
            <div className="text-2xl font-bold text-white">Open leaderboards</div>
            <p className="mt-2 text-sm text-white/70">
              Search benchmark winners, sort by category, and compare the full field before choosing a matchup.
            </p>
          </Link>

          <button
            onClick={() => navigate('/admin')}
            className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-left transition hover:border-white/20 hover:bg-white/8"
          >
            <div className="mb-3 flex items-center gap-3 text-white/60">
              <Shield size={18} />
              <span className="text-xs font-semibold uppercase tracking-[0.24em]">Protected</span>
            </div>
            <div className="text-lg font-semibold text-white">Admin dashboard</div>
            <p className="mt-2 text-sm text-white/55">Password required for publishing and scraping.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
