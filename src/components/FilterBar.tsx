import React from 'react';
import { Shuffle, ListOrdered, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { QuestionFilterType } from '../types/question';
import { typeCounts } from '../data/questions';

interface FilterBarProps {
  filterType: QuestionFilterType;
  onFilterTypeChange: (type: QuestionFilterType) => void;
  selectedTag: string;
  onTagChange: (tag: string) => void;
  allTags: string[];
  isShuffled: boolean;
  onShuffleToggle: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filterType,
  onFilterTypeChange,
  selectedTag,
  onTagChange,
  allTags,
  isShuffled,
  onShuffleToggle,
}) => {
  const filterButtons: { type: QuestionFilterType; label: string; count: number }[] = [
    { type: 'all', label: '全部', count: typeCounts.all },
    { type: 'choice', label: '单选', count: typeCounts.choice },
    { type: 'blank', label: '填空', count: typeCounts.blank },
    { type: 'judge', label: '判断', count: typeCounts.judge },
    { type: 'qa', label: '简答', count: typeCounts.qa },
    { type: 'code', label: '程序', count: typeCounts.code },
  ];

  return (
    <div className="w-full bg-background border-b px-2.5 sm:px-6 py-1.5 shrink-0 select-none overflow-x-auto no-scrollbar">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 min-w-max">
        {/* Type pills */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {filterButtons.map((btn) => {
            const isActive = filterType === btn.type;
            return (
              <button
                key={btn.type}
                onClick={() => onFilterTypeChange(btn.type)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-95 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>{btn.label}</span>
                <span className={`text-[10px] ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground/80'}`}>
                  {btn.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right side controls: Tag select & Shuffle */}
        <div className="flex items-center gap-1.5">
          {/* Tag filter */}
          <div className="relative inline-flex items-center">
            <Filter className="absolute left-2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <select
              value={selectedTag}
              onChange={(e) => onTagChange(e.target.value)}
              className="h-7 pl-6 pr-2 rounded-full bg-muted/60 border border-input text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:bg-muted transition-colors"
            >
              <option value="all">考点 ({allTags.length})</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {/* Shuffle toggle */}
          <Button
            variant="outline"
            size="xs"
            onClick={onShuffleToggle}
            className="h-7 px-2.5 rounded-full gap-1 text-xs active:scale-95"
            title={isShuffled ? '当前为乱序模式，点击切换为顺序' : '当前为顺序模式，点击切换为乱序'}
          >
            {isShuffled ? (
              <>
                <Shuffle className="h-3 w-3 text-primary" />
                <span className="font-semibold text-primary text-[11px]">乱序</span>
              </>
            ) : (
              <>
                <ListOrdered className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px]">顺序</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
