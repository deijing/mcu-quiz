import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  X,
  RefreshCw,
  Copy,
  Check,
  Square,
  Settings2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Question } from '../types/question';
import { AiCacheEntry, AiConfig, streamAiExplanation } from '../lib/ai';
import { renderMarkdown } from '../lib/markdown';
import { Button } from './ui/button';
import Prism from 'prismjs';

interface AiExplanationPanelProps {
  isOpen: boolean;
  question: Question | null;
  questionNumber: number;
  config: AiConfig;
  cached?: AiCacheEntry;
  onClose: () => void;
  onOpenSettings: () => void;
  onSaved: (questionId: number, entry: AiCacheEntry) => void;
}

type Status = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

export const AiExplanationPanel: React.FC<AiExplanationPanelProps> = ({
  isOpen,
  question,
  questionNumber,
  config,
  cached,
  onClose,
  onOpenSettings,
  onSaved,
}) => {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const stickToBottom = useRef(true);

  const run = useCallback(async () => {
    if (!question) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText('');
    setError('');
    setStatus('loading');
    stickToBottom.current = true;

    let acc = '';
    let lastPaint = 0;
    try {
      const full = await streamAiExplanation(config, question, {
        signal: controller.signal,
        onDelta: (delta) => {
          acc += delta;
          // 节流重渲染：Markdown 清洗 + 排版比较重，约 70ms 刷新一次即可
          const now = performance.now();
          if (now - lastPaint > 70) {
            lastPaint = now;
            setText(acc);
            setStatus('streaming');
          }
        },
      });

      setText(full);
      setStatus('done');
      onSaved(question.id, {
        text: full,
        model: config.model,
        provider: config.provider,
        updatedAt: Date.now(),
      });
    } catch (err) {
      if (controller.signal.aborted) {
        // 用户主动停止：保留已生成的部分
        if (acc.trim()) {
          setText(acc);
          setStatus('done');
        } else {
          setStatus('idle');
        }
        return;
      }
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试');
      setStatus('error');
    }
  }, [question, config, onSaved]);

  // 打开时：有缓存直接展示，否则自动开始生成
  useEffect(() => {
    if (!isOpen || !question) return;
    if (cached?.text) {
      setText(cached.text);
      setStatus('done');
      setError('');
      return;
    }
    void run();
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, question?.id]);

  // 流式输出时自动滚到底部
  useEffect(() => {
    if (!stickToBottom.current) return;
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text]);

  // 生成完成后对代码块做一次高亮
  useEffect(() => {
    if (status !== 'done' || !text) return;
    try {
      Prism.highlightAll();
    } catch {
      // 未知语言忽略
    }
  }, [status, text]);

  if (!isOpen || !question) return null;

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // 忽略剪贴板权限错误
    }
  };

  const handleScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distance < 60;
  };

  const isBusy = status === 'loading' || status === 'streaming';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={handleClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-panel-title"
        className="relative w-full sm:max-w-xl max-h-[90dvh] sm:max-h-full h-auto sm:h-full bg-background border-t sm:border-l sm:border-t-0 rounded-t-2xl sm:rounded-none shadow-2xl flex flex-col z-10 animate-in slide-in-from-bottom sm:slide-in-from-right duration-200"
      >
        {/* Mobile handle */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-2.5 sm:py-3 border-b shrink-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/15 to-sky-500/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 id="ai-panel-title" className="font-semibold text-sm sm:text-base leading-tight flex items-center gap-1.5">
                AI 深度解析
                {cached?.text && !isBusy && (
                  <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded max-w-[10rem] truncate">
                    已缓存 · {cached.model}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                第 {questionNumber} 题 · {question.type_name} · {question.tags.join(' / ')}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="关闭"
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3"
        >
          {status === 'error' && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-destructive font-semibold text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                生成失败
              </div>
              <p className="text-xs leading-relaxed text-foreground/85">{error}</p>
              <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                排查：API Key 是否有效 · Base URL 是否填到 /v1 · 模型名是否存在 ·
                服务商是否允许浏览器跨域调用。
              </p>
              <div className="flex gap-2 pt-1">
                <Button size="xs" onClick={() => void run()} className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  重试
                </Button>
                <Button size="xs" variant="outline" onClick={onOpenSettings} className="gap-1">
                  <Settings2 className="h-3 w-3" />
                  去设置
                </Button>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="space-y-2.5 animate-pulse py-1">
              <div className="flex items-center gap-1.5 text-xs text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{config.model} 正在分析这道题…</span>
              </div>
              <div className="h-3 w-1/3 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-11/12 rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
            </div>
          )}

          {text && (
            <div
              className="ai-markdown"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
            />
          )}

          {status === 'streaming' && (
            <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse rounded-sm align-middle" />
          )}

          <p className="pt-2 text-[10.5px] text-muted-foreground/70">
            AI 生成内容仅供参考，请以教材与老师讲解为准。
          </p>
        </div>

        {/* Footer */}
        <div className="border-t px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 shrink-0 pb-safe bg-muted/20">
          <span className="hidden sm:block text-[10.5px] text-muted-foreground truncate">
            {config.provider === 'anthropic' ? 'Claude' : 'OpenAI 兼容'} · {config.model}
          </span>

          <div className="flex items-center gap-1.5 ml-auto">
            {isBusy ? (
              <Button variant="outline" size="sm" onClick={handleStop} className="h-8 gap-1 text-xs">
                <Square className="h-3 w-3" />
                停止
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void run()}
                className="h-8 gap-1 text-xs"
                title="重新生成"
              >
                <RefreshCw className="h-3 w-3" />
                <span>重新生成</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!text}
              className="h-8 gap-1 text-xs"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copied ? '已复制' : '复制'}
            </Button>

            <Button variant="ghost" size="sm" onClick={onOpenSettings} className="h-8 gap-1 text-xs">
              <Settings2 className="h-3 w-3" />
              设置
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
