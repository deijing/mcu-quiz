import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronRight, FileText } from 'lucide-react';
import { Question } from '../types/question';
import { Badge } from './ui/badge';

interface CommandSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  onSelectQuestion: (questionId: number) => void;
}

export const CommandSearchDialog: React.FC<CommandSearchDialogProps> = ({
  isOpen,
  onClose,
  questions,
  onSelectQuestion,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const cleanQuery = query.trim().toLowerCase();

  const results = cleanQuery
    ? questions.filter((q) => {
        if (q.id.toString() === cleanQuery) return true;
        if (q.stem.toLowerCase().includes(cleanQuery)) return true;
        if (q.analysis.toLowerCase().includes(cleanQuery)) return true;
        if (q.tags.some((t) => t.toLowerCase().includes(cleanQuery))) return true;
        if (q.options && Object.values(q.options).some((v) => v.toLowerCase().includes(cleanQuery)))
          return true;
        return false;
      }).slice(0, 30)
    : [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      onSelectQuestion(results[selectedIndex].id);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      <div className="relative w-full max-w-2xl bg-card border rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Search Input */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-background">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入题目考点、关键词（如 8086、SCON、波特率、TMOD、中断）..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              清空
            </button>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground h-7 w-7 rounded flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-border/40">
          {cleanQuery && results.length > 0 && (
            results.map((q, idx) => (
              <div
                key={q.id}
                onClick={() => {
                  onSelectQuestion(q.id);
                  onClose();
                }}
                className={`p-3 rounded-lg cursor-pointer transition-colors text-left flex items-start justify-between gap-3 ${
                  idx === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground">
                      第 {q.id} 题
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                      {q.type_name}
                    </Badge>
                    {q.tags[0] && (
                      <span className="text-[11px] text-muted-foreground">
                        {q.tags[0]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed">
                    {q.stem}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              </div>
            ))
          )}

          {cleanQuery && results.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              未找到与 “{query}” 相关的题目
            </div>
          )}

          {!cleanQuery && (
            <div className="py-8 px-4 text-center text-xs text-muted-foreground space-y-2">
              <p>支持按题号（如 150）、关键词（如 8086、串口、定时器、寄存器）即时全局检索。</p>
              <div className="flex justify-center gap-1.5 pt-2 flex-wrap">
                {['8086', '中断系统', 'TMOD', 'SCON', '波特率', '寻址方式'].map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => setQuery(keyword)}
                    className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-muted/30 border-t flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            按 <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">↓</kbd> 选择
          </span>
          <span>
            按 <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">回车</kbd> 直达本题
          </span>
          <span>
            按 <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">ESC</kbd> 退出
          </span>
        </div>
      </div>
    </div>
  );
};
