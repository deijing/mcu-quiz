import React, { Suspense, lazy, useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { XCircle, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { allQuestions, allTags } from './data/questions';
import { 
  Question, 
  QuestionFilterType, 
  StudyMode, 
  QuestionUserStatus, 
  UserStats 
} from './types/question';
import {
  loadAppSettings,
  saveAppSettings,
  loadUserStatusMap,
  saveUserStatusMap,
  clearAllProgress,
  loadAiConfig,
  saveAiConfig,
  loadAiCache,
  saveAiCache,
  clearAiCache,
  loadScrollTop,
  saveScrollTop,
  clearScrollMap,
  loadLastQuestionId,
  saveLastQuestionId,
  clearLastQuestionIds,
  isStorageAvailable,
  loadShuffledIds,
  saveShuffledIds,
  AppSettings
} from './lib/storage';
import { AiCache, AiCacheEntry, AiConfig, pruneAiCache } from './lib/ai';
import { playSound, triggerHaptic } from './lib/audio';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { FilterBar } from './components/FilterBar';
import { QuestionCard } from './components/QuestionCard';
import { DesktopNav } from './components/DesktopNav';
import { MobileBottomBar } from './components/MobileBottomBar';
import { AnswerSheetDrawer } from './components/AnswerSheetDrawer';
import { CommandSearchDialog } from './components/CommandSearchDialog';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { ResetProgressDialog } from './components/ResetProgressDialog';
import { AiSettingsDialog } from './components/AiSettingsDialog';
import { MobileFilterSheet } from './components/MobileFilterSheet';
import { MobileMoreSheet } from './components/MobileMoreSheet';
import { ResumeHint, StorageBlockedHint } from './components/ResumeHint';

// AI 解析面板按需加载，避免把 Markdown 渲染库打进首屏包
const AiExplanationPanel = lazy(() =>
  import('./components/AiExplanationPanel').then((m) => ({ default: m.AiExplanationPanel }))
);


const MODE_LABELS: Record<StudyMode, string> = {
  recite: '背题速记',
  practice: '做题自测',
  wrong: '错题本',
  starred: '收藏夹',
};

function shuffleQuestionIds(allIds: number[]): number[] {
  const ids = [...allIds];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

function buildFilteredQuestions(
  settings: AppSettings,
  userStatusMap: Record<number, QuestionUserStatus>,
  shuffledIds: number[]
): Question[] {
  let list = [...allQuestions];

  if (settings.isShuffled && shuffledIds.length === allQuestions.length) {
    const map = new Map(allQuestions.map((q) => [q.id, q]));
    list = shuffledIds.map((id) => map.get(id)!).filter(Boolean);
  }

  if (settings.filterType !== 'all') {
    list = list.filter((q) => q.type === settings.filterType);
  }

  if (settings.selectedTag !== 'all') {
    list = list.filter((q) => q.tags.includes(settings.selectedTag));
  }

  if (settings.mode === 'wrong') {
    list = list.filter((q) => {
      const s = userStatusMap[q.id];
      return s?.answered && s?.isCorrect === false;
    });
  } else if (settings.mode === 'starred') {
    list = list.filter((q) => !!userStatusMap[q.id]?.starred);
  }

  return list;
}

export const App: React.FC = () => {
  // 1. Persistent Settings & State
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [userStatusMap, setUserStatusMap] = useState<Record<number, QuestionUserStatus>>(() => loadUserStatusMap());

  // 2. Stable Shuffled Order（先初始化，保证刷新后按同一顺序定位）
  const [shuffledIds, setShuffledIds] = useState<number[]>(() => {
    if (!settings.isShuffled) return [];
    const allIds = allQuestions.map((q) => q.id);
    const saved = loadShuffledIds();
    const isValid =
      saved.length === allIds.length &&
      new Set(saved).size === allIds.length &&
      saved.every((id) => Number.isInteger(id) && id >= 1 && id <= allQuestions.length);
    return isValid ? saved : shuffleQuestionIds(allIds);
  });

  // 3. Navigation & Animation State（背题 / 自测 各记自己的题号与阅读位置）
  const [currentIndex, setCurrentIndex] = useState(() => {
    const list = buildFilteredQuestions(settings, userStatusMap, shuffledIds);
    // 优先用「当前模式」上次停下的题号；没有分模式记录的老数据回落到全局题号
    const targetId = loadLastQuestionId(settings.mode) ?? settings.lastQuestionId;
    const index = list.findIndex((q) => q.id === targetId);
    return index >= 0 ? index : 0;
  });
  const [slideDirection, setSlideDirection] = useState<'right' | 'left' | 'none'>('none');

  const mainRef = useRef<HTMLElement>(null);
  const scrollSaveTimer = useRef<number | null>(null);
  const currentQuestionIdRef = useRef<number | undefined>(undefined);
  // 上一道真正渲染过的题号：用于“离开时落盘、进入时恢复”
  const lastAppliedQuestionRef = useRef<number | null>(null);
  // 当前题目最新的模式 / 题号 / 滚动位置（滑动过程中只更新它，落盘走防抖）
  const liveScrollRef = useRef<{ mode: StudyMode; id: number | undefined; top: number }>({
    mode: settings.mode,
    id: undefined,
    top: 0,
  });
  const wasShuffledRef = useRef(settings.isShuffled);

  // 续刷提示 / 本地存储被禁用时的说明
  const [resumeHint, setResumeHint] = useState<{
    index: number;
    hasScroll: boolean;
    label?: string;
    allowRestart?: boolean;
  } | null>(null);
  const [storageBlocked, setStorageBlocked] = useState(false);

  // 3. Modals State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

  // AI 解析配置与缓存（均仅存本机浏览器）
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => loadAiConfig());
  const [aiCache, setAiCache] = useState<AiCache>(() => loadAiCache());
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState<Question | null>(null);

  // Update HTML theme class
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'green');
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'green') {
      root.classList.add('green');
    }
  }, [settings.theme]);

  // Persist settings
  useEffect(() => {
    saveAppSettings(settings);
  }, [settings]);

  // Persist user status map
  useEffect(() => {
    saveUserStatusMap(userStatusMap);
  }, [userStatusMap]);

  // Persist AI config & cache
  useEffect(() => {
    saveAiConfig(aiConfig);
  }, [aiConfig]);

  useEffect(() => {
    saveAiCache(aiCache);
  }, [aiCache]);

  // 记住乱序顺序，刷新后保持同一套题序
  useEffect(() => {
    if (shuffledIds.length === allQuestions.length) saveShuffledIds(shuffledIds);
  }, [shuffledIds]);

  // 切换乱序时重新洗牌（首次加载已由 useState 初始化，避免顺序被再次打乱）
  useEffect(() => {
    if (settings.isShuffled && !wasShuffledRef.current) {
      setShuffledIds(shuffleQuestionIds(allQuestions.map((q) => q.id)));
    }
    wasShuffledRef.current = settings.isShuffled;
  }, [settings.isShuffled]);

  // 5. Filter Questions Pipeline
  const filteredQuestions = useMemo(
    () => buildFilteredQuestions(settings, userStatusMap, shuffledIds),
    [
      settings.isShuffled,
      shuffledIds,
      settings.filterType,
      settings.selectedTag,
      settings.mode,
      userStatusMap,
    ]
  );

  // Clamp current index when filter changes
  useEffect(() => {
    if (currentIndex >= filteredQuestions.length) {
      setCurrentIndex(Math.max(0, filteredQuestions.length - 1));
    }
  }, [filteredQuestions.length, currentIndex]);

  const currentQuestion: Question | undefined = filteredQuestions[currentIndex];
  const currentStatus: QuestionUserStatus | undefined = currentQuestion ? userStatusMap[currentQuestion.id] : undefined;

  // 记住当前模式下的题号，重开后原样恢复（两种模式各记一份）
  useEffect(() => {
    const id = currentQuestion?.id;
    currentQuestionIdRef.current = id;
    if (!id) return;
    saveLastQuestionId(settings.mode, id);
    setSettings((prev) => (prev.lastQuestionId === id ? prev : { ...prev, lastQuestionId: id }));
  }, [currentQuestion?.id, settings.mode]);

  /**
   * 把滚动位置写进滚动容器。
   * 懒加载的代码高亮、字体与实际排版会让卡片在首帧之后继续变高，
   * 一次性赋值容易被浏览器截断，所以随后几帧和内容尺寸变化时各补一次。
   */
  const restoreScrollTop = useCallback((top: number) => {
    const target = Math.max(0, Math.round(top));
    const apply = () => {
      if (mainRef.current) mainRef.current.scrollTop = target;
    };

    apply();

    let frames = 0;
    const tick = () => {
      apply();
      frames += 1;
      if (frames < 12) window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);

    const scroller = mainRef.current;
    const content = scroller?.firstElementChild as HTMLElement | null;
    if (!scroller || !content || typeof ResizeObserver === 'undefined') return;

    const startedAt = performance.now();
    const observer = new ResizeObserver(() => {
      if (performance.now() - startedAt > 2000) {
        observer.disconnect();
        return;
      }
      apply();
    });
    observer.observe(content);
    window.setTimeout(() => observer.disconnect(), 2200);

    // 用户一旦自己动手滚动，就不再回写位置，避免“抢滚动”
    const stop = () => observer.disconnect();
    scroller.addEventListener('wheel', stop, { once: true, passive: true });
    scroller.addEventListener('touchstart', stop, { once: true, passive: true });
  }, []);

  // 首次进入：回到当前模式上次的题号，并回到那道题上次读到的高度
  useLayoutEffect(() => {
    const id = currentQuestion?.id;
    if (!id) return;

    lastAppliedQuestionRef.current = id;
    liveScrollRef.current = { mode: settings.mode, id, top: 0 };

    // 无痕/隐私模式会禁用 localStorage，进度根本存不住，直接说明原因
    if (!isStorageAvailable()) {
      setStorageBlocked(true);
      return;
    }

    const savedTop = loadScrollTop(settings.mode, id);
    if (savedTop > 0) restoreScrollTop(savedTop);
    liveScrollRef.current = { mode: settings.mode, id, top: savedTop };

    // 停在第 1 题且没有滚动过 = 全新开始，不必打扰
    if (currentIndex > 0 || savedTop > 0) {
      setResumeHint({ index: currentIndex, hasScroll: savedTop > 0 });
    }
    // 只在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 切题：先把上一题读到的位置落盘，再恢复这一题自己的位置（没读过就回到顶部）
  useLayoutEffect(() => {
    const id = currentQuestion?.id;
    if (!id) return;

    const prevId = lastAppliedQuestionRef.current;
    if (prevId === id) return;

    if (prevId !== null) {
      const live = liveScrollRef.current;
      if (live.id === prevId && live.top > 0) saveScrollTop(live.mode, prevId, live.top);
    }

    lastAppliedQuestionRef.current = id;

    const targetTop = loadScrollTop(settings.mode, id);
    liveScrollRef.current = { mode: settings.mode, id, top: targetTop };
    restoreScrollTop(targetTop);
  }, [currentQuestion?.id, settings.mode, restoreScrollTop]);

  const handleMainScroll = useCallback(() => {
    const id = currentQuestionIdRef.current;
    const top = mainRef.current?.scrollTop ?? 0;
    liveScrollRef.current = { mode: settings.mode, id, top };

    if (scrollSaveTimer.current !== null) window.clearTimeout(scrollSaveTimer.current);
    scrollSaveTimer.current = window.setTimeout(() => {
      if (typeof id === 'number') saveScrollTop(settings.mode, id, top);
    }, 250);
  }, [settings.mode]);

  useEffect(() => {
    const persist = () => {
      const { mode, id, top } = liveScrollRef.current;
      if (typeof id === 'number') saveScrollTop(mode, id, top);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (scrollSaveTimer.current !== null) window.clearTimeout(scrollSaveTimer.current);
    };
  }, []);


  // 6. User Statistics Calculation
  const stats: UserStats = useMemo(() => {
    let answered = 0;
    let correct = 0;
    let wrong = 0;
    let starred = 0;

    Object.values(userStatusMap).forEach((s) => {
      if (s.answered) {
        answered++;
        if (s.isCorrect) correct++;
        else wrong++;
      }
      if (s.starred) starred++;
    });

    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    return {
      totalAnswered: answered,
      correctCount: correct,
      wrongCount: wrong,
      accuracy,
      starredCount: starred,
    };
  }, [userStatusMap]);

  // 7. Navigation Actions
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setSlideDirection('left');
      setCurrentIndex((prev) => prev - 1);
      playSound('flip', settings.soundEnabled);
      triggerHaptic('light');
    }
  }, [currentIndex, settings.soundEnabled]);

  const handleNext = useCallback(() => {
    if (currentIndex < filteredQuestions.length - 1) {
      setSlideDirection('right');
      setCurrentIndex((prev) => prev + 1);
      playSound('flip', settings.soundEnabled);
      triggerHaptic('light');
    } else if (currentIndex === filteredQuestions.length - 1 && filteredQuestions.length > 0) {
      // Completed the category!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  }, [currentIndex, filteredQuestions.length, settings.soundEnabled]);

  const handleJumpToQuestion = useCallback(
    (questionId: number) => {
      const idx = filteredQuestions.findIndex((q) => q.id === questionId);
      if (idx !== -1) {
        setSlideDirection(idx > currentIndex ? 'right' : 'left');
        setCurrentIndex(idx);
        playSound('click', settings.soundEnabled);
      } else {
        // If not in current filtered list, reset filters to show it
        setSettings((prev) => ({
          ...prev,
          mode: 'recite',
          filterType: 'all',
          selectedTag: 'all',
        }));
        setTimeout(() => {
          const newIdx = allQuestions.findIndex((q) => q.id === questionId);
          if (newIdx !== -1) {
            setCurrentIndex(newIdx);
          }
        }, 50);
      }
    },
    [filteredQuestions, currentIndex, settings.soundEnabled]
  );

  // 切换模式：背题 / 自测 各自回到自己上次停下的题号与阅读位置
  const handleModeChange = useCallback(
    (next: StudyMode) => {
      if (next === settings.mode) return;

      setSettings((prev) => ({ ...prev, mode: next }));

      const targetId = loadLastQuestionId(next);
      if (targetId) {
        const nextList = buildFilteredQuestions(
          { ...settings, mode: next },
          userStatusMap,
          shuffledIds
        );
        const idx = nextList.findIndex((q) => q.id === targetId);
        if (idx >= 0) {
          const savedTop = loadScrollTop(next, targetId);
          setSlideDirection('none');
          setCurrentIndex(idx);
          // 两种模式恰好停在同一道题时题号不变，切题逻辑不会触发，这里主动恢复
          lastAppliedQuestionRef.current = targetId;
          liveScrollRef.current = { mode: next, id: targetId, top: savedTop };
          restoreScrollTop(savedTop);
          // 停在同一道题时没什么好提示的，避免噪音
          if (idx !== currentIndex) {
            setResumeHint({
              index: idx,
              hasScroll: savedTop > 0,
              label: `已切到${MODE_LABELS[next]}上次进度`,
              allowRestart: false,
            });
          }
        }
      }

      playSound('click', settings.soundEnabled);
    },
    [settings, userStatusMap, shuffledIds, currentIndex, restoreScrollTop]
  );

  // 8. Answer Handlers
  const handleAnswerChoice = useCallback(
    (choice: string) => {
      if (!currentQuestion) return;
      const isCorrect = choice.toUpperCase() === currentQuestion.answer.trim().toUpperCase();

      setUserStatusMap((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          ...prev[currentQuestion.id],
          answered: true,
          userAnswer: choice,
          isCorrect,
          revealed: true,
          answeredAt: Date.now(),
        },
      }));

      if (isCorrect) {
        playSound('correct', settings.soundEnabled);
        triggerHaptic('light');
        if (settings.autoAdvance) {
          setTimeout(() => {
            handleNext();
          }, 360);
        }
      } else {
        playSound('wrong', settings.soundEnabled);
        triggerHaptic('error');
      }
    },
    [currentQuestion, settings.soundEnabled, settings.autoAdvance, handleNext]
  );

  const handleAnswerJudge = useCallback(
    (userJudge: boolean) => {
      if (!currentQuestion) return;
      const isCorrect = currentQuestion.is_correct === userJudge;

      setUserStatusMap((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          ...prev[currentQuestion.id],
          answered: true,
          userAnswer: userJudge ? '正确' : '错误',
          isCorrect,
          revealed: true,
          answeredAt: Date.now(),
        },
      }));

      if (isCorrect) {
        playSound('correct', settings.soundEnabled);
        triggerHaptic('light');
        if (settings.autoAdvance) {
          setTimeout(() => {
            handleNext();
          }, 360);
        }
      } else {
        playSound('wrong', settings.soundEnabled);
        triggerHaptic('error');
      }
    },
    [currentQuestion, settings.soundEnabled, settings.autoAdvance, handleNext]
  );

  const handleAnswerBlank = useCallback(
    (answers: string[]) => {
      if (!currentQuestion || !currentQuestion.blanks) return;

      const isAllFilled = answers.some((a) => a.trim().length > 0);
      const isCorrect = answers.every(
        (a, i) => a.trim().toLowerCase() === (currentQuestion.blanks?.[i] || '').trim().toLowerCase()
      );

      setUserStatusMap((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          ...prev[currentQuestion.id],
          answered: isAllFilled,
          userAnswer: answers,
          isCorrect,
          revealed: true,
          answeredAt: Date.now(),
        },
      }));

      if (isCorrect) {
        playSound('correct', settings.soundEnabled);
        triggerHaptic('light');
      } else {
        playSound('click', settings.soundEnabled);
      }
    },
    [currentQuestion, settings.soundEnabled]
  );

  // Toggle Star
  const handleToggleStar = useCallback(() => {
    if (!currentQuestion) return;
    setUserStatusMap((prev) => {
      const current = prev[currentQuestion.id];
      const isStarred = !current?.starred;
      return {
        ...prev,
        [currentQuestion.id]: {
          ...current,
          answered: current?.answered || false,
          starred: isStarred,
        },
      };
    });
    playSound('click', settings.soundEnabled);
    triggerHaptic('light');
  }, [currentQuestion, settings.soundEnabled]);

  // Toggle Reveal / Analysis
  const handleToggleReveal = useCallback(() => {
    if (!currentQuestion) return;
    setUserStatusMap((prev) => {
      const current = prev[currentQuestion.id];
      const isRevealed = !current?.revealed;
      return {
        ...prev,
        [currentQuestion.id]: {
          ...current,
          answered: current?.answered || false,
          revealed: isRevealed,
        },
      };
    });
    playSound('click', settings.soundEnabled);
  }, [currentQuestion, settings.soundEnabled]);

  // Reset Current Question
  const handleResetCurrent = useCallback(() => {
    if (!currentQuestion) return;
    setUserStatusMap((prev) => {
      const copy = { ...prev };
      delete copy[currentQuestion.id];
      return copy;
    });
    playSound('click', settings.soundEnabled);
  }, [currentQuestion, settings.soundEnabled]);

  // Open "重新做题" confirmation dialog
  const handleResetAllProgress = useCallback(() => {
    setIsResetOpen(true);
    playSound('click', settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Reset All Progress: 清空历史记录并从第 1 题重新开始
  const handleConfirmReset = useCallback(
    ({ keepStarred }: { keepStarred: boolean }) => {
      clearAllProgress();
      clearScrollMap();
      clearLastQuestionIds();
      setResumeHint(null);

      setUserStatusMap((prev) => {
        if (!keepStarred) return {};
        // 只保留收藏标记，答题对错与解析展开状态全部清空
        const next: Record<number, QuestionUserStatus> = {};
        Object.entries(prev).forEach(([id, status]) => {
          if (status.starred) {
            next[Number(id)] = { answered: false, starred: true };
          }
        });
        return next;
      });

      // 回到全部题目、第 1 题；错题本/收藏夹被清空后不再停留在空列表
      setSettings((prev) => ({
        ...prev,
        filterType: 'all',
        selectedTag: 'all',
        mode:
          prev.mode === 'wrong' || (prev.mode === 'starred' && !keepStarred)
            ? 'recite'
            : prev.mode,
      }));
      setCurrentIndex(0);
      setSlideDirection('none');
      setIsResetOpen(false);
      setIsSheetOpen(false);

      // 乱序模式下重新洗牌，保证新一轮顺序是全新的
      if (settings.isShuffled) {
        const ids = allQuestions.map((q) => q.id);
        for (let i = ids.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        setShuffledIds(ids);
      }

      playSound('click', settings.soundEnabled);
      triggerHaptic('light');
    },
    [settings.isShuffled, settings.soundEnabled]
  );

  // 续刷提示里的“从头开始”：清空阅读位置并回到第 1 题顶部，不改变做题记录
  const handleResumeRestart = useCallback(() => {
    clearScrollMap();
    liveScrollRef.current = { mode: settings.mode, id: currentQuestion?.id, top: 0 };
    // 已经停在第 1 题时 setCurrentIndex 不会触发切题逻辑，这里直接把位置归零
    restoreScrollTop(0);
    setSlideDirection('none');
    setCurrentIndex(0);
    setResumeHint(null);
    playSound('click', settings.soundEnabled);
  }, [currentQuestion?.id, restoreScrollTop, settings.soundEnabled]);

  // AI 深度解析：未配置时先打开设置
  const handleOpenAi = useCallback(() => {
    if (!currentQuestion) return;
    const isLocalEndpoint = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(aiConfig.baseUrl);
    const needsSetup =
      !aiConfig.baseUrl.trim() ||
      !aiConfig.model.trim() ||
      (!aiConfig.apiKey.trim() && !isLocalEndpoint);
    if (needsSetup) {
      setIsAiSettingsOpen(true);
      return;
    }
    setAiQuestion(currentQuestion);
    playSound('click', settings.soundEnabled);
  }, [currentQuestion, aiConfig, settings.soundEnabled]);

  const handleSaveAiConfig = useCallback(
    (next: AiConfig) => {
      setAiConfig(next);
      playSound('click', settings.soundEnabled);
    },
    [settings.soundEnabled]
  );

  const handleAiSaved = useCallback((questionId: number, entry: AiCacheEntry) => {
    setAiCache((prev) => pruneAiCache({ ...prev, [questionId]: entry }));
  }, []);

  const handleClearAiCache = useCallback(() => {
    clearAiCache();
    setAiCache({});
  }, []);

  // 手机端筛选抽屉：一键重置
  const handleResetFilters = useCallback(() => {
    setSettings((prev) => ({ ...prev, filterType: 'all', selectedTag: 'all', isShuffled: false }));
    playSound('click', settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Cycle Theme
  const handleThemeCycle = useCallback(() => {
    const nextTheme: 'light' | 'dark' | 'green' =
      settings.theme === 'light' ? 'dark' : settings.theme === 'dark' ? 'green' : 'light';
    setSettings((prev) => ({ ...prev, theme: nextTheme }));
    playSound('click', settings.soundEnabled);
  }, [settings.theme, settings.soundEnabled]);

  // 9. Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in form inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        isSearchOpen
      ) {
        return;
      }

      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsSheetOpen(false);
        setIsShortcutsOpen(false);
        setIsResetOpen(false);
        setIsAiSettingsOpen(false);
        setAiQuestion(null);
        setIsFilterOpen(false);
        setIsMoreOpen(false);
        return;
      }

      // 确认弹窗、AI 弹窗打开时，屏蔽其他快捷键，避免误操作
      if (isResetOpen || isAiSettingsOpen || aiQuestion || isFilterOpen || isMoreOpen) return;

      // Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      const key = e.key.toUpperCase();

      // Navigation
      if (e.key === 'ArrowRight' || key === 'K') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || key === 'J') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ') {
        // Space bar
        e.preventDefault();
        if (settings.mode === 'recite' || currentStatus?.answered || currentStatus?.revealed) {
          handleNext();
        } else {
          handleToggleReveal();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (key === 'S') {
        e.preventDefault();
        handleToggleStar();
      } else if (key === 'R') {
        e.preventDefault();
        handleResetCurrent();
      } else if (key === 'M') {
        e.preventDefault();
        handleModeChange(settings.mode === 'recite' ? 'practice' : 'recite');
      }

      // Choice answers (A, B, C, D or 1, 2, 3, 4)
      if (currentQuestion?.type === 'choice' && settings.mode !== 'recite' && !currentStatus?.answered) {
        if (['A', 'B', 'C', 'D'].includes(key)) {
          e.preventDefault();
          handleAnswerChoice(key);
        } else if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          const map: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
          handleAnswerChoice(map[e.key]);
        }
      }

      // Judge answers (T, F or 1, 2)
      if (currentQuestion?.type === 'judge' && settings.mode !== 'recite' && !currentStatus?.answered) {
        if (key === 'T' || e.key === '1') {
          e.preventDefault();
          handleAnswerJudge(true);
        } else if (key === 'F' || e.key === '2') {
          e.preventDefault();
          handleAnswerJudge(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isSearchOpen,
    isResetOpen,
    isAiSettingsOpen,
    aiQuestion,
    isFilterOpen,
    isMoreOpen,
    settings.mode,
    currentQuestion,
    currentStatus,
    handleNext,
    handlePrev,
    handleToggleReveal,
    handleToggleStar,
    handleResetCurrent,
    handleAnswerChoice,
    handleAnswerJudge,
    handleModeChange,
  ]);

  // 10. Mobile Touch Gestures
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Horizontal swipe threshold: 55px, vertical max: 60px
    if (Math.abs(deltaX) > 55 && Math.abs(deltaY) < 60) {
      if (deltaX < 0) {
        // Swipe Left -> Next
        handleNext();
      } else {
        // Swipe Right -> Prev
        handlePrev();
      }
    }
  };

  const isCurrentRevealed =
    settings.mode === 'recite' || !!currentStatus?.revealed || !!currentStatus?.answered;

  return (
    <div className="h-screen h-[100dvh] w-screen overflow-hidden flex flex-col bg-background text-foreground select-none relative">
      {/* 1. Navbar Header */}
      <Header
        mode={settings.mode}
        onModeChange={handleModeChange}
        wrongCount={stats.wrongCount}
        starredCount={stats.starredCount}
        theme={settings.theme}
        onThemeCycle={handleThemeCycle}
        soundEnabled={settings.soundEnabled}
        onSoundToggle={() =>
          setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
        }
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSheet={() => setIsSheetOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onResetProgress={handleResetAllProgress}
        onOpenAiSettings={() => setIsAiSettingsOpen(true)}
        onOpenFilter={() => setIsFilterOpen(true)}
        onOpenMore={() => setIsMoreOpen(true)}
        filterActive={
          settings.filterType !== 'all' || settings.selectedTag !== 'all' || settings.isShuffled
        }
      />

      {/* 2. Progress Tracker Sub-bar */}
      <ProgressBar stats={stats} totalQuestions={allQuestions.length} />

      {/* 3. Question Filter Pill Bar (桌面端；手机端收进筛选抽屉) */}
      <div className="hidden md:block">
        <FilterBar
          filterType={settings.filterType}
          onFilterTypeChange={(ft) => setSettings((prev) => ({ ...prev, filterType: ft }))}
          selectedTag={settings.selectedTag}
          onTagChange={(st) => setSettings((prev) => ({ ...prev, selectedTag: st }))}
          allTags={allTags}
          isShuffled={settings.isShuffled}
          onShuffleToggle={() =>
            setSettings((prev) => ({ ...prev, isShuffled: !prev.isShuffled }))
          }
        />
      </div>

      {/* 4. Central Viewport (固定视口容器，绝不让外部跳动；内容卡片平滑横向滑动) */}
      <main
        ref={mainRef}
        onScroll={handleMainScroll}
        className="flex-1 overflow-y-auto px-2.5 sm:px-6 py-2 sm:py-4 flex flex-col justify-start pb-28 md:pb-8 no-scrollbar"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile: 当前专项模式提示（错题本 / 收藏夹） */}
        {(settings.mode === 'wrong' || settings.mode === 'starred') && (
          <div className="md:hidden mb-2 flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              {settings.mode === 'wrong' ? (
                <XCircle className="h-4 w-4 text-rose-500" />
              ) : (
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              )}
              {settings.mode === 'wrong' ? '错题本' : '收藏夹'}
              <span className="font-normal text-muted-foreground">· {filteredQuestions.length} 题</span>
            </span>
            <button
              onClick={() => handleModeChange('practice')}
              className="text-[11px] font-medium text-primary active:opacity-70"
            >
              退出
            </button>
          </div>
        )}

        {currentQuestion ? (
          <QuestionCard
            question={currentQuestion}
            currentIndex={currentIndex}
            totalFiltered={filteredQuestions.length}
            mode={settings.mode}
            userStatus={currentStatus}
            slideDirection={slideDirection}
            onAnswerChoice={handleAnswerChoice}
            onAnswerJudge={handleAnswerJudge}
            onAnswerBlank={handleAnswerBlank}
            onToggleStar={handleToggleStar}
            onToggleReveal={handleToggleReveal}
            onOpenAi={handleOpenAi}
            aiCached={!!aiCache[currentQuestion.id]}
          />
        ) : (
          <div className="w-full max-w-md mx-auto my-auto p-8 rounded-xl border bg-card text-center space-y-3">
            <h3 className="font-semibold text-base text-foreground">
              {settings.mode === 'wrong'
                ? '太棒了！错题本为空 👏'
                : settings.mode === 'starred'
                ? '暂无收藏的题目'
                : '没有找到匹配的题目'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {settings.mode === 'wrong'
                ? '你已经全部消灭了错题，继续做题自测吧！'
                : settings.mode === 'starred'
                ? '做题过程中点击题目右上角的“收藏”按钮，重点题目会归档在此处。'
                : '请尝试重置筛选类型或考点分类。'}
            </p>
            <button
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  mode: 'recite',
                  filterType: 'all',
                  selectedTag: 'all',
                }))
              }
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
            >
              返回全部题目 (320 题)
            </button>
          </div>
        )}

        {/* 5. Desktop Navigation Action Bar */}
        {currentQuestion && (
          <div className="mt-4">
            <DesktopNav
              onPrev={handlePrev}
              onNext={handleNext}
              onToggleAnalysis={handleToggleReveal}
              onResetCurrent={handleResetCurrent}
              isRevealed={isCurrentRevealed}
              autoAdvance={settings.autoAdvance}
              onAutoAdvanceToggle={(val) =>
                setSettings((prev) => ({ ...prev, autoAdvance: val }))
              }
              canPrev={currentIndex > 0}
              canNext={currentIndex < filteredQuestions.length - 1}
            />
          </div>
        )}
      </main>

      {/* 6. Mobile Bottom Thumb Bar (手机端吸底导航) */}
      {currentQuestion && (
        <MobileBottomBar
          onPrev={handlePrev}
          onNext={handleNext}
          onToggleAnalysis={handleToggleReveal}
          onOpenSheet={() => setIsSheetOpen(true)}
          onToggleStar={handleToggleStar}
          isStarred={!!currentStatus?.starred}
          canPrev={currentIndex > 0}
          canNext={currentIndex < filteredQuestions.length - 1}
        />
      )}

      {/* 7. Sheet: 320 Question Matrix Drawer */}
      <AnswerSheetDrawer
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        questions={allQuestions}
        currentQuestionId={currentQuestion?.id || 1}
        userStatusMap={userStatusMap}
        onSelectQuestion={handleJumpToQuestion}
        onResetProgress={handleResetAllProgress}
      />

      {/* 8. Command Palette: Instant ⌘K Search */}
      <CommandSearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        questions={allQuestions}
        onSelectQuestion={handleJumpToQuestion}
      />

      {/* 9. Shortcuts & Gestures Dialog */}
      <ShortcutsDialog
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* 10. Reset Progress Confirmation Dialog */}
      <ResetProgressDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        stats={stats}
        onConfirm={handleConfirmReset}
      />

      {/* 11. AI Explanation Panel（按需加载） */}
      {aiQuestion && (
        <Suspense fallback={null}>
          <AiExplanationPanel
            isOpen
            question={aiQuestion}
            questionNumber={allQuestions.findIndex((q) => q.id === aiQuestion.id) + 1}
            config={aiConfig}
            cached={aiCache[aiQuestion.id]}
            onClose={() => setAiQuestion(null)}
            onOpenSettings={() => setIsAiSettingsOpen(true)}
            onSaved={handleAiSaved}
          />
        </Suspense>
      )}

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filterType={settings.filterType}
        onFilterTypeChange={(ft) => setSettings((prev) => ({ ...prev, filterType: ft }))}
        selectedTag={settings.selectedTag}
        onTagChange={(st) => setSettings((prev) => ({ ...prev, selectedTag: st }))}
        allTags={allTags}
        isShuffled={settings.isShuffled}
        onShuffleToggle={() =>
          setSettings((prev) => ({ ...prev, isShuffled: !prev.isShuffled }))
        }
        resultCount={filteredQuestions.length}
        totalCount={allQuestions.length}
        scopeLabel={
          settings.mode === 'wrong' ? '错题本' : settings.mode === 'starred' ? '收藏夹' : undefined
        }
        onReset={handleResetFilters}
      />

      {/* Mobile More Sheet */}
      <MobileMoreSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        mode={settings.mode}
        onModeChange={handleModeChange}
        wrongCount={stats.wrongCount}
        starredCount={stats.starredCount}
        theme={settings.theme}
        onThemeChange={(t) => setSettings((prev) => ({ ...prev, theme: t }))}
        soundEnabled={settings.soundEnabled}
        onSoundToggle={() => setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
        autoAdvance={settings.autoAdvance}
        onAutoAdvanceToggle={() => setSettings((prev) => ({ ...prev, autoAdvance: !prev.autoAdvance }))}
        onOpenAiSettings={() => setIsAiSettingsOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onResetProgress={handleResetAllProgress}
      />

      {/* 12. AI Settings Dialog */}
      <AiSettingsDialog
        isOpen={isAiSettingsOpen}
        config={aiConfig}
        cacheCount={Object.keys(aiCache).length}
        onClose={() => setIsAiSettingsOpen(false)}
        onSave={handleSaveAiConfig}
        onClearCache={handleClearAiCache}
      />

      {/* 13. 续刷提示：二次打开 / 切回某模式时明确告知已回到上次进度 */}
      {resumeHint && (
        <ResumeHint
          index={resumeHint.index}
          total={filteredQuestions.length}
          hasScroll={resumeHint.hasScroll}
          label={resumeHint.label}
          onRestart={resumeHint.allowRestart === false ? undefined : handleResumeRestart}
          onDismiss={() => setResumeHint(null)}
        />
      )}

      {/* 14. 本地存储被禁用（无痕模式）时的说明 */}
      {storageBlocked && <StorageBlockedHint onDismiss={() => setStorageBlocked(false)} />}
    </div>
  );
};

export default App;
