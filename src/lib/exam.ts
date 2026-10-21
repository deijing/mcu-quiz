import { Question } from '../types/question';
import { allQuestions } from '../data/questions';

/**
 * 模拟考试：从题库随机抽题 → 限时作答 → 交卷自动判分。
 * 只抽客观题（单选 / 判断），保证判分有确定答案。
 */

export type ExamQuestionType = 'choice' | 'judge';

export interface ExamConfig {
  /** 题量 */
  count: number;
  /** 限时（分钟），0 表示不限时 */
  durationMin: number;
  /** 参与抽题的题型 */
  types: ExamQuestionType[];
  /** 选完自动进入下一题 */
  autoNext: boolean;
}

export interface ExamAnswerMap {
  [questionId: number]: string;
}

export interface ExamSession {
  id: string;
  questionIds: number[];
  answers: ExamAnswerMap;
  /** 开始答题的时间戳（毫秒） */
  startedAt: number;
  durationMin: number;
  index: number;
  autoNext: boolean;
}

export interface ExamReviewItem {
  question: Question;
  userAnswer?: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface ExamResult {
  items: ExamReviewItem[];
  correct: number;
  total: number;
  /** 百分制得分 */
  score: number;
  usedSec: number;
  submittedAt: number;
}

export const EXAM_COUNT_OPTIONS = [10, 20, 30, 50] as const;
export const EXAM_DURATION_OPTIONS = [
  { minutes: 10, label: '10 分钟' },
  { minutes: 20, label: '20 分钟' },
  { minutes: 30, label: '30 分钟' },
  { minutes: 0, label: '不限时' },
] as const;

export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  count: 20,
  durationMin: 20,
  types: ['choice', 'judge'],
  autoNext: true,
};

const STORAGE_KEY_EXAM = 'mcu_quiz_exam_v1';

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 可抽题池：只含能自动判分的客观题 */
export function getExamPool(types: ExamQuestionType[] = ['choice', 'judge']): Question[] {
  const wanted = new Set(types);
  return allQuestions.filter(
    (q) => (q.type === 'choice' && wanted.has('choice')) || (q.type === 'judge' && wanted.has('judge'))
  );
}

/**
 * 随机抽题：同一场考试不重复，单选/判断按题型配额抽，最后再打乱整体顺序。
 */
export function drawExamQuestions(config: ExamConfig): Question[] {
  const pool = getExamPool(config.types);
  if (!pool.length) return [];

  const target = Math.max(1, Math.min(config.count, pool.length));
  const byType: Record<ExamQuestionType, Question[]> = {
    choice: shuffle(pool.filter((q) => q.type === 'choice')),
    judge: shuffle(pool.filter((q) => q.type === 'judge')),
  };
  const types = config.types.filter((t) => byType[t].length > 0);
  if (!types.length) return [];

  // 每个题型先分到均等配额，余数从前往后补
  const quota: Record<string, number> = {};
  const share = Math.floor(target / types.length);
  types.forEach((t) => (quota[t] = share));
  let rest = target - share * types.length;
  for (const t of types) {
    if (rest <= 0) break;
    quota[t] += 1;
    rest -= 1;
  }

  const picked: Question[] = [];
  types.forEach((t) => {
    picked.push(...byType[t].slice(0, Math.min(quota[t], byType[t].length)));
  });

  // 某个题型不够时，用其它题型补齐
  if (picked.length < target) {
    const pickedIds = new Set(picked.map((q) => q.id));
    for (const t of types) {
      if (picked.length >= target) break;
      for (const q of byType[t]) {
        if (picked.length >= target) break;
        if (!pickedIds.has(q.id)) {
          picked.push(q);
          pickedIds.add(q.id);
        }
      }
    }
  }

  return shuffle(picked).slice(0, target);
}

export function createExamSession(config: ExamConfig): ExamSession | null {
  const questions = drawExamQuestions(config);
  if (!questions.length) return null;
  return {
    id: `exam-${Date.now().toString(36)}`,
    questionIds: questions.map((q) => q.id),
    answers: {},
    startedAt: Date.now(),
    durationMin: config.durationMin,
    index: 0,
    autoNext: config.autoNext,
  };
}

export function getExamQuestions(session: ExamSession): Question[] {
  const map = new Map(allQuestions.map((q) => [q.id, q]));
  return session.questionIds.map((id) => map.get(id)).filter((q): q is Question => !!q);
}

/** 判断题的正确答案写成「正确 / 错误」，与练习模式保持一致 */
export function getCorrectAnswer(question: Question): string {
  if (question.type === 'judge') {
    if (typeof question.is_correct === 'boolean') return question.is_correct ? '正确' : '错误';
    return question.answer.trim() === '错误' ? '错误' : '正确';
  }
  return question.answer.trim();
}

export function isAnswerCorrect(question: Question, userAnswer?: string): boolean {
  if (!userAnswer) return false;
  const expected = getCorrectAnswer(question);
  if (question.type === 'choice') {
    return userAnswer.trim().toUpperCase() === expected.toUpperCase();
  }
  return userAnswer.trim() === expected;
}

export function remainingSeconds(session: ExamSession, now = Date.now()): number | null {
  if (session.durationMin <= 0) return null;
  const total = session.durationMin * 60;
  const elapsed = Math.floor((now - session.startedAt) / 1000);
  return Math.max(0, total - elapsed);
}

export function buildExamResult(session: ExamSession, submittedAt = Date.now()): ExamResult {
  const questions = getExamQuestions(session);
  const items: ExamReviewItem[] = questions.map((question) => {
    const userAnswer = session.answers[question.id];
    return {
      question,
      userAnswer,
      correctAnswer: getCorrectAnswer(question),
      isCorrect: isAnswerCorrect(question, userAnswer),
    };
  });

  const correct = items.filter((item) => item.isCorrect).length;
  const total = items.length;
  const usedSec = Math.max(0, Math.round((submittedAt - session.startedAt) / 1000));

  return {
    items,
    correct,
    total,
    score: total > 0 ? Math.round((correct / total) * 100) : 0,
    usedSec,
    submittedAt,
  };
}

export function formatClock(totalSeconds: number | null): string {
  if (totalSeconds === null) return '不限时';
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatUsedTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe < 60) return `${safe} 秒`;
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return s ? `${m} 分 ${s} 秒` : `${m} 分钟`;
}

/* ---------------- 会话持久化：刷新 / 关浏览器后可以接着考 ---------------- */

export function loadExamSession(): ExamSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXAM);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ExamSession>;
    if (
      !Array.isArray(parsed.questionIds) ||
      !parsed.questionIds.length ||
      typeof parsed.startedAt !== 'number' ||
      !parsed.questionIds.every((id) => typeof id === 'number')
    ) {
      return null;
    }
    return {
      id: typeof parsed.id === 'string' ? parsed.id : `exam-${parsed.startedAt}`,
      questionIds: parsed.questionIds,
      answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {},
      startedAt: parsed.startedAt,
      durationMin: typeof parsed.durationMin === 'number' ? parsed.durationMin : 0,
      index: typeof parsed.index === 'number' ? parsed.index : 0,
      autoNext: parsed.autoNext !== false,
    };
  } catch {
    return null;
  }
}

export function saveExamSession(session: ExamSession) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_EXAM, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearExamSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_EXAM);
  } catch {
    // Ignore
  }
}
