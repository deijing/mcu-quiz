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
} from 'lucide-react';
import { Button } from './ui/button';
import { AI_PRESETS, AiConfig, matchPreset, testAiConnection } from '../lib/ai';
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

  const activePreset = matchPreset(draft);

  const validate = (): string => {
    if (!/^https?:\/\//i.test(draft.baseUrl.trim())) return '请填写以 http(s):// 开头的 Base URL';
    if (!draft.model.trim()) return '请填写模型名称';
    return '';
  };

  const normalized = (): AiConfig => ({
    provider: draft.provider,
    baseUrl: draft.baseUrl.trim().replace(/\/+$/, ''),
    apiKey: draft.apiKey.trim(),
    model: draft.model.trim(),
  });

  const handlePreset = (id: string) => {
    const preset = AI_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setDraft((prev) => ({
      ...prev,
      provider: preset.provider,
      baseUrl: preset.baseUrl,
      model: preset.model,
    }));
    setTestState({ status: 'idle' });
    setFormError('');
  };

  const handleProvider = (provider: AiConfig['provider']) => {
    const preset = AI_PRESETS.find((p) => p.provider === provider);
    setDraft((prev) => ({
      ...prev,
      provider,
      baseUrl: preset?.baseUrl ?? prev.baseUrl,
      model: preset?.model ?? prev.model,
    }));
    setTestState({ status: 'idle' });
    setFormError('');
  };

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
                接入你自己的大模型 API，生成逐题深度解析
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
          {/* Presets */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-semibold text-muted-foreground">快速选择服务商</label>
              {!activePreset && (
                <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  当前：自定义地址
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {AI_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePreset(preset.id)}
                  title={preset.hint}
                  className={cn(
                    'h-8 rounded-lg border text-[11px] font-medium transition-all active:scale-95 truncate px-1.5',
                    activePreset?.id === preset.id
                      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="text-[10.5px] leading-relaxed text-muted-foreground">
              选择预设后仍可手动修改下方任意字段；直接编辑即视为自定义地址。
            </p>
          </section>

          {/* Protocol */}
          <section className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">接口格式</label>
            <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-lg bg-muted border border-border/60">
              {(
                [
                  { value: 'openai', label: 'OpenAI 兼容', hint: '/chat/completions' },
                  { value: 'anthropic', label: 'Claude 格式', hint: '/messages' },
                ] as const
              ).map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleProvider(item.value)}
                  className={cn(
                    'py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-all',
                    draft.provider === item.value
                      ? 'bg-background text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                  <span className="ml-1 text-[10px] font-normal opacity-60 hidden sm:inline">{item.hint}</span>
                </button>
              ))}
            </div>
          </section>

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
              只需填到 <code className="font-mono">/v1</code> 或 <code className="font-mono">/v4</code>；
              会自动补全 {draft.provider === 'anthropic' ? '/messages' : '/chat/completions'}。
            </p>
          </section>

          {/* API Key */}
          <section className="space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <KeyRound className="h-3 w-3" /> API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, apiKey: e.target.value }));
                  setTestState({ status: 'idle' });
                }}
                placeholder="sk-...（本地 Ollama 可留空）"
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
              仅保存在本机浏览器 localStorage，不会上传到本站；请求由浏览器直接发往你填写的 API 地址。
            </p>
          </section>

          {/* Model */}
          <section className="space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Bot className="h-3 w-3" /> 模型
            </label>
            <input
              value={draft.model}
              onChange={(e) => {
                setDraft((prev) => ({ ...prev, model: e.target.value }));
                setTestState({ status: 'idle' });
              }}
              placeholder="gpt-4o-mini / deepseek-chat / claude-sonnet-4-5"
              spellCheck={false}
              className={cn(inputClass, 'font-mono')}
            />
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
                常见原因：Key 无效、Base URL 少了 /v1、模型名拼写错误，或服务商禁止浏览器跨域调用。
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
