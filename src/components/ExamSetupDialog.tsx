import React, { useEffect, useState } from 'react';
import { AlarmClock, ChevronRight, ClipboardList, Shuffle, Sparkles, X } from 'lucide-react';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import {
  DEFAULT_EXAM_CONFIG,
  EXAM_COUNT_OPTIONS,
  EXAM_DURATION_OPTIONS,
  ExamConfig,
  ExamQuestionType,
  getExamPool,
} from '../lib/exam';

interface ExamSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: ExamConfig) => void;
}

const TYPE_CHOICES: { value: 'mixed' | ExamQuestionType; label: string; types: ExamQuestionType[] }[] = [
  { value: 'mixed', label: '单选 + 判断', types: ['choice', 'judge'] },
  { value: 'choice', label: '只考单选', types: ['choice'] },
  { value: 'judge', label: '只考判断', types: ['judge'] },
];

export const ExamSetupDialog: React.FC<ExamSetupDialogProps> = ({ isOpen, onClose, onStart }) => {
  const [config, setConfig] = useState<ExamConfig>(DEFAULT_EXAM_CONFIG);
  const [typeChoice, setTypeChoice] = useState<'mixed' | ExamQuestionType>('mixed');

  useEffect(() => {
    if (!isOpen) return;
    setConfig(DEFAULT_EXAM_CONFIG);
    setTypeChoice('mixed');
  }, [isOpen]);

  if (!isOpen) return null;

  const types = TYPE_CHOICES.find((t) => t.value === typeChoice)?.types ?? ['choice', 'judge'];
  const available = getExamPool(types).length;
  const count = Math.min(config.count, available);
  const totalPoints = count > 0 ? 100 / count : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-setup-title"
        className="relative w-full max-w-md bg-card border rounded-2xl shadow-2xl z-10 flex flex-col max-h-[90dvh]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h3 id="exam-setup-title" className="font-semibold text-base text-foreground leading-tight">
                模拟考试
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                随机抽题 · 限时作答 · 交卷自动判分
              </p>
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

        <div className="px-5 pb-4 space-y-4 overflow-y-auto">
          {/* 题型 */}
          <section className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground">题型</h4>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_CHOICES.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setTypeChoice(item.value)}
                  className={`h-9 rounded-lg border text-xs font-medium transition-all active:scale-[0.97] ${
                    typeChoice === item.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          {/* 题量 */}
          <section className="space-y-2">
            <h4 className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>题量</span>
              <span className="font-normal text-muted-foreground/80">可抽 {available} 题</span>
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {EXAM_COUNT_OPTIONS.map((n) => {
                const disabled = n > available;
                return (
                  <button
                    key={n}
                    disabled={disabled}
                    onClick={() => setConfig((prev) => ({ ...prev, count: n }))}
                    className={`h-9 rounded-lg border text-xs font-semibold tabular-nums transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                      config.count === n
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {n} 题
                  </button>
                );
              })}
            </div>
          </section>

          {/* 时长 */}
          <section className="space-y-2">
            <h4 className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <AlarmClock className="h-3 w-3" /> 时长
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {EXAM_DURATION_OPTIONS.map((item) => (
                <button
                  key={item.minutes}
                  onClick={() => setConfig((prev) => ({ ...prev, durationMin: item.minutes }))}
                  className={`h-9 rounded-lg border text-xs font-medium transition-all active:scale-[0.97] ${
                    config.durationMin === item.minutes
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          {/* 自动跳题 */}
          <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-2.5">
            <div>
              <p className="text-xs font-medium text-foreground">自动答题跳转</p>
              <p className="text-[10.5px] text-muted-foreground mt-0.5">
                选完自动进入下一题，答完最后一道自动交卷
              </p>
            </div>
            <Switch
              checked={config.autoNext}
              onCheckedChange={(v) => setConfig((prev) => ({ ...prev, autoNext: v }))}
            />
          </div>

          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Sparkles className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
            <span>
              满分 100 分，每题 {totalPoints ? totalPoints.toFixed(totalPoints % 1 === 0 ? 0 : 1) : 0} 分；
              交卷后自动判分，做错的题会自动进入错题本。
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-4 pt-0 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 h-9">
            取消
          </Button>
          <Button
            size="sm"
            disabled={count <= 0}
            onClick={() => onStart({ ...config, count, types })}
            className="flex-1 h-9 gap-1.5"
          >
            <Shuffle className="h-3.5 w-3.5" />
            随机抽题并开始
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
