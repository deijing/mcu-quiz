import { QuestionUserStatus, StudyMode, QuestionFilterType } from '../types/question';

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
