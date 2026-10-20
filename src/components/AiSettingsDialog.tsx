import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  X,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Bot,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  ShieldCheck,
  PlugZap,
  ExternalLink,
} from 'lucide-react';
import { Button } from './ui/button';
import { AiConfig, DEEPSEEK_MODELS, testAiConnection } from '../lib/ai';
import { cn } from '../lib/utils';

interface AiSettingsDialogProps {
  isOpen: boolean;
  config: AiConfig;
  cacheCount: number;
  onClose: () => void;
  onSave: (config: AiConfig) => void;
  onClearCache: () => void;
}

type TestState = { status: 'idle' | 'testing' | 'ok' | 'error'; message?: string };

export const AiSettingsDialog: React.FC<AiSettingsDialogProps> = ({
  isOpen,
  config,
  cacheCount,
  onClose,
  onSave,
  onClearCache,
}) => {
  const [draft, setDraft] = useState<AiConfig>(config);
  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDraft(config);
      setShowKey(false);
      setTestState({ status: 'idle' });
      setFormError('');
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const validate = (): string => {
    if (!/^https?:\/\//i.test(draft.baseUrl.trim())) return '请填写以 http(s):// 开头的 Base URL';
    if (!draft.model.trim()) return '请选择模型';
    return '';
  };

  const normalized = (): AiConfig => ({
    baseUrl: draft.baseUrl.trim().replace(/\/+$/, ''),
    apiKey: draft.apiKey.trim(),
    model: draft.model.trim(),
  });

  const handleTest = async () => {
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError('');
    setTestState({ status: 'testing' });
    try {
      const reply = await testAiConnection(normalized());
      setTestState({ status: 'ok', message: reply });
    } catch (err) {
      setTestState({
        status: 'error',
        message: err instanceof Error ? err.message : '测试失败，请检查配置',
      });
    }
  };

  const handleSave = () => {
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    onSave(normalized());
    onClose();
  };

  const inputClass =
    'w-full h-9 px-3 rounded-lg border border-input bg-background text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-settings-title"
        className="relative w-full max-w-lg max-h-[90dvh] bg-card border rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 id="ai-settings-title" className="font-semibold text-sm sm:text-base leading-tight">
                AI 解析设置
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                使用 DeepSeek API 生成逐题深度解析
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <span className="text-[11px] font-semibold text-primary">DeepSeek</span>
            <span className="text-[10.5px] text-muted-foreground">
              OpenAI 兼容接口 · 浏览器直连官方 API
            </span>
          </div>

          {/* Base URL */}
          <section className="space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Link2 className="h-3 w-3" /> Base URL
            </label>
            <input
              value={draft.baseUrl}
              onChange={(e) => {
                setDraft((prev) => ({ ...prev, baseUrl: e.target.value }));
                setTestState({ status: 'idle' });
              }}
              placeholder="https://api.deepseek.com/v1"
              spellCheck={false}
              className={inputClass}
            />
            <p className="text-[10.5px] text-muted-foreground/80">
              默认官方地址，一般无需修改；会自动补全 <code className="font-mono">/chat/completions</code>。
            </p>
          </section>

          {/* API Key */}
          <section className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <KeyRound className="h-3 w-3" /> API Key
              </label>
              <a
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-0.5 text-[10.5px] text-primary hover:underline"
              >
                获取 Key
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, apiKey: e.target.value }));
                  setTestState({ status: 'idle' });
                }}
                placeholder="sk-...（在 DeepSeek 控制台创建）"
                spellCheck={false}
                autoComplete="off"
                className={cn(inputClass, 'pr-9 font-mono')}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? '隐藏 Key' : '显示 Key'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="flex items-start gap-1 text-[10.5px] leading-relaxed text-muted-foreground/80">
              <ShieldCheck className="h-3 w-3 mt-0.5 shrink-0 text-emerald-600" />
              仅保存在本机浏览器 localStorage，不会上传到本站；请求由浏览器直接发往 DeepSeek。
            </p>
          </section>

          {/* Model */}
          <section className="space-y-2">
            <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Bot className="h-3 w-3" /> 模型
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEEPSEEK_MODELS.map((model) => {
                const active = draft.model === model.value;
                return (
                  <button
                    key={model.value}
                    onClick={() => {
                      setDraft((prev) => ({ ...prev, model: model.value }));
                      setTestState({ status: 'idle' });
                    }}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-all active:scale-[0.98]',
                      active
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <span className={cn('font-mono text-[11px]', active ? 'text-primary font-semibold' : 'text-foreground')}>
                      {model.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{model.hint}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Test connection */}
          <section className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testState.status === 'testing'}
                className="gap-1.5"
              >
                {testState.status === 'testing' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PlugZap className="h-3.5 w-3.5" />
                )}
                <span>{testState.status === 'testing' ? '测试中…' : '测试连接'}</span>
              </Button>
              {testState.status === 'ok' && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 truncate">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  连接成功：{testState.message}
                </span>
              )}
              {testState.status === 'error' && (
                <span className="flex items-center gap-1 text-[11px] text-destructive min-w-0">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{testState.message}</span>
                </span>
              )}
            </div>
            {testState.status === 'error' && (
              <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                常见原因：Key 无效或余额不足、Base URL 不正确、模型名不存在，或网络无法访问 DeepSeek。
              </p>
            )}
            {formError && <p className="text-[11px] text-destructive">{formError}</p>}
          </section>

          {/* Cache */}
          <section className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <span className="text-[11px] text-muted-foreground">
              已缓存 <strong className="text-foreground">{cacheCount}</strong> 道题的 AI 解析
            </span>
            <button
              onClick={onClearCache}
              disabled={cacheCount === 0}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:hover:text-muted-foreground transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              清空缓存
            </button>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t bg-muted/20 shrink-0 pb-safe">
          <Button variant="outline" size="sm" onClick={onClose} className="h-9">
            取消
          </Button>
          <Button size="sm" onClick={handleSave} className="h-9 gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            保存配置
          </Button>
        </div>
      </div>
    </div>
  );
};
