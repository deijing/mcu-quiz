import React from 'react';
import { 
  Zap, 
  BookOpen, 
  Pencil, 
  XCircle, 
  Star, 
  Search, 
  Grid3X3, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  RotateCcw,
  Leaf
} from 'lucide-react';
import { Button } from './ui/button';
import { TabsList, TabTrigger } from './ui/tabs';
import { StudyMode } from '../types/question';

interface HeaderProps {
  mode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
  wrongCount: number;
  starredCount: number;
  theme: 'light' | 'dark' | 'green';
  onThemeCycle: () => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  onOpenSearch: () => void;
  onOpenSheet: () => void;
  onOpenShortcuts: () => void;
  onResetProgress: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  wrongCount,
  starredCount,
  theme,
  onThemeCycle,
  soundEnabled,
  onSoundToggle,
  onOpenSearch,
  onOpenSheet,
  onOpenShortcuts,
  onResetProgress,
}) => {
  return (
    <header className="sticky top-0 z-40 h-12 md:h-14 w-full border-b bg-background/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 select-none">
      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
          <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="font-bold text-xs sm:text-sm tracking-tight text-foreground whitespace-nowrap">
              <span className="sm:hidden">刷题宝</span>
              <span className="hidden sm:inline">单片机刷题宝</span>
            </span>
            <span className="text-[10px] bg-primary/10 text-primary px-1 rounded font-semibold hidden lg:inline-block">
              320题
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground hidden lg:block">
            真题精析 · C51高频考点
          </span>
        </div>
      </div>

      {/* Mode Switcher */}
      {/* Desktop View: Full 4 Tabs */}
      <div className="hidden md:flex items-center">
        <TabsList className="h-8 p-0.5 bg-muted/80">
          <TabTrigger
            active={mode === 'recite'}
            onClick={() => onModeChange('recite')}
            className="gap-1.5 text-xs py-1 px-2.5"
            title="背题速记：直接看答案解析，快速刷完 (快捷键 M 切换)"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>背题速记</span>
          </TabTrigger>

          <TabTrigger
            active={mode === 'practice'}
            onClick={() => onModeChange('practice')}
            className="gap-1.5 text-xs py-1 px-2.5"
            title="做题自测：独立作答并即时判分 (快捷键 M 切换)"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>做题自测</span>
          </TabTrigger>

          <TabTrigger
            active={mode === 'wrong'}
            onClick={() => onModeChange('wrong')}
            className="gap-1.5 text-xs py-1 px-2.5"
            title="错题本：攻克做错的题目"
          >
            <XCircle className="h-3.5 w-3.5 text-destructive" />
            <span>错题</span>
            {wrongCount > 0 && (
              <span className="rounded-full bg-destructive/15 text-destructive font-bold text-[10px] px-1.5 py-0.1">
                {wrongCount}
              </span>
            )}
          </TabTrigger>

          <TabTrigger
            active={mode === 'starred'}
            onClick={() => onModeChange('starred')}
            className="gap-1.5 text-xs py-1 px-2.5"
            title="收藏夹：重点复习题目"
          >
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            <span>收藏</span>
            {starredCount > 0 && (
              <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[10px] px-1.5 py-0.1">
                {starredCount}
              </span>
            )}
          </TabTrigger>
        </TabsList>
      </div>

      {/* Mobile View: Compact 2-Option Segmented Control (背题 / 自测) */}
      <div className="flex md:hidden items-center shrink-0">
        <div className="flex items-center rounded-lg bg-muted p-0.5 border border-border/50 text-xs">
          <button
            onClick={() => onModeChange('recite')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
              mode === 'recite'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-3 w-3" />
            <span>背题</span>
          </button>
          <button
            onClick={() => onModeChange('practice')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
              mode === 'practice'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Pencil className="h-3 w-3" />
            <span>自测</span>
          </button>
        </div>
      </div>

      {/* Action Tools */}
      <div className="flex items-center gap-0.5 sm:gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSearch}
          title="题库全量搜索 (快捷键 ⌘K / Ctrl+K)"
          className="h-8 w-8 text-muted-foreground hover:text-foreground active:scale-95"
        >
          <Search className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSheet}
          title="打开 320 题答题卡抽屉"
          className="h-8 w-8 text-muted-foreground hover:text-foreground active:scale-95"
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onThemeCycle}
          title={`当前主题：${theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '护眼绿'}（点击切换）`}
          className="h-8 w-8 text-muted-foreground hover:text-foreground active:scale-95"
        >
          {theme === 'light' ? (
            <Sun className="h-4 w-4" />
          ) : theme === 'dark' ? (
            <Moon className="h-4 w-4 text-sky-400" />
          ) : (
            <Leaf className="h-4 w-4 text-emerald-500" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onSoundToggle}
          title={soundEnabled ? '音效已开启（点击关闭）' : '音效已关闭（点击开启）'}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:inline-flex"
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenShortcuts}
          title="键盘快捷键指引"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hidden md:inline-flex"
        >
          <Keyboard className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onResetProgress}
          title="重新做题：清空答题记录，从第 1 题重新开始"
          className="hidden min-[360px]:inline-flex h-8 px-2 sm:px-2.5 gap-1.5 rounded-full border-border/70 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden lg:inline text-xs font-medium">重新做题</span>
        </Button>
      </div>
    </header>
  );
};
