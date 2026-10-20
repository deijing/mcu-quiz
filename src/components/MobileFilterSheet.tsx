import React from 'react';
import { X, ListOrdered, RotateCcw, Shuffle } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { QuestionFilterType } from '../types/question';
import { typeCounts } from '../data/questions';

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filterType: QuestionFilterType;
  onFilterTypeChange: (type: QuestionFilterType) => void;
  selectedTag: string;
  onTagChange: (tag: string) => void;
  allTags: string[];
  isShuffled: boolean;
  onShuffleToggle: () => void;
  resultCount: number;
  totalCount: number;
  /** 专项模式（错题本 / 收藏夹）提示 */
  scopeLabel?: string;
  onReset: () => void;
}

export const MobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
  isOpen,
  onClose,
  filterType,
  onFilterTypeChange,
  selectedTag,
  onTagChange,
  allTags,
  isShuffled,
  onShuffleToggle,
  resultCount,
  totalCount,
  scopeLabel,
  onReset,
}) => {
  if (!isOpen) return null;

  const typeButtons: { type: QuestionFilterType; label: string; count: number }[] = [
    { type: 'all', label: '全部', count: typeCounts.all },
    { type: 'choice', label: '单选题', count: typeCounts.choice },
    { type: 'blank', label: '填空题', count: typeCounts.blank },
    { type: 'judge', label: '判断题', count: typeCounts.judge },
    { type: 'qa', label: '简答题', count: typeCounts.qa },
    { type: 'code', label: '程序题', count: typeCounts.code },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 md:hidden">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-sheet-title"
        className="relative w-full max-w-lg bg-background border-t rounded-t-2xl shadow-2xl max-h-[86dvh] flex flex-col z-10 animate-in slide-in-from-bottom duration-200"
      >
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
          <div>
            <h3 id="filter-sheet-title" className="font-semibold text-sm text-foreground">
              找题与筛选
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              当前结果：{resultCount} / {totalCount} 题{scopeLabel ? ` · ${scopeLabel}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {resultCount === 0 && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
              当前范围内没有匹配题目，可更换题型/考点，或点击「重置筛选」。
            </p>
          )}

          {/* 题型 */}
          <section className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground">题型</h4>
            <div className="grid grid-cols-3 gap-2">
              {typeButtons.map((item) => {
                const active = filterType === item.type;
                return (
                  <button
                    key={item.type}
                    onClick={() => onFilterTypeChange(item.type)}
                    className={`h-11 rounded-xl border text-xs font-medium transition-all active:scale-[0.97] ${
                      active
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                        : 'border-border bg-background text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className={`ml-1 text-[10px] ${active ? 'opacity-80' : 'text-muted-foreground'}`}>
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 考点 */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold text-muted-foreground">考点分类</h4>
              <span className="text-[10px] text-muted-foreground/70">{allTags.length} 个考点</span>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[30dvh] overflow-y-auto pr-0.5">
              <button
                onClick={() => onTagChange('all')}
                className={`h-9 px-3 rounded-full border text-xs font-medium transition-all active:scale-95 ${
                  selectedTag === 'all'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted/60'
                }`}
              >
                全部考点
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onTagChange(tag)}
                  className={`h-9 px-3 rounded-full border text-xs font-medium transition-all active:scale-95 ${
                    selectedTag === tag
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          {/* 乱序 */}
          <section className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-3">
            <div className="flex items-start gap-2.5">
              {isShuffled ? (
                <Shuffle className="h-4 w-4 text-primary mt-0.5" />
              ) : (
                <ListOrdered className="h-4 w-4 text-muted-foreground mt-0.5" />
              )}
              <div>
                <p className="text-xs font-medium text-foreground">乱序刷题</p>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">
                  {isShuffled ? '已打乱题目顺序' : '按题号顺序排列'}
                </p>
              </div>
            </div>
            <Switch checked={isShuffled} onCheckedChange={() => onShuffleToggle()} />
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-muted/20 shrink-0 pb-safe">
          <button
            onClick={onReset}
            className="flex items-center gap-1 h-9 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重置筛选
          </button>
          <Button
            size="sm"
            onClick={onClose}
            disabled={resultCount === 0}
            className="h-10 px-6 rounded-full"
          >
            {resultCount > 0 ? `查看 ${resultCount} 题` : '暂无匹配题目'}
          </Button>
        </div>
      </div>
    </div>
  );
};
