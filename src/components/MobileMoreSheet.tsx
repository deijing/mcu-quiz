import React from 'react';
import {
  X,
  XCircle,
  Star,
  Sun,
  Moon,
  Leaf,
  Sparkles,
  RotateCcw,
  Keyboard,
} from 'lucide-react';
import { Switch } from './ui/switch';
import { StudyMode } from '../types/question';

type Theme = 'light' | 'dark' | 'green';

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
  wrongCount: number;
  starredCount: number;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  autoAdvance: boolean;
  onAutoAdvanceToggle: () => void;
  onOpenAiSettings: () => void;
  onOpenShortcuts: () => void;
  onResetProgress: () => void;
}

export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({
  isOpen,
  onClose,
  mode,
  onModeChange,
  wrongCount,
  starredCount,
  theme,
  onThemeChange,
  soundEnabled,
  onSoundToggle,
  autoAdvance,
  onAutoAdvanceToggle,
  onOpenAiSettings,
  onOpenShortcuts,
  onResetProgress,
}) => {
  if (!isOpen) return null;

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: '浅色', icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: '深色', icon: <Moon className="h-4 w-4" /> },
    { value: 'green', label: '护眼', icon: <Leaf className="h-4 w-4" /> },
  ];

  const selectMode = (next: StudyMode) => {
    onModeChange(next);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 md:hidden">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-sheet-title"
        className="relative w-full max-w-lg bg-background border-t rounded-t-2xl shadow-2xl max-h-[86dvh] flex flex-col z-10 animate-in slide-in-from-bottom duration-200"
      >
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
          <div>
            <h3 id="more-sheet-title" className="font-semibold text-sm text-foreground">
              更多
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">模式、偏好与工具</p>
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
          {/* 专项刷题 */}
          <section className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground">专项刷题</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => selectMode('wrong')}
                className={`flex items-center justify-between gap-2 h-12 px-3 rounded-xl border transition-all active:scale-[0.98] ${
                  mode === 'wrong'
                    ? 'border-rose-500/60 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    : 'border-border bg-background text-foreground hover:bg-muted/60'
                }`}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <XCircle className="h-4 w-4 text-rose-500" />
                  错题本
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">{wrongCount}</span>
              </button>

              <button
                onClick={() => selectMode('starred')}
                className={`flex items-center justify-between gap-2 h-12 px-3 rounded-xl border transition-all active:scale-[0.98] ${
                  mode === 'starred'
                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-border bg-background text-foreground hover:bg-muted/60'
                }`}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  收藏夹
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">{starredCount}</span>
              </button>
            </div>
            {mode !== 'recite' && mode !== 'practice' && (
              <button
                onClick={() => selectMode('practice')}
                className="text-[11px] text-primary hover:underline"
              >
                返回常规刷题
              </button>
            )}
          </section>

          {/* 做题偏好 */}
          <section className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground">做题偏好</h4>
            <div className="rounded-xl border divide-y overflow-hidden">
              <div className="flex items-center justify-between px-3 py-3">
                <div>
                  <p className="text-xs font-medium text-foreground">答对自动下一题</p>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">答对后短暂停顿自动滑入下一题</p>
                </div>
                <Switch checked={autoAdvance} onCheckedChange={onAutoAdvanceToggle} />
              </div>
              <div className="flex items-center justify-between px-3 py-3">
                <div>
                  <p className="text-xs font-medium text-foreground">操作音效</p>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">答对/答错与翻题的提示音</p>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={onSoundToggle} />
              </div>
            </div>
          </section>

          {/* 外观 */}
          <section className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground">外观主题</h4>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((item) => (
                <button
                  key={item.value}
                  onClick={() => onThemeChange(item.value)}
                  className={`flex items-center justify-center gap-1.5 h-11 rounded-xl border text-xs font-medium transition-all active:scale-[0.97] ${
                    theme === item.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          {/* 工具 */}
          <section className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground">工具</h4>
            <div className="rounded-xl border divide-y overflow-hidden">
              <button
                onClick={() => {
                  onClose();
                  onOpenAiSettings();
                }}
                className="w-full flex items-center justify-between px-3 py-3 hover:bg-muted/50 active:bg-muted transition-colors"
              >
                <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  AI 解析设置
                </span>
                <span className="text-[10.5px] text-muted-foreground">OpenAI / Claude</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenShortcuts();
                }}
                className="w-full flex items-center justify-between px-3 py-3 hover:bg-muted/50 active:bg-muted transition-colors"
              >
                <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Keyboard className="h-4 w-4 text-muted-foreground" />
                  手势与快捷键
                </span>
                <span className="text-[10.5px] text-muted-foreground">滑动切题</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onResetProgress();
                }}
                className="w-full flex items-center justify-between px-3 py-3 hover:bg-destructive/5 active:bg-destructive/10 transition-colors"
              >
                <span className="flex items-center gap-2 text-xs font-medium text-destructive">
                  <RotateCcw className="h-4 w-4" />
                  重新做题
                </span>
                <span className="text-[10.5px] text-muted-foreground">清空记录</span>
              </button>
            </div>
          </section>

          <p className="text-center text-[10.5px] text-muted-foreground/70">
            320 道题 · 记录仅保存在本机浏览器
          </p>
        </div>
      </div>
    </div>
  );
};
