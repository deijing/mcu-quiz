import React, { useEffect, useState } from 'react';
import { 
  Star, 
  Check, 
  X, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  Copy, 
  CheckCheck,
  Code2,
  FileText,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { Question, QuestionUserStatus, StudyMode } from '../types/question';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import Prism from 'prismjs';
import 'prismjs/components/prism-c';

interface QuestionCardProps {
  question: Question;
  currentIndex: number;
  totalFiltered: number;
  mode: StudyMode;
  userStatus?: QuestionUserStatus;
  slideDirection: 'right' | 'left' | 'none';
  onAnswerChoice: (choice: string) => void;
  onAnswerJudge: (isCorrect: boolean) => void;
  onAnswerBlank: (answers: string[]) => void;
  onToggleStar: () => void;
  onToggleReveal: () => void;
  onOpenAi: () => void;
  aiCached?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  currentIndex,
  totalFiltered,
  mode,
  userStatus,
  slideDirection,
  onAnswerChoice,
  onAnswerJudge,
  onAnswerBlank,
  onToggleStar,
  onToggleReveal,
  onOpenAi,
  aiCached = false,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [blankInputs, setBlankInputs] = useState<string[]>([]);

  // Reset blank inputs when question changes
  useEffect(() => {
    if (question.type === 'blank' && question.blanks) {
      if (userStatus?.userAnswer && Array.isArray(userStatus.userAnswer)) {
        setBlankInputs(userStatus.userAnswer);
      } else {
        setBlankInputs(new Array(question.blanks.length).fill(''));
      }
    }
  }, [question, userStatus]);

  // Syntax highlight after render
  useEffect(() => {
    Prism.highlightAll();
  }, [question, userStatus?.revealed, mode]);

  const isStarred = !!userStatus?.starred;
  const isAnswered = !!userStatus?.answered;
  const isRevealed = mode === 'recite' || !!userStatus?.revealed || isAnswered;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleBlankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnswerBlank(blankInputs);
  };

  const animationClass =
    slideDirection === 'right'
      ? 'animate-slide-right'
      : slideDirection === 'left'
      ? 'animate-slide-left'
      : '';

  const choiceCorrectKey = question.answer.trim().toUpperCase();

  return (
    <div
      key={question.id}
      className={`w-full max-w-4xl mx-auto rounded-2xl border bg-card text-card-foreground shadow-xs transition-all duration-200 p-4 sm:p-6 ${animationClass}`}
    >
      {/* 1. Header Meta Bar (手机端去重简化) */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 sm:mb-4 border-b">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-xs sm:text-sm text-foreground bg-muted px-2 py-0.5 rounded-md">
            第 {currentIndex + 1} / {totalFiltered} 题
          </span>
          <Badge
            variant={
              question.type === 'choice'
                ? 'default'
                : question.type === 'judge'
                ? 'purple'
                : question.type === 'blank'
                ? 'warning'
                : question.type === 'code'
                ? 'success'
                : 'secondary'
            }
            className="text-[11px]"
          >
            {question.type_name}
          </Badge>
          {question.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] sm:text-[11px] font-normal text-muted-foreground">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Desktop-only Star Button (手机端底部栏已有大星标，此处隐藏以省空间) */}
        <Button
          variant={isStarred ? 'default' : 'outline'}
          size="xs"
          onClick={onToggleStar}
          className={`hidden md:inline-flex gap-1 select-none ${
            isStarred
              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
              : 'text-muted-foreground hover:text-amber-500'
          }`}
          title="收藏本题 (快捷键 S)"
        >
          <Star className={`h-3 w-3 ${isStarred ? 'fill-white' : ''}`} />
          <span>{isStarred ? '已收藏' : '收藏'}</span>
        </Button>
      </div>

      {/* 2. Question Stem */}
      <div className="text-[16px] sm:text-[18px] font-semibold leading-[1.6] text-foreground select-text mb-4 sm:mb-5">
        {question.stem}
      </div>

      {/* 3. Interactive Answer Area */}
      <div className="mb-4 sm:mb-6">
        {/* === Choice Options === */}
        {question.type === 'choice' && question.options && (
          <div className="flex flex-col gap-2.5">
            {Object.entries(question.options).map(([key, val]) => {
              const isCorrectAnswer = key.toUpperCase() === choiceCorrectKey;
              const isUserSelected = userStatus?.userAnswer === key;

              let optionStyle =
                'border-border/80 bg-card hover:bg-muted/40 text-foreground shadow-2xs';
              let badgeStyle = 'bg-muted text-foreground';

              if (mode === 'recite') {
                if (isCorrectAnswer) {
                  optionStyle =
                    'border-emerald-500/70 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/50 font-medium';
                  badgeStyle = 'bg-emerald-600 text-white';
                }
              } else if (isAnswered) {
                if (isCorrectAnswer) {
                  optionStyle =
                    'border-emerald-500 bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500 font-semibold';
                  badgeStyle = 'bg-emerald-600 text-white';
                } else if (isUserSelected && !isCorrectAnswer) {
                  optionStyle =
                    'border-rose-500 bg-rose-500/15 text-rose-950 dark:text-rose-100 ring-1 ring-rose-500 font-semibold';
                  badgeStyle = 'bg-rose-600 text-white';
                }
              }

              return (
                <button
                  key={key}
                  disabled={mode === 'recite' || isAnswered}
                  onClick={() => onAnswerChoice(key)}
                  className={`w-full flex items-start sm:items-center gap-3 p-3.5 sm:p-4 rounded-xl border text-left transition-all select-none min-h-[50px] active:scale-[0.985] ${optionStyle}`}
                >
                  <span
                    className={`inline-flex items-center justify-center h-7 w-7 rounded-full font-bold text-xs shrink-0 mt-0.5 sm:mt-0 shadow-xs ${badgeStyle}`}
                  >
                    {key}
                  </span>
                  <span className="flex-1 text-[15px] sm:text-base leading-snug">{val}</span>
                  {mode !== 'recite' && isAnswered && isCorrectAnswer && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                  )}
                  {mode !== 'recite' && isAnswered && isUserSelected && !isCorrectAnswer && (
                    <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* === Judge True / False === */}
        {question.type === 'judge' && (
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto my-2">
            {[
              { val: true, label: '正确 (√)', shortcut: 'T', icon: Check },
              { val: false, label: '错误 (×)', shortcut: 'F', icon: X },
            ].map((item) => {
              const isTargetAnswer = question.is_correct === item.val;
              const isSelected = userStatus?.userAnswer === (item.val ? '正确' : '错误');

              let btnStyle = 'border-border/80 bg-card hover:bg-muted/60 text-foreground shadow-2xs';

              if (mode === 'recite') {
                if (isTargetAnswer) {
                  btnStyle =
                    'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500 font-bold';
                }
              } else if (isAnswered) {
                if (isTargetAnswer) {
                  btnStyle =
                    'border-emerald-500 bg-emerald-500 text-white font-bold shadow-sm';
                } else if (isSelected && !isTargetAnswer) {
                  btnStyle =
                    'border-rose-500 bg-rose-500 text-white font-bold shadow-sm';
                }
              }

              return (
                <button
                  key={item.label}
                  disabled={mode === 'recite' || isAnswered}
                  onClick={() => onAnswerJudge(item.val)}
                  className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border text-base font-semibold transition-all active:scale-95 ${btnStyle}`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                  <kbd className="hidden sm:inline-block text-[11px] px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded font-mono">
                    {item.shortcut}
                  </kbd>
                </button>
              );
            })}
          </div>
        )}

        {/* === Blank Fill === */}
        {question.type === 'blank' && question.blanks && (
          <div className="space-y-3">
            {mode === 'recite' ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
                <span className="font-semibold text-amber-700 dark:text-amber-400 mr-2">填空答案：</span>
                <span className="font-mono font-bold text-foreground">
                  {question.blanks.map((b, i) => `【空${i + 1}】${b}`).join('  ，  ')}
                </span>
                {question.full_text && (
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    完整语句：{question.full_text}
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleBlankSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {question.blanks.map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground w-12 shrink-0">
                        空 {idx + 1}:
                      </span>
                      <input
                        type="text"
                        disabled={isAnswered}
                        value={blankInputs[idx] || ''}
                        onChange={(e) => {
                          const next = [...blankInputs];
                          next[idx] = e.target.value;
                          setBlankInputs(next);
                        }}
                        placeholder={`请输入第 ${idx + 1} 空答案`}
                        className="flex-1 h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  ))}
                </div>

                {!isAnswered ? (
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="gap-1 rounded-lg">
                      <Check className="h-3.5 w-3.5" />
                      <span>提交填空答案</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onToggleReveal}
                      className="gap-1 text-muted-foreground rounded-lg"
                    >
                      <Lightbulb className="h-3.5 w-3.5" />
                      <span>直接看答案</span>
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-muted/60 border text-xs">
                    <span className="font-semibold mr-1">参考标准填空：</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {question.blanks.join('；')}
                    </span>
                  </div>
                )}
              </form>
            )}
          </div>
        )}

        {/* === QA 简答题 === */}
        {question.type === 'qa' && mode !== 'recite' && !isRevealed && (
          <div className="flex items-center justify-center p-4">
            <Button onClick={onToggleReveal} variant="outline" className="gap-2 rounded-xl py-5">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span>思考完毕，点击查看核心要点与标准解答</span>
            </Button>
          </div>
        )}

        {/* === Code 程序题 === */}
        {question.type === 'code' && (
          <div className="space-y-3">
            <div className="relative">
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/80 px-3 py-2 rounded-t-xl border-b">
                <span className="flex items-center gap-1 font-mono font-semibold">
                  <Code2 className="h-3.5 w-3.5" /> C51 单片机程序解析
                </span>
                <button
                  onClick={() => handleCopyCode(question.answer)}
                  className="flex items-center gap-1 hover:text-foreground transition-colors active:scale-95"
                >
                  {copiedCode ? (
                    <>
                      <CheckCheck className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>复制代码</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="!mt-0 !rounded-t-none !rounded-b-xl language-c text-xs sm:text-sm">
                <code className="language-c">{question.answer}</code>
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* 4. Answer & Analysis (答案与考点精析) */}
      {isRevealed && question.type !== 'code' && (
        <div className="mt-4 pt-4 border-t space-y-3">
          {/* Answer line */}
          <div className="flex items-center gap-2.5 p-3 sm:p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-sm">
              <span className="font-bold mr-1.5 text-emerald-800 dark:text-emerald-300">
                标准答案:
              </span>
              <span className="font-extrabold font-mono text-base text-foreground">
                {question.type === 'judge'
                  ? `${question.answer} (${question.answer_symbol})`
                  : question.answer}
              </span>
              {/* If choice, show corresponding text so user doesn't need to re-scan options */}
              {question.type === 'choice' && question.options?.[choiceCorrectKey] && (
                <span className="ml-2 font-medium text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">
                  （{question.options[choiceCorrectKey]}）
                </span>
              )}
            </div>
          </div>

          {/* Detailed explanation */}
          {question.analysis && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-muted/40 border border-border/70 text-sm leading-relaxed">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground mb-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>考点精析</span>
              </div>
              <div className="text-foreground/90 whitespace-pre-line text-[13.5px] sm:text-sm leading-relaxed">
                {question.analysis}
              </div>
            </div>
          )}
        </div>
      )}
      {/* 5. AI Deep Explanation Entry */}
      <div className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAi}
          className="gap-1.5 rounded-full border-primary/30 text-primary hover:text-primary hover:bg-primary/5 active:scale-95"
          title="调用你配置的大模型，逐项讲解本题"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI 深度解析</span>
          {aiCached && (
            <span className="text-[10px] bg-primary/10 px-1.5 py-0.5 rounded-full">已生成</span>
          )}
        </Button>
        <span className="text-[10.5px] sm:text-[11px] text-muted-foreground/80">
          {isRevealed ? '接入你自己的大模型 API' : 'AI 解析含答案，建议先作答'}
        </span>
      </div>
    </div>
  );
};
