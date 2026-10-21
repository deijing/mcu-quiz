import React, { useEffect } from 'react';
import { BookmarkCheck, RotateCcw, ShieldAlert, X } from 'lucide-react';

interface ResumeHintProps {
  /** 当前在筛选结果中的序号（0 开始） */
  index: number;
  total: number;
  /** 是否连阅读位置也一并恢复了 */
  hasScroll: boolean;
  /** 提示标题，默认「已回到上次进度」 */
  label?: string;
  /** 不传则不显示「从头开始」按钮（切换模式时的提示不需要） */
  onRestart?: () => void;
  onDismiss: () => void;
  autoHideMs?: number;
}

/**
 * 二次打开（或切回某个模式）时提示“已回到上次进度”，并给出一键从头开始。
 * 没有它的话，续刷虽然生效，但用户无法确认到底是软件记住了还是巧合。
 */
export const ResumeHint: React.FC<ResumeHintProps> = ({
  index,
  total,
  hasScroll,
  label = '已回到上次进度',
  onRestart,
  onDismiss,
  autoHideMs = 6000,
}) => {
  useEffect(() => {
    if (autoHideMs <= 0) return;
    const timer = window.setTimeout(onDismiss, autoHideMs);
    return () => window.clearTimeout(timer);
  }, [autoHideMs, onDismiss]);

  return (
    <div
      role="status"
      className="animate-resume-in pointer-events-auto fixed left-1/2 bottom-24 md:bottom-8 z-40 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md"
    >
      <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-lg backdrop-blur">
        <BookmarkCheck className="h-4 w-4 shrink-0 text-emerald-500" />
        <div className="min-w-0 flex-1 text-xs leading-tight text-foreground">
          <span className="font-medium">{label}</span>
          <span className="ml-1 text-muted-foreground">
            第 {index + 1} / {total} 题{hasScroll ? ' · 继续往下看' : ''}
          </span>
        </div>
        {onRestart && (
          <button
            onClick={onRestart}
            className="flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-accent active:opacity-70"
          >
            <RotateCcw className="h-3 w-3" />
            从头开始
          </button>
        )}
        <button
          onClick={onDismiss}
          aria-label="关闭提示"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

interface StorageBlockedHintProps {
  onDismiss: () => void;
}

/**
 * 无痕 / 隐私模式会禁用 localStorage，此时进度无论如何都存不住，
 * 与其让用户以为“功能坏了”，不如直接说明原因。
 */
export const StorageBlockedHint: React.FC<StorageBlockedHintProps> = ({ onDismiss }) => (
  <div
    role="alert"
    className="animate-resume-in pointer-events-auto fixed left-1/2 bottom-24 md:bottom-8 z-40 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md"
  >
    <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-card px-3 py-2 shadow-lg backdrop-blur">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <div className="min-w-0 flex-1 text-xs leading-relaxed">
        <p className="font-medium text-foreground">当前浏览器禁止保存本地数据</p>
        <p className="text-muted-foreground">
          无痕 / 隐私模式或站点数据被限制，进度无法保存。请用普通窗口打开，或在浏览器设置里允许本站保存数据。
        </p>
      </div>
      <button
        onClick={onDismiss}
        aria-label="关闭提示"
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
);
