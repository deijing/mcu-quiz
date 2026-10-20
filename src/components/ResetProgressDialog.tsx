import React, { useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw, Star, X } from 'lucide-react';
import { Button } from './ui/button';
import { UserStats } from '../types/question';

interface ResetProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStats;
  /** keepStarred: 是否保留收藏夹（只清空答题与错题记录） */
  onConfirm: (options: { keepStarred: boolean }) => void;
}

export const ResetProgressDialog: React.FC<ResetProgressDialogProps> = ({
  isOpen,
  onClose,
  stats,
  onConfirm,
}) => {
  // 默认保留收藏，避免误删自己标记的重点题
  const [keepStarred, setKeepStarred] = useState(true);

  useEffect(() => {
    if (isOpen) setKeepStarred(stats.starredCount > 0);
  }, [isOpen, stats.starredCount]);

  if (!isOpen) return null;

  const hasRecords = stats.totalAnswered > 0 || stats.starredCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-progress-title"
        className="relative w-full max-w-sm bg-card border rounded-2xl shadow-2xl p-5 z-10 flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 id="reset-progress-title" className="font-semibold text-base text-foreground leading-tight">重新做题</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">清空做题历史，从头再刷一轮</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all shrink-0"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 待清空的数据概览 */}
        {hasRecords ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border bg-muted/30 px-2 py-2 text-center">
                <div className="text-base font-bold text-foreground tabular-nums">{stats.totalAnswered}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">已做题数</div>
              </div>
              <div className="rounded-lg border bg-muted/30 px-2 py-2 text-center">
                <div className="text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums">{stats.wrongCount}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">错题</div>
              </div>
              <div className="rounded-lg border bg-muted/30 px-2 py-2 text-center">
                <div className="text-base font-bold text-amber-500 tabular-nums">{stats.starredCount}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">收藏</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              将清空答题记录、错题本与正确率统计，并从<strong className="text-foreground">第 1 题</strong>重新开始；筛选条件也会恢复为「全部题目」。题库本身不会受影响。
            </p>

            {stats.starredCount > 0 && (
              <label className="flex items-start gap-2.5 rounded-lg border bg-muted/20 px-3 py-2.5 cursor-pointer select-none active:scale-[0.99] transition-all">
                <input
                  type="checkbox"
                  checked={keepStarred}
                  onChange={(e) => setKeepStarred(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-amber-500 cursor-pointer"
                />
                <span className="text-xs leading-relaxed">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    保留收藏的 {stats.starredCount} 道重点题
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    不勾选则收藏夹一并清空
                  </span>
                </span>
              </label>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">
            当前还没有任何做题记录，可以直接从第 1 题开始刷题。
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-0.5">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 h-9">
            取消
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onConfirm({ keepStarred: stats.starredCount > 0 ? keepStarred : false })}
            className="flex-1 h-9 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {hasRecords ? '清空并重新开始' : '从头开始'}
          </Button>
        </div>
      </div>
    </div>
  );
};
