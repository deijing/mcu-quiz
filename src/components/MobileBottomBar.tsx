import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Grid3X3, 
  Star 
} from 'lucide-react';

interface MobileBottomBarProps {
  onPrev: () => void;
  onNext: () => void;
  onToggleAnalysis: () => void;
  onOpenSheet: () => void;
  onToggleStar: () => void;
  isStarred: boolean;
  canPrev: boolean;
  canNext: boolean;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  onPrev,
  onNext,
  onToggleAnalysis,
  onOpenSheet,
  onToggleStar,
  isStarred,
  canPrev,
  canNext,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/70 pb-safe select-none shadow-lg">
      <div className="flex items-center justify-between px-2.5 h-[58px] max-w-lg mx-auto gap-1.5">
        {/* Left Utility Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-around">
          {/* 1. 上一题 */}
          <button
            onClick={onPrev}
            disabled={!canPrev}
            className="flex flex-col items-center justify-center h-12 min-w-[48px] px-1.5 text-muted-foreground disabled:opacity-25 active:scale-90 transition-all"
            title="上一题"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-0.5">上一题</span>
          </button>

          {/* 2. 看解析 */}
          <button
            onClick={onToggleAnalysis}
            className="flex flex-col items-center justify-center h-12 min-w-[48px] px-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
            title="展开/收起答案与解析"
          >
            <Eye className="h-5 w-5 text-amber-500" />
            <span className="text-[10px] font-medium mt-0.5">看解析</span>
          </button>

          {/* 3. 答题卡 */}
          <button
            onClick={onOpenSheet}
            className="flex flex-col items-center justify-center h-12 min-w-[48px] px-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
            title="打开 320 题答题卡抽屉"
          >
            <Grid3X3 className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-0.5">答题卡</span>
          </button>

          {/* 4. 收藏 */}
          <button
            onClick={onToggleStar}
            className={`flex flex-col items-center justify-center h-12 min-w-[48px] px-1.5 active:scale-90 transition-all ${
              isStarred ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'
            }`}
            title="收藏本题"
          >
            <Star className={`h-5 w-5 ${isStarred ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span className="text-[10px] font-medium mt-0.5">{isStarred ? '已收藏' : '收藏'}</span>
          </button>
        </div>

        {/* Right: Ergonomic "下一题" Capsule Button */}
        <button
          onClick={onNext}
          disabled={!canNext}
          className="h-11 px-5 rounded-full bg-primary text-primary-foreground font-semibold text-[13px] flex items-center justify-center gap-1 shadow-sm active:scale-95 disabled:opacity-30 transition-all shrink-0"
        >
          <span>下一题</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
