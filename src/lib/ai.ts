import { Question } from '../types/question';

export interface AiConfig {
  /** DeepSeek 兼容地址，默认 https://api.deepseek.com/v1 */
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AiCacheEntry {
  text: string;
  model: string;
  updatedAt: number;
}

export type AiCache = Record<string, AiCacheEntry>;

export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

export const DEEPSEEK_MODELS: { value: string; label: string; hint: string }[] = [
  { value: 'deepseek-chat', label: 'deepseek-chat', hint: '响应快，适合日常刷题' },
  { value: 'deepseek-reasoner', label: 'deepseek-reasoner', hint: '推理更强，速度稍慢' },
];

export const DEFAULT_AI_CONFIG: AiConfig = {
  baseUrl: DEEPSEEK_BASE_URL,
  apiKey: '',
  model: 'deepseek-chat',
};

/** 将 Base URL 规范化为 DeepSeek 的 Chat Completions 地址 */
export function resolveEndpoint(config: AiConfig): string {
  const base = config.baseUrl.trim().replace(/\/+$/, '');
  return /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;
}

export class AiError extends Error {
  status?: number;
  detail?: string;

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'AiError';
    this.status = status;
    this.detail = detail;
  }
}

const SYSTEM_PROMPT = `你是一位资深的高校《单片机原理与接口技术》《微机原理》讲师，擅长把考点讲透、把解题路径讲清楚。
请针对用户给出的这道题，输出一份面向备考学生的深度解析。

硬性要求：
1. 使用简体中文，结论先行，语言精炼，不要复述大段题干。
2. 必须尊重题目给出的标准答案；若确有学术争议，可在最后温和补充，但不要否定答案。
3. 使用 Markdown 输出，严格按以下结构（标题层级保持一致）：
## 一句话结论
## 考点定位
## 解题思路
## 逐项拆解
## 易错提醒
## 记忆口诀
4. 选择题在「逐项拆解」中逐个选项说明对错原因；填空题逐个空说明；简答题按要点分条；程序题指出关键语句/寄存器的作用。
5. 涉及寄存器、地址、时序、波特率等数值时给出具体推导过程。
6. 全文控制在 600 字左右，不要输出与题目无关的客套话。`;

function buildUserPrompt(question: Question): string {
  const lines: string[] = [];
  lines.push(`题型：${question.type_name}`);
  lines.push(`题干：${question.stem}`);

  if (question.options && Object.keys(question.options).length > 0) {
    lines.push('选项：');
    Object.entries(question.options).forEach(([key, value]) => {
      lines.push(`${key}. ${value}`);
    });
  }

  if (question.blanks && question.blanks.length > 0) {
    lines.push(`空格数量：${question.blanks.length}`);
  }

  lines.push(`标准答案：${question.answer}`);
  if (question.answer_symbol) lines.push(`答案标记：${question.answer_symbol}`);
  if (question.analysis) lines.push(`官方解析（供参考）：${question.analysis}`);
  if (question.note) lines.push(`备注：${question.note}`);
  if (question.tags.length > 0) lines.push(`考点标签：${question.tags.join('、')}`);

  lines.push('');
  lines.push('请直接输出深度解析，不要重复题目。');
  return lines.join('\n');
}

export interface StreamHandlers {
  onDelta: (delta: string) => void;
  signal?: AbortSignal;
}

/** 读取 SSE 流，按空行切分事件 */
async function consumeSse(
  response: Response,
  onChunk: (lines: string[]) => void,
  signal?: AbortSignal
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new AiError('接口返回为空，无法读取流式内容');

  const decoder = new TextDecoder();
  let buffer = '';

  while (!signal?.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? '';
    for (const event of events) {
      onChunk(event.split(/\r?\n/));
    }
  }

  if (buffer.trim()) {
    onChunk(buffer.split(/\r?\n/));
  }
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const raw = await response.text();
    try {
      const json = JSON.parse(raw);
      return (
        json?.error?.message ||
        json?.error?.type ||
        json?.message ||
        raw.slice(0, 300) ||
        '未知错误'
      );
    } catch {
      return raw.slice(0, 300) || '未知错误';
    }
  } catch {
    return '未知错误';
  }
}

