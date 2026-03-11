import React from 'react';
import { motion } from 'motion/react';

interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, max = 100 }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  // Color scale: Red -> Orange -> Yellow -> Green
  let colorClass = 'bg-red-500';
  if (percentage >= 75) {
    colorClass = 'bg-green-500';
  } else if (percentage >= 50) {
    colorClass = 'bg-yellow-400';
  } else if (percentage >= 25) {
    colorClass = 'bg-orange-500';
  }

  return (
    <div className="mb-5">
      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-bold text-neutral-700 tracking-wide uppercase">{label}</span>
        <span className="text-lg font-black text-neutral-900">{Math.round(value)}<span className="text-sm text-neutral-400 font-medium">/{max}</span></span>
      </div>
      <div className="w-full bg-neutral-200/80 rounded-full h-5 overflow-hidden shadow-inner relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} // smooth spring-like ease
          className={`h-full rounded-full ${colorClass} shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]`}
        />
      </div>
    </div>
  );
};
