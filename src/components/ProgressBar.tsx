import React from 'react';
import { UserStats } from '../types/question';

interface ProgressBarProps {
  stats: UserStats;
  totalQuestions: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ stats, totalQuestions }) => {
  const percent = totalQuestions > 0 ? Math.round((stats.totalAnswered / totalQuestions) * 100) : 0;

  return (
    <div className="w-full bg-muted/30 border-b px-3 sm:px-6 py-1.5 shrink-0 select-none">
      <div className="max-w-4xl mx-auto flex flex-col gap-1">
        {/* Desktop stats row */}
        <div className="hidden sm:flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-6 font-medium">
            <span>
              已做: <strong className="text-foreground">{stats.totalAnswered}</strong> / {totalQuestions} ({percent}%)
            </span>
            <span>
              正确率: <strong className="text-emerald-600 dark:text-emerald-400">{stats.accuracy}%</strong>
            </span>
            <span>
              错题: <strong className="text-rose-600 dark:text-rose-400">{stats.wrongCount}</strong>
            </span>
            <span>
              收藏: <strong className="text-amber-500">{stats.starredCount}</strong>
            </span>
          </div>

          <div className="text-[11px] text-muted-foreground/80">
            按 <kbd className="px-1 py-0.5 rounded bg-muted border font-mono text-[10px]">空格</kbd> 答案与下一题
          </div>
        </div>

        {/* Mobile stats row (Ultra-compact 1-line) */}
        <div className="flex sm:hidden items-center justify-between text-[11px] text-muted-foreground font-medium">
          <div className="flex items-center gap-2.5">
            <span>
              进度 <strong className="text-foreground">{stats.totalAnswered}</strong>/{totalQuestions}
            </span>
            <span>
              正确率 <strong className="text-emerald-600 dark:text-emerald-400">{stats.accuracy}%</strong>
            </span>
            {stats.wrongCount > 0 && (
              <span>
                错题 <strong className="text-rose-600 dark:text-rose-400">{stats.wrongCount}</strong>
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground/70 font-mono">
            {percent}%
          </span>
        </div>

        {/* Hairline Track */}
        <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
