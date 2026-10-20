import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Zap,
  Sparkles 
} from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';

interface DesktopNavProps {
  onPrev: () => void;
  onNext: () => void;
  onToggleAnalysis: () => void;
  onResetCurrent: () => void;
  isRevealed: boolean;
  autoAdvance: boolean;
  onAutoAdvanceToggle: (enabled: boolean) => void;
  canPrev: boolean;
  canNext: boolean;
}

export const DesktopNav: React.FC<DesktopNavProps> = ({
  onPrev,
  onNext,
  onToggleAnalysis,
  onResetCurrent,
  isRevealed,
  autoAdvance,
  onAutoAdvanceToggle,
  canPrev,
  canNext,
}) => {
  return (
    <div className="w-full hidden md:flex flex-col gap-2 shrink-0 py-2 px-4 max-w-4xl mx-auto select-none">
      <div className="flex items-center justify-between gap-3">
        {/* Previous Button */}
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={!canPrev}
          className="gap-1.5 h-10 px-4"
          title="上一题 (快捷键 ← 或 J)"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>上一题</span>
          <kbd className="text-[10px] bg-muted px-1 rounded ml-1 font-mono">←</kbd>
        </Button>

        {/* Center tools */}
        <div className="flex items-center gap-3">
          {/* Auto advance toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border text-xs">
            <Switch
              id="auto-advance"
              checked={autoAdvance}
              onCheckedChange={onAutoAdvanceToggle}
            />
            <label
              htmlFor="auto-advance"
              className="cursor-pointer text-muted-foreground select-none font-medium"
            >
              做对自动下一题
            </label>
          </div>

          {/* Toggle Analysis */}
          <Button
            variant="secondary"
            onClick={onToggleAnalysis}
            className="gap-1.5 h-9 text-xs"
            title="查看/隐藏答案解析 (快捷键 空格)"
          >
            {isRevealed ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>收起解析</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-amber-500" />
                <span>查看解析</span>
              </>
            )}
            <kbd className="text-[10px] bg-background border px-1 rounded font-mono">空格</kbd>
          </Button>

          {/* Redo question */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetCurrent}
            className="gap-1 text-xs text-muted-foreground hover:text-foreground"
            title="重新作答本题 (快捷键 R)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>重做本题</span>
            <kbd className="text-[10px] bg-muted px-1 rounded font-mono">R</kbd>
          </Button>
        </div>

        {/* Next Button */}
        <Button
          onClick={onNext}
          disabled={!canNext}
          className="gap-1.5 h-10 px-5 shadow-sm"
          title="下一题 (快捷键 → 或 K 或 回车)"
        >
          <span>下一题</span>
          <kbd className="text-[10px] bg-primary-foreground/20 px-1 rounded ml-1 font-mono">→</kbd>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Keyboard Shortcuts Hint Bar */}
      <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
        <span className="flex items-center gap-1 font-semibold text-foreground/80">
          <Zap className="h-3 w-3 text-amber-500" /> 全键盘盲刷：
        </span>
        <span>
          <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">A</kbd>
          <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">B</kbd>
          <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">C</kbd>
          <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">D</kbd> 选择
        </span>
        <span>
          <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">T</kbd>/
          <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">F</kbd> 判断
        </span>
        <span>
          <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">空格</kbd> 答案与下一题
        </span>
        <span>
          <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">←</kbd>
          <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">→</kbd> 翻题
        </span>
        <span>
          <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">S</kbd> 收藏
        </span>
        <span>
          <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">⌘K</kbd> 搜题
        </span>
      </div>
    </div>
  );
};
