import React from 'react';
import { Check } from 'lucide-react';

interface StepperProps {
  steps: string[];
  current: number; // 1-based
  completed?: number; // how many completed (current-1 by default)
}

export const Stepper: React.FC<StepperProps> = ({ steps, current }) => {
  const completed = current - 1;
  return (
    <ol className="flex items-center justify-between gap-1">
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isDone = stepNum <= completed;
        const isActive = stepNum === current;
        return (
          <li key={step} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full items-center">
              <div className={`h-0.5 flex-1 ${stepNum <= completed ? 'bg-govblue-500' : stepNum === current ? 'bg-govblue-200' : 'bg-slate-200'}`} />
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  isDone ? 'bg-govblue-500 text-white' : isActive ? 'bg-govblue-100 text-govblue-700 ring-2 ring-govblue-400' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <div className={`h-0.5 flex-1 ${stepNum < steps.length ? (stepNum < completed || (stepNum === completed && current > stepNum) ? 'bg-govblue-500' : 'bg-slate-200') : 'bg-transparent'}`} style={stepNum === current ? { backgroundColor: '#bfdbfe' } : {}} />
            </div>
            <span className={`text-[10px] font-medium ${isActive ? 'text-govblue-700' : isDone ? 'text-slate-700' : 'text-slate-400'}`}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
};
