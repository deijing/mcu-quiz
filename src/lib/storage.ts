import { QuestionUserStatus, StudyMode, QuestionFilterType } from '../types/question';
import { AiCache, AiConfig, DEFAULT_AI_CONFIG } from './ai';

export interface AppSettings {
  soundEnabled: boolean;
  autoAdvance: boolean;
  theme: 'light' | 'dark' | 'green';
  mode: StudyMode;
  filterType: QuestionFilterType;
  selectedTag: string;
  isShuffled: boolean;
  lastQuestionId: number;
}

const STORAGE_KEY_STATUS = 'mcu_quiz_user_status_v2';
const STORAGE_KEY_SETTINGS = 'mcu_quiz_settings_v2';
const STORAGE_KEY_AI_CONFIG = 'mcu_quiz_ai_config_v1';
const STORAGE_KEY_AI_CACHE = 'mcu_quiz_ai_cache_v1';

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  autoAdvance: true,
  theme: 'light',
  mode: 'recite',
  filterType: 'all',
  selectedTag: 'all',
  isShuffled: false,
  lastQuestionId: 1,
};

export function loadUserStatusMap(): Record<number, QuestionUserStatus> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATUS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveUserStatusMap(statusMap: Record<number, QuestionUserStatus>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_STATUS, JSON.stringify(statusMap));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadAppSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearAllProgress() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_STATUS);
  } catch {
    // Ignore
  }
}

/* ---------------- AI 配置与解析缓存（仅存本机浏览器） ---------------- */

export function loadAiConfig(): AiConfig {
  if (typeof window === 'undefined') return DEFAULT_AI_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AI_CONFIG);
    if (!raw) return DEFAULT_AI_CONFIG;

    const parsed = JSON.parse(raw) as Partial<AiConfig> & { provider?: string };

    // 只保留 DeepSeek：旧版本的 OpenAI / Claude / 其它服务商地址回落到 DeepSeek 官方，
    // 但保留用户自己填写的中转地址。
    const legacyProvider =
      /api\.openai\.com|api\.anthropic\.com|api\.moonshot\.cn|open\.bigmodel\.cn|dashscope\.aliyuncs\.com|api\.siliconflow\.cn|localhost|127\.0\.0\.1/i;

    const baseUrl =
      typeof parsed.baseUrl === 'string' &&
      /^https?:\/\//i.test(parsed.baseUrl) &&
      !legacyProvider.test(parsed.baseUrl)
        ? parsed.baseUrl
        : DEFAULT_AI_CONFIG.baseUrl;

    return {
      baseUrl,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model: parsed.model === 'deepseek-reasoner' ? 'deepseek-reasoner' : 'deepseek-chat',
    };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function saveAiConfig(config: AiConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_AI_CONFIG, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadAiCache(): AiCache {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AI_CACHE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveAiCache(cache: AiCache) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_AI_CACHE, JSON.stringify(cache));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearAiCache() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_AI_CACHE);
  } catch {
    // Ignore
  }
}
