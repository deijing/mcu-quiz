import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Grid3X3,
  Lightbulb,
  LogOut,
  RotateCcw,
  Send,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  ExamResult,
  ExamSession,
  formatClock,
  formatUsedTime,
  getExamQuestions,
  remainingSeconds,
} from '../lib/exam';

/* ============================ 考试进行中 ============================ */

interface ExamOverlayProps {
  session: ExamSession;
  onSelect: (questionId: number, answer: string) => void;
  onGoto: (index: number) => void;
  onSubmit: () => void;
  onAbandon: () => void;
}

export const ExamOverlay: React.FC<ExamOverlayProps> = ({
  session,
  onSelect,
  onGoto,
  onSubmit,
  onAbandon,
}) => {
  const questions = useMemo(() => getExamQuestions(session), [session]);
  const current = questions[session.index];
  const answeredCount = questions.filter((q) => !!session.answers[q.id]).length;

  const [remaining, setRemaining] = useState<number | null>(() => remainingSeconds(session));
  const [showSheet, setShowSheet] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const submittedRef = useRef(false);

  const submitOnce = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmit();
  };

  // 倒计时：归零自动交卷
  useEffect(() => {
    if (session.durationMin <= 0) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const left = remainingSeconds(session);
      setRemaining(left);
      if (left !== null && left <= 0) submitOnce();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, session.startedAt, session.durationMin]);

  const goNext = () => {
    if (session.index < questions.length - 1) onGoto(session.index + 1);
  };
  const goPrev = () => {
    if (session.index > 0) onGoto(session.index - 1);
  };

  const pick = (answer: string) => {
    if (!current) return;
    if (session.answers[current.id] === answer) return;
    onSelect(current.id, answer);

    if (!session.autoNext) return;

    const isLast = session.index >= questions.length - 1;
    // 只有“其余题都答过了”时才在最后一题自动交卷，避免改答案被误交
    const allOthersAnswered = questions.every((q) => q.id === current.id || !!session.answers[q.id]);

    window.setTimeout(() => {
      if (!isLast) {
        onGoto(session.index + 1);
      } else if (allOthersAnswered) {
        submitOnce();
      }
    }, 260);
  };

  // 键盘：A-D / 1-4 选择，← → 翻题，Esc 关闭答题卡
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSheet(false);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
        return;
      }
      if (!current) return;
      const key = e.key.toUpperCase();
      if (current.type === 'choice') {
        const options = Object.keys(current.options ?? {}).map((k) => k.toUpperCase());
        if (options.includes(key)) {
          e.preventDefault();
          pick(key);
        }
      } else if (current.type === 'judge') {
        if (key === 'T' || e.key === '1') {
          e.preventDefault();
          pick('正确');
        } else if (key === 'F' || e.key === '2') {
          e.preventDefault();
          pick('错误');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, session.index, session.answers]);

  if (!current) return null;

  const selected = session.answers[current.id];
  const timeLow = remaining !== null && remaining <= 60;
  const progress = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col select-none">
      {/* 顶部：题号 / 题型 / 计时 / 交卷 */}
      <header className="shrink-0 border-b px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground leading-tight">模拟考试</p>
            <p className="text-[10.5px] text-muted-foreground leading-tight">
              第 {session.index + 1} / {questions.length} 题 · 已答 {answeredCount}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold tabular-nums ${
              timeLow
                ? 'border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                : 'border-border bg-muted/40 text-foreground'
            }`}
          >
            <AlarmClock className="h-3 w-3" />
            {formatClock(remaining)}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmExit(true)}
            className="h-8 px-2 gap-1 text-muted-foreground"
            title="放弃本次考试"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">退出</span>
          </Button>
          <Button size="sm" onClick={() => setConfirmSubmit(true)} className="h-8 px-2.5 gap-1">
            <Send className="h-3.5 w-3.5" />
            交卷
          </Button>
        </div>
      </header>

      {/* 答题进度 */}
      <div className="h-1 w-full bg-muted shrink-0">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* 题目区 */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 pb-28">
        <div className="w-full max-w-3xl mx-auto rounded-2xl border bg-card p-4 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap pb-3 mb-4 border-b">
            <span className="font-bold text-xs sm:text-sm bg-muted px-2 py-0.5 rounded-md">
              第 {session.index + 1} / {questions.length} 题
            </span>
            <Badge variant={current.type === 'choice' ? 'default' : 'purple'} className="text-[11px]">
              {current.type_name}
            </Badge>
            {current.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] font-normal text-muted-foreground">
                {tag}
              </Badge>
            ))}
            {selected && (
              <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" /> 已作答
              </span>
            )}
          </div>

          <div className="text-[16px] sm:text-[18px] font-semibold leading-[1.6] text-foreground mb-5">
            {current.stem}
          </div>

          {current.type === 'choice' && current.options && (
            <div className="flex flex-col gap-2.5">
              {Object.entries(current.options).map(([key, val]) => {
                const isSelected = selected === key;
                return (
                  <button
                    key={key}
                    onClick={() => pick(key)}
                    className={`w-full flex items-start sm:items-center gap-3 p-3.5 sm:p-4 rounded-xl border text-left transition-all min-h-[50px] active:scale-[0.985] ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary font-medium'
                        : 'border-border/80 bg-card hover:bg-muted/50'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center h-7 w-7 rounded-full font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                      }`}
                    >
                      {key}
                    </span>
                    <span className="flex-1 text-[15px] sm:text-base leading-snug">{val}</span>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {current.type === 'judge' && (
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto my-2">
              {[
                { value: '正确', label: '正确 (√)', icon: Check },
                { value: '错误', label: '错误 (×)', icon: X },
              ].map((item) => {
                const isSelected = selected === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => pick(item.value)}
                    className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border text-base font-semibold transition-all active:scale-95 ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                        : 'border-border/80 bg-card hover:bg-muted/50'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 底部：上一题 / 答题卡 / 下一题 */}
      <footer className="shrink-0 border-t bg-background/95 backdrop-blur px-3 sm:px-6 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={goPrev} disabled={session.index === 0} className="h-9 gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">上一题</span>
        </Button>

        <Button variant="ghost" size="sm" onClick={() => setShowSheet((v) => !v)} className="h-9 gap-1.5 text-muted-foreground">
          <Grid3X3 className="h-4 w-4" />
          <span className="text-xs">答题卡</span>
          <span className="tabular-nums text-[11px]">
            {answeredCount}/{questions.length}
          </span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={goNext}
          disabled={session.index >= questions.length - 1}
          className="h-9 gap-1"
        >
          <span className="hidden sm:inline">下一题</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </footer>

      {/* 答题卡抽屉 */}
      {showSheet && (
        <div className="absolute inset-0 z-10">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSheet(false)} aria-hidden="true" />
          <div className="absolute bottom-0 left-0 right-0 bg-card border-t rounded-t-2xl p-4 max-h-[70dvh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Grid3X3 className="h-4 w-4" /> 答题卡
              </h3>
              <button
                onClick={() => setShowSheet(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
                aria-label="关闭答题卡"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
              {questions.map((q, idx) => {
                const done = !!session.answers[q.id];
                const active = idx === session.index;
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      onGoto(idx);
                      setShowSheet(false);
                    }}
                    className={`h-8 rounded-md text-[11px] font-semibold tabular-nums border transition-all ${
                      active
                        ? 'border-primary ring-1 ring-primary bg-primary text-primary-foreground'
                        : done
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 交卷确认 */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black/60">
          <div className="fixed inset-0" onClick={() => setConfirmSubmit(false)} aria-hidden="true" />
          <div className="relative w-full max-w-xs bg-card border rounded-2xl shadow-2xl p-5 z-10 space-y-3">
            <h3 className="font-semibold text-base">确认交卷？</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {answeredCount < questions.length
                ? `还有 ${questions.length - answeredCount} 题未作答，未答的题按答错计分。交卷后立即判分。`
                : '已全部作答，交卷后立即判分并生成成绩单。'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => setConfirmSubmit(false)}>
                继续作答
              </Button>
              <Button size="sm" className="flex-1 h-9 gap-1" onClick={submitOnce}>
                <Send className="h-3.5 w-3.5" /> 交卷
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 退出确认 */}
      {confirmExit && (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black/60">
          <div className="fixed inset-0" onClick={() => setConfirmExit(false)} aria-hidden="true" />
          <div className="relative w-full max-w-xs bg-card border rounded-2xl shadow-2xl p-5 z-10 space-y-3">
            <h3 className="font-semibold text-base">放弃本次考试？</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              已作答的 {answeredCount} 题不会计入成绩，也不会写入错题本。
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => setConfirmExit(false)}>
                继续考试
              </Button>
              <Button variant="destructive" size="sm" className="flex-1 h-9" onClick={onAbandon}>
                放弃
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================ 成绩报告 ============================ */

interface ExamReportProps {
  result: ExamResult;
  onRetry: () => void;
  onReviewWrong: () => void;
  onClose: () => void;
}

export const ExamReport: React.FC<ExamReportProps> = ({ result, onRetry, onReviewWrong, onClose }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const wrongItems = result.items.filter((item) => !item.isCorrect);
  const passed = result.score >= 60;
  const ring = 56;
  const circumference = 2 * Math.PI * ring;
  const offset = circumference * (1 - result.score / 100);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col select-none">
      <header className="shrink-0 border-b px-3 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold leading-tight">考试成绩</p>
            <p className="text-[10.5px] text-muted-foreground leading-tight">
              {result.total} 道题 · 用时 {formatUsedTime(result.usedSec)}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0" aria-label="关闭成绩单">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
        {/* 分数卡 */}
        <div className="w-full max-w-3xl mx-auto rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-5">
            <div className="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 128 128" className="h-32 w-32 -rotate-90">
                <circle cx="64" cy="64" r={ring} fill="none" strokeWidth="10" className="stroke-muted" />
                <circle
                  cx="64"
                  cy="64"
                  r={ring}
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className={passed ? 'stroke-emerald-500' : 'stroke-rose-500'}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-extrabold tabular-nums ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {result.score}
                </span>
                <span className="text-[10px] text-muted-foreground">分</span>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-semibold">
                {passed ? '通过 🎉' : '未通过，继续加油'}
                <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">（60 分及格）</span>
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border bg-muted/30 py-2">
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{result.correct}</div>
                  <div className="text-[10px] text-muted-foreground">答对</div>
                </div>
                <div className="rounded-lg border bg-muted/30 py-2">
                  <div className="text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums">{wrongItems.length}</div>
                  <div className="text-[10px] text-muted-foreground">答错</div>
                </div>
                <div className="rounded-lg border bg-muted/30 py-2">
                  <div className="text-base font-bold tabular-nums">
                    {result.total ? Math.round((result.correct / result.total) * 100) : 0}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">正确率</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Button size="sm" onClick={onRetry} className="h-9 gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> 再来一套
            </Button>
            {wrongItems.length > 0 && (
              <Button variant="outline" size="sm" onClick={onReviewWrong} className="h-9 gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-rose-500" /> 只看错题（已入错题本）
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="h-9 ml-auto text-muted-foreground">
              返回刷题
            </Button>
          </div>
        </div>

        {/* 逐题回顾 */}
        <div className="w-full max-w-3xl mx-auto rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b flex items-center justify-between">
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> 逐题回顾
            </h3>
            <span className="text-[11px] text-muted-foreground">点击题目展开解析</span>
          </div>

          <ul className="divide-y">
            {result.items.map((item, idx) => {
              const open = expanded === idx;
              const userText =
                item.userAnswer ??
                '未作答';
              return (
                <li key={item.question.id}>
                  <button
                    onClick={() => setExpanded(open ? null : idx)}
                    className="w-full flex items-center gap-2 px-3 sm:px-4 py-2.5 text-left hover:bg-muted/40 transition-colors"
                  >
                    <span
                      className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums ${
                        item.isCorrect ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-xs text-foreground/90 truncate">
                      {item.question.stem.replace(/\s+/g, ' ')}
                    </span>
                    <span
                      className={`text-[11px] font-semibold tabular-nums shrink-0 ${
                        item.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.isCorrect ? '正确' : userText === '未作答' ? '未答' : '答错'}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>

                  {open && (
                    <div className="px-3 sm:px-4 pb-3.5 space-y-2">
                      <div className="text-[13px] leading-relaxed text-foreground/90 select-text">
                        {item.question.stem}
                      </div>

                      {item.question.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {Object.entries(item.question.options).map(([k, v]) => {
                            const isRight = k.toUpperCase() === item.correctAnswer.toUpperCase();
                            const isPicked = k.toUpperCase() === (item.userAnswer ?? '').toUpperCase();
                            return (
                              <div
                                key={k}
                                className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] ${
                                  isRight
                                    ? 'border-emerald-500/50 bg-emerald-500/10'
                                    : isPicked
                                    ? 'border-rose-500/50 bg-rose-500/10'
                                    : 'border-border/70'
                                }`}
                              >
                                <span className="font-bold shrink-0">{k}</span>
                                <span className="min-w-0">{v}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                        <span className={item.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          你的答案：
                          <strong className="font-mono">{userText === '未作答' ? '未作答' : userText}</strong>
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          标准答案：
                          <strong className="font-mono">{item.correctAnswer}</strong>
                        </span>
                      </div>

                      {item.question.analysis && (
                        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-[12px] leading-relaxed text-foreground/90 whitespace-pre-line">
                          <span className="font-semibold text-muted-foreground mr-1">考点精析</span>
                          {item.question.analysis}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </div>
  );
};