function messageForStatus(status: number, detail: string): string {
  if (status === 400) return detail || '请求参数有误，请检查模型名';
  if (status === 401 || status === 403) return 'API Key 无效或没有该模型的权限';
  if (status === 402) return 'DeepSeek 账户余额不足，请先充值';
  if (status === 404) return '接口地址或模型不存在，请检查 Base URL 与模型名';
  if (status === 422) return detail || '请求参数不合法';
  if (status === 429) return '请求过于频繁或额度不足，请稍后再试';
  if (status >= 500) return 'DeepSeek 服务暂时不可用，请稍后重试';
  return detail || `请求失败（HTTP ${status}）`;
}

function headersFor(config: AiConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey.trim()}`,
  };
}

function bodyFor(config: AiConfig, system: string | undefined, user: string, stream: boolean, maxTokens = 1600) {
  // deepseek-reasoner 不支持 temperature 等采样参数，直接不传
  const isReasoner = config.model.trim().includes('reasoner');

  return {
    model: config.model.trim(),
    max_tokens: maxTokens,
    stream,
    ...(isReasoner ? {} : { temperature: 0.4 }),
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: user },
    ],
  };
}

/** 调用 DeepSeek API，流式返回解析文本 */
export async function streamAiExplanation(
  config: AiConfig,
  question: Question,
  { onDelta, signal }: StreamHandlers
): Promise<string> {
  const endpoint = resolveEndpoint(config);
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  const timeout = window.setTimeout(() => controller.abort(), 120_000);

  let text = '';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headersFor(config),
      body: JSON.stringify(bodyFor(config, SYSTEM_PROMPT, buildUserPrompt(question), true)),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await readErrorBody(response);
      throw new AiError(messageForStatus(response.status, detail), response.status, detail);
    }

    // 部分中转服务会忽略 stream 参数，直接返回完整 JSON，这里做兼容
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json: any = await response.json();
      const full: string = json?.choices?.[0]?.message?.content || '';
      if (full.trim()) {
        onDelta(full);
        return full;
      }
      throw new AiError('接口未返回可读内容，请确认模型是否支持对话补全');
    }

    await consumeSse(
      response,
      (lines) => {
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          let json: any;
          try {
            json = JSON.parse(payload);
          } catch {
            continue;
          }
          if (json.error) {
            throw new AiError(json.error?.message || '生成失败');
          }
          const delta: string = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            text += delta;
            onDelta(delta);
          }
        }
      },
      controller.signal
    );

    if (!text.trim()) {
      throw new AiError('接口返回了空内容，请检查模型是否支持对话补全');
    }

    return text;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (signal?.aborted) throw err;
      throw new AiError('请求超时（120 秒），请检查网络或换 deepseek-chat 试试');
    }
    if (err instanceof TypeError) {
      throw new AiError(
        '网络请求失败：可能是网络不通或浏览器跨域被拦截，请检查 Base URL',
        undefined,
        err.message
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** 非流式的小请求，用于「测试连接」 */
export async function testAiConnection(config: AiConfig): Promise<string> {
  const endpoint = resolveEndpoint(config);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headersFor(config),
      body: JSON.stringify(bodyFor(config, undefined, '请只回复四个字：连接成功', false, 32)),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await readErrorBody(response);
      throw new AiError(messageForStatus(response.status, detail), response.status, detail);
    }

    const json: any = await response.json();
    const reply: string = json?.choices?.[0]?.message?.content || '';

    if (!reply.trim()) throw new AiError('接口有响应但内容为空，请检查模型名');
    return reply.trim().slice(0, 60);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AiError('测试超时（20 秒），请检查网络或 Base URL');
    }
    if (err instanceof TypeError) {
      throw new AiError('网络请求失败：请检查网络、Base URL 或浏览器跨域限制', undefined, err.message);
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function pruneAiCache(cache: AiCache, maxEntries = 150): AiCache {
  const entries = Object.entries(cache);
  if (entries.length <= maxEntries) return cache;
  entries.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
  return Object.fromEntries(entries.slice(0, maxEntries));
}
