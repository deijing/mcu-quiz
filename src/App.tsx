import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  AppSettings 
} from './lib/storage';
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

export const App: React.FC = () => {
  // 1. Persistent Settings & State
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [userStatusMap, setUserStatusMap] = useState<Record<number, QuestionUserStatus>>(() => loadUserStatusMap());

  // 2. Navigation & Animation State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left' | 'none'>('none');

  // 3. Modals State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // 4. Stable Shuffled Order
  const [shuffledIds, setShuffledIds] = useState<number[]>([]);

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

  // Shuffle generator
  useEffect(() => {
    if (settings.isShuffled) {
      const ids = allQuestions.map((q) => q.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      setShuffledIds(ids);
    }
  }, [settings.isShuffled]);

  // 5. Filter Questions Pipeline
  const filteredQuestions = useMemo(() => {
    let list = [...allQuestions];

    // If shuffled
    if (settings.isShuffled && shuffledIds.length === allQuestions.length) {
      const map = new Map(allQuestions.map((q) => [q.id, q]));
      list = shuffledIds.map((id) => map.get(id)!).filter(Boolean);
    }

    // Filter by type
    if (settings.filterType !== 'all') {
      list = list.filter((q) => q.type === settings.filterType);
    }

    // Filter by tag
    if (settings.selectedTag !== 'all') {
      list = list.filter((q) => q.tags.includes(settings.selectedTag));
    }

    // Filter by mode
    if (settings.mode === 'wrong') {
      list = list.filter((q) => {
        const s = userStatusMap[q.id];
        return s?.answered && s?.isCorrect === false;
      });
    } else if (settings.mode === 'starred') {
      list = list.filter((q) => !!userStatusMap[q.id]?.starred);
    }

    return list;
  }, [settings.isShuffled, shuffledIds, settings.filterType, settings.selectedTag, settings.mode, userStatusMap]);

  // Clamp current index when filter changes
  useEffect(() => {
    if (currentIndex >= filteredQuestions.length) {
      setCurrentIndex(Math.max(0, filteredQuestions.length - 1));
    }
  }, [filteredQuestions.length, currentIndex]);

  const currentQuestion: Question | undefined = filteredQuestions[currentIndex];
  const currentStatus: QuestionUserStatus | undefined = currentQuestion ? userStatusMap[currentQuestion.id] : undefined;

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

  // Reset All Progress
  const handleResetAllProgress = useCallback(() => {
    if (window.confirm('确定要清空所有刷题记录与做题历史吗？此操作不可撤销。')) {
      clearAllProgress();
      setUserStatusMap({});
      setCurrentIndex(0);
      playSound('wrong', settings.soundEnabled);
    }
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

      // Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsSheetOpen(false);
        setIsShortcutsOpen(false);
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
        setSettings((prev) => ({
          ...prev,
          mode: prev.mode === 'recite' ? 'practice' : 'recite',
        }));
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
        onModeChange={(m) => setSettings((prev) => ({ ...prev, mode: m }))}
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
      />

      {/* 2. Progress Tracker Sub-bar */}
      <ProgressBar stats={stats} totalQuestions={allQuestions.length} />

      {/* 3. Question Filter Pill Bar */}
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

      {/* 4. Central Viewport (固定视口容器，绝不让外部跳动；内容卡片平滑横向滑动) */}
      <main
        className="flex-1 overflow-y-auto px-2.5 sm:px-6 py-2.5 sm:py-4 flex flex-col justify-start pb-28 md:pb-8 no-scrollbar"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile Swipe Hint */}
        <div className="flex md:hidden items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60 mb-2 select-none">
          <span>👈 左右滑动屏幕极速切题 👉</span>
        </div>

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
    </div>
  );
};

export default App;
