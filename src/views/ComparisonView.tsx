import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Trophy, Settings } from 'lucide-react';
import { ProgressBar } from '../components/ProgressBar';

export default function ComparisonView() {
  const [searchParams] = useSearchParams();
  const { models, benchmarks } = useAppContext();

  const m1Id = searchParams.get('m1');
  const m2Id = searchParams.get('m2');

  const model1 = models.find(m => m.id === m1Id);
  const model2 = models.find(m => m.id === m2Id);

  if (!model1 || !model2) {
    return (
      <div className="min-h-screen bg-white p-8 flex flex-col items-center justify-center">
        <p className="text-xl text-neutral-600 mb-4">Models not found or not selected.</p>
        <Link to="/" className="text-blue-600 hover:underline flex items-center">
          <ArrowLeft className="mr-2" size={16} /> Back to Home
        </Link>
      </div>
    );
  }

  const parseScore = (scoreStr: string | undefined): number | null => {
    if (!scoreStr || scoreStr === '—') return null;
    const cleanStr = scoreStr.replace(/,/g, '');
    const match = cleanStr.match(/[\d.]+/);
    if (match) {
      return parseFloat(match[0]);
    }
    return null;
  };

  let m1Wins = 0;
  let m2Wins = 0;

  const benchmarkResults = benchmarks.map(benchmark => {
    const val1 = model1.scores[benchmark.id];
    const val2 = model2.scores[benchmark.id];
    const num1 = parseScore(val1);
    const num2 = parseScore(val2);
    
    let winner: 1 | 2 | 0 = 0;
    if (num1 !== null && num2 !== null) {
      if (num1 > num2) {
        winner = 1;
        m1Wins++;
      } else if (num2 > num1) {
        winner = 2;
        m2Wins++;
      }
    } else if (num1 !== null && num2 === null) {
      winner = 1;
      m1Wins++;
    } else if (num2 !== null && num1 === null) {
      winner = 2;
      m2Wins++;
    }

    return { benchmark, val1: val1 || "—", val2: val2 || "—", winner };
  });

  const totalComparisons = m1Wins + m2Wins;
  const m1WinPct = totalComparisons > 0 ? Math.round((m1Wins / totalComparisons) * 100) : 0;
  const m2WinPct = totalComparisons > 0 ? Math.round((m2Wins / totalComparisons) * 100) : 0;

  let summaryText = "No benchmark data to compare.";
  if (totalComparisons > 0) {
    if (m1Wins > m2Wins) {
      summaryText = `${model1.name} won ${m1WinPct}% of challenges (${m1Wins} to ${m2Wins})`;
    } else if (m2Wins > m1Wins) {
      summaryText = `${model2.name} won ${m2WinPct}% of challenges (${m2Wins} to ${m1Wins})`;
    } else {
      summaryText = `Models tied at 50% of challenges (${m1Wins} to ${m2Wins})`;
    }
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 font-sans text-neutral-900">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="text-neutral-500 hover:text-neutral-900 flex items-center w-fit transition-colors">
            <ArrowLeft className="mr-2" size={16} /> Back
          </Link>
        </div>

        {/* Dynamic Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Model 1 Stats */}
          <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-200 shadow-sm">
            <h2 className="text-2xl font-black text-neutral-900 mb-6">{model1.name} <span className="text-sm font-medium text-neutral-500 uppercase tracking-widest ml-2">Stats</span></h2>
            {model1.stats ? (
              <>
                <ProgressBar label="Human Understanding" value={model1.stats.humanUnderstanding} />
                <ProgressBar label="Comprehensive Score" value={model1.stats.comprehensiveScore} />
                <ProgressBar label="Intelligence (Est.)" value={model1.stats.intelligence} />
                <ProgressBar label="Speed (Est.)" value={model1.stats.speed} />
                <ProgressBar label="Frontend UI (Est.)" value={model1.stats.frontend} />
                <ProgressBar label="Backend Robustness (Est.)" value={model1.stats.backend} />
                <div className="mt-6 pt-6 border-t border-neutral-200 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Context Window</div>
                    <div className="font-mono text-xl font-medium text-neutral-900">{(model1.stats.contextLength / 1000).toFixed(0)}k</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Cost per 1M Tokens</div>
                    <div className="font-mono text-xl font-medium text-neutral-900">${model1.stats.pricePer1M.toFixed(2)}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center min-h-[200px]">
                <p className="text-neutral-400 italic font-medium">No dynamic stats available for this model.</p>
              </div>
            )}
          </div>

          {/* Model 2 Stats */}
          <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-200 shadow-sm">
            <h2 className="text-2xl font-black text-neutral-900 mb-6">{model2.name} <span className="text-sm font-medium text-neutral-500 uppercase tracking-widest ml-2">Stats</span></h2>
            {model2.stats ? (
              <>
                <ProgressBar label="Human Understanding" value={model2.stats.humanUnderstanding} />
                <ProgressBar label="Comprehensive Score" value={model2.stats.comprehensiveScore} />
                <ProgressBar label="Intelligence (Est.)" value={model2.stats.intelligence} />
                <ProgressBar label="Speed (Est.)" value={model2.stats.speed} />
                <ProgressBar label="Frontend UI (Est.)" value={model2.stats.frontend} />
                <ProgressBar label="Backend Robustness (Est.)" value={model2.stats.backend} />
                <div className="mt-6 pt-6 border-t border-neutral-200 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Context Window</div>
                    <div className="font-mono text-xl font-medium text-neutral-900">{(model2.stats.contextLength / 1000).toFixed(0)}k</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Cost per 1M Tokens</div>
                    <div className="font-mono text-xl font-medium text-neutral-900">${model2.stats.pricePer1M.toFixed(2)}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center min-h-[200px]">
                <p className="text-neutral-400 italic font-medium">No dynamic stats available for this model.</p>
              </div>
            )}
          </div>
        </div>

        {/* Benchmarks Section */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between bg-neutral-50 p-4 rounded-2xl border border-neutral-200 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Trophy size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Benchmark Showdown</div>
              <div className="text-lg font-bold text-neutral-900">{summaryText}</div>
            </div>
          </div>
          <Link to="/admin" className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors bg-white px-4 py-2 rounded-xl border border-neutral-200 shadow-sm hover:shadow">
            <Settings size={16} /> Open Protected Admin
          </Link>
        </div>

        <div className="overflow-x-auto border border-neutral-200 rounded-2xl shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-5 border-b border-r border-neutral-200 bg-neutral-50 w-1/3">
                  <div className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Benchmarks</div>
                </th>
                <th className={`p-5 border-b border-r border-neutral-200 w-1/3 relative ${m1Wins >= m2Wins ? 'bg-blue-50/30' : 'bg-neutral-50'}`}>
                  <div className={`absolute top-0 left-0 w-full h-1 ${m1Wins >= m2Wins ? 'bg-blue-400' : 'bg-neutral-300'}`}></div>
                  <div className="text-xl font-bold text-neutral-900">{model1.name}</div>
                  {model1.subtitle && <div className="text-sm text-neutral-500 mt-1">{model1.subtitle}</div>}
                </th>
                <th className={`p-5 border-b border-neutral-200 w-1/3 relative ${m2Wins >= m1Wins ? 'bg-blue-50/30' : 'bg-neutral-50'}`}>
                  <div className={`absolute top-0 left-0 w-full h-1 ${m2Wins >= m1Wins ? 'bg-blue-400' : 'bg-neutral-300'}`}></div>
                  <div className="text-xl font-bold text-neutral-900">{model2.name}</div>
                  {model2.subtitle && <div className="text-sm text-neutral-500 mt-1">{model2.subtitle}</div>}
                </th>
              </tr>
            </thead>
            <tbody>
              {benchmarkResults.map((res, idx) => {
                const isLast = idx === benchmarkResults.length - 1;

                return (
                  <tr key={res.benchmark.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className={`p-5 border-r border-neutral-200 align-top ${!isLast ? 'border-b' : ''}`}>
                      <div className="font-bold text-neutral-900">{res.benchmark.name}</div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-500">
                        <div className="font-medium">{res.benchmark.subtext1}</div>
                        <div className="whitespace-pre-wrap">{res.benchmark.subtext2}</div>
                      </div>
                    </td>
                    <td className={`p-5 align-top border-r border-neutral-200 ${!isLast ? 'border-b' : ''} ${res.winner === 1 ? 'bg-blue-50/50 ring-2 ring-blue-400 ring-inset' : ''}`}>
                      <div className="text-lg font-medium text-neutral-800 whitespace-pre-wrap relative z-10">
                        {res.val1}
                      </div>
                    </td>
                    <td className={`p-5 align-top ${!isLast ? 'border-b border-neutral-200' : ''} ${res.winner === 2 ? 'bg-blue-50/50 ring-2 ring-blue-400 ring-inset' : ''}`}>
                      <div className="text-lg font-medium text-neutral-800 whitespace-pre-wrap relative z-10">
                        {res.val2}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
