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
const STORAGE_KEY_SCROLL = 'mcu_quiz_scroll_v1';
const STORAGE_KEY_SHUFFLE = 'mcu_quiz_shuffle_v1';

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

export function loadShuffledIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHUFFLE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

export function saveShuffledIds(ids: number[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SHUFFLE, JSON.stringify(ids));
  } catch {
    // Ignore storage quota errors
  }
}

/* ---------------- 续刷进度：背题 / 自测 各自记一份 ---------------- */

// v2 的键是「模式:题号」，两种模式的阅读位置互不干扰
const STORAGE_KEY_SCROLL_MAP = 'mcu_quiz_scroll_map_v2';
const STORAGE_KEY_SCROLL_MAP_V1 = 'mcu_quiz_scroll_map_v1';
const STORAGE_KEY_SCROLL_LEGACY = STORAGE_KEY_SCROLL;
const STORAGE_KEY_LAST_BY_MODE = 'mcu_quiz_last_question_by_mode_v1';
const MAX_SCROLL_ENTRIES = 400;

// 只有背题 / 自测需要独立记忆，错题本与收藏夹同样按模式隔离保存
const SEPARATE_MODES: StudyMode[] = ['recite', 'practice', 'wrong', 'starred'];

interface SavedScroll {
  id: number;
  top: number;
}

const scrollKey = (mode: StudyMode, questionId: number) => `${mode}:${questionId}`;

let scrollMapCache: Record<string, number> | null = null;
let lastByModeCache: Partial<Record<StudyMode, number>> | null = null;

/** 把旧版本（题号直键 / 单条记录）迁移成「模式:题号」，两种模式各继承一份 */
function migrateLegacyScroll(target: Record<string, number>) {
  const expand = (id: number, top: unknown) => {
    if (!Number.isInteger(id) || id <= 0 || typeof top !== 'number' || !(top > 0)) return;
    (['recite', 'practice'] as StudyMode[]).forEach((mode) => {
      target[scrollKey(mode, id)] = Math.round(top);
    });
  };

  try {
    const v1 = localStorage.getItem(STORAGE_KEY_SCROLL_MAP_V1);
    if (v1) {
      Object.entries(JSON.parse(v1) as Record<string, unknown>).forEach(([key, value]) => {
        if (/^\d+$/.test(key)) expand(Number(key), value);
      });
    }
  } catch {
    // 忽略损坏的旧数据
  }

  try {
    const v0 = localStorage.getItem(STORAGE_KEY_SCROLL_LEGACY);
    if (v0) {
      const parsed = JSON.parse(v0) as Partial<SavedScroll>;
      if (typeof parsed.id === 'number') expand(parsed.id, parsed.top);
    }
  } catch {
    // 忽略损坏的旧数据
  }
}

function readScrollMap(): Record<string, number> {
  if (scrollMapCache) return scrollMapCache;

  const map: Record<string, number> = {};
  scrollMapCache = map;
  if (typeof window === 'undefined') return map;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_SCROLL_MAP);
    if (raw) {
      Object.entries(JSON.parse(raw) as Record<string, unknown>).forEach(([key, value]) => {
        const id = Number(key.slice(key.lastIndexOf(':') + 1));
        if (Number.isInteger(id) && id > 0 && typeof value === 'number' && value > 0) {
          map[key] = Math.round(value);
        }
      });
    } else {
      migrateLegacyScroll(map);
    }
  } catch {
    // 存储不可用或数据损坏：按“没有阅读记录”处理
  }

  return map;
}

/** 读取某模式某题上次停留在的位置；从未读过返回 0 */
export function loadScrollTop(mode: StudyMode, questionId: number): number {
  return readScrollMap()[scrollKey(mode, questionId)] ?? 0;
}

/** 记录某模式某题的阅读位置；传 0 表示回到顶部（并清掉这条记录） */
export function saveScrollTop(mode: StudyMode, questionId: number, scrollTop: number) {
  if (typeof window === 'undefined' || !Number.isInteger(questionId)) return;

  const map = readScrollMap();
  const key = scrollKey(mode, questionId);
  const top = Math.max(0, Math.round(scrollTop));

  if (top <= 0) {
    if (map[key] === undefined) return;
    delete map[key];
  } else {
    map[key] = top;
  }

  // 记录过多时丢弃最早写入的（对象键顺序即写入顺序）
  const keys = Object.keys(map);
  if (keys.length > MAX_SCROLL_ENTRIES) {
    keys.slice(0, keys.length - MAX_SCROLL_ENTRIES).forEach((old) => delete map[old]);
  }

  try {
    localStorage.setItem(STORAGE_KEY_SCROLL_MAP, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearScrollMap() {
  if (typeof window === 'undefined') return;
  scrollMapCache = {};
  try {
    localStorage.removeItem(STORAGE_KEY_SCROLL_MAP);
    localStorage.removeItem(STORAGE_KEY_SCROLL_MAP_V1);
    localStorage.removeItem(STORAGE_KEY_SCROLL_LEGACY);
  } catch {
    // Ignore
  }
}

function readLastByMode(): Partial<Record<StudyMode, number>> {
  if (lastByModeCache) return lastByModeCache;

  const map: Partial<Record<StudyMode, number>> = {};
  lastByModeCache = map;
  if (typeof window === 'undefined') return map;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_BY_MODE);
    if (!raw) return map;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    SEPARATE_MODES.forEach((mode) => {
      const id = parsed[mode];
      if (typeof id === 'number' && Number.isInteger(id) && id > 0) map[mode] = id;
    });
  } catch {
    // 忽略损坏数据
  }

  return map;
}

/** 某模式上次停在第几题；没有记录返回 null */
export function loadLastQuestionId(mode: StudyMode): number | null {
  const id = readLastByMode()[mode];
  return typeof id === 'number' ? id : null;
}

/** 记住某模式当前停在第几题 */
export function saveLastQuestionId(mode: StudyMode, questionId: number) {
  if (typeof window === 'undefined' || !Number.isInteger(questionId) || questionId <= 0) return;

  const map = readLastByMode();
  if (map[mode] === questionId) return;
  map[mode] = questionId;

  try {
    localStorage.setItem(STORAGE_KEY_LAST_BY_MODE, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearLastQuestionIds() {
  if (typeof window === 'undefined') return;
  lastByModeCache = {};
  try {
    localStorage.removeItem(STORAGE_KEY_LAST_BY_MODE);
  } catch {
    // Ignore
  }
}

/** 浏览器是否允许写入 localStorage（无痕模式、隐私设置会禁止） */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const probe = '__mcu_quiz_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
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
