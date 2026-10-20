import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Star, HelpCircle, RotateCcw } from 'lucide-react';
import { Question, QuestionUserStatus } from '../types/question';
import { Button } from './ui/button';

interface AnswerSheetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  currentQuestionId: number;
  userStatusMap: Record<number, QuestionUserStatus>;
  onSelectQuestion: (questionId: number) => void;
  onResetProgress: () => void;
}

type FilterStatus = 'all' | 'correct' | 'wrong' | 'unanswered' | 'starred';

export const AnswerSheetDrawer: React.FC<AnswerSheetDrawerProps> = ({
  isOpen,
  onClose,
  questions,
  currentQuestionId,
  userStatusMap,
  onSelectQuestion,
  onResetProgress,
}) => {
  const [filter, setFilter] = useState<FilterStatus>('all');

  if (!isOpen) return null;

  const filteredQuestions = questions.filter((q) => {
    const status = userStatusMap[q.id];
    if (filter === 'correct') return status?.isCorrect === true;
    if (filter === 'wrong') return status?.answered && status?.isCorrect === false;
    if (filter === 'unanswered') return !status?.answered;
    if (filter === 'starred') return !!status?.starred;
    return true;
  });

  const countCorrect = questions.filter((q) => userStatusMap[q.id]?.isCorrect === true).length;
  const countWrong = questions.filter((q) => userStatusMap[q.id]?.answered && userStatusMap[q.id]?.isCorrect === false).length;
  const countStarred = questions.filter((q) => !!userStatusMap[q.id]?.starred).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      <div className="relative w-full sm:max-w-md max-h-[85vh] sm:max-h-full h-auto sm:h-full bg-background border-t sm:border-l sm:border-t-0 rounded-t-2xl sm:rounded-none shadow-2xl flex flex-col z-10 animate-in slide-in-from-bottom sm:slide-in-from-right duration-200">
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 sm:py-3 border-b shrink-0">
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-foreground">
              答题卡与快速定位
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              点击题号极速跳转 · 共 {questions.length} 题
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/20 overflow-x-auto shrink-0 no-scrollbar">
          {(
            [
              { key: 'all', label: '全部', count: questions.length },
              { key: 'correct', label: '做对', count: countCorrect },
              { key: 'wrong', label: '做错', count: countWrong },
              { key: 'unanswered', label: '未答', count: questions.length - (countCorrect + countWrong) },
              { key: 'starred', label: '收藏', count: countStarred },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                filter === item.key
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span>{item.label}</span>
              <span className="ml-1 text-[10px] opacity-80">({item.count})</span>
            </button>
          ))}
        </div>

        {/* Question Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-6 sm:grid-cols-7 gap-2">
            {filteredQuestions.map((q) => {
              const status = userStatusMap[q.id];
              const isCurrent = q.id === currentQuestionId;
              const isCorrect = status?.isCorrect === true;
              const isWrong = status?.answered && status?.isCorrect === false;
              const isStarred = !!status?.starred;

              let tileStyle =
                'border-border/80 bg-card text-foreground hover:bg-muted/80';

              if (isCorrect) {
                tileStyle =
                  'border-emerald-500/80 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 font-bold';
              } else if (isWrong) {
                tileStyle =
                  'border-rose-500/80 bg-rose-500/15 text-rose-900 dark:text-rose-200 font-bold';
              }

              if (isCurrent) {
                tileStyle += ' ring-2 ring-primary ring-offset-1 font-extrabold';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    onSelectQuestion(q.id);
                    onClose();
                  }}
                  className={`relative flex flex-col items-center justify-center h-10 rounded-xl border text-xs font-medium transition-all active:scale-95 select-none ${tileStyle}`}
                >
                  <span>{q.id}</span>
                  {isStarred && (
                    <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>

          {filteredQuestions.length === 0 && (
            <div className="text-center py-12 text-xs text-muted-foreground">
              当前分类下暂无题目
            </div>
          )}
        </div>

        {/* Reset Progress Action */}
        <div className="px-3 py-2 border-t bg-background shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onResetProgress();
            }}
            className="w-full h-9 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 active:scale-[0.99]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>重新做题（清空记录）</span>
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-around p-2.5 sm:p-3 border-t bg-muted/20 text-[11px] text-muted-foreground shrink-0 pb-safe">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>做对</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>做错</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>收藏</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full border border-foreground" />
            <span>当前</span>
          </div>
        </div>
      </div>
    </div>
  );
};
