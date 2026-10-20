import React from 'react';
import { X, Keyboard, Smartphone, Zap } from 'lucide-react';
import { Button } from './ui/button';

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'A / B / C / D', desc: '单选题直接选择对应选项' },
    { key: 'T / F', desc: '判断题选择 正确(True) / 错误(False)' },
    { key: '1 / 2 / 3 / 4', desc: '单选选项 1~4 对应 A~D' },
    { key: '空格键 (Space)', desc: '展开/收起解析；做完后按空格切下一题' },
    { key: '→ 或 K 或 回车', desc: '跳到下一题' },
    { key: '← 或 J', desc: '返回上一题' },
    { key: 'S', desc: '收藏 / 取消收藏本题' },
    { key: 'R', desc: '重做本题' },
    { key: 'M', desc: '快速切换【背题速记】与【做题自测】模式' },
    { key: '⌘K 或 Ctrl+K', desc: '唤起题库全量全局搜索' },
    { key: 'ESC', desc: '关闭弹窗与抽屉' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-md bg-card border rounded-xl shadow-2xl p-5 z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base text-foreground">
              快捷键与手势指南
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground h-7 w-7 rounded flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Desktop shortcuts */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> 电脑桌面端 · 极速盲刷快捷键
          </h4>
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {shortcuts.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 text-xs"
              >
                <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono font-semibold text-foreground">
                  {s.key}
                </kbd>
                <span className="text-muted-foreground">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile gestures */}
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5 text-sky-500" /> 手机端 · 触屏手势
          </h4>
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/40 p-2.5 rounded-lg leading-relaxed">
            <p>• <strong>向左滑动</strong>：直接翻入下一题</p>
            <p>• <strong>向右滑动</strong>：返回上一题</p>
            <p>• <strong>底部导航</strong>：单手大拇指快速点击切题、查看解析、查看答题卡</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose} size="sm">
            我知道了
          </Button>
        </div>
      </div>
    </div>
  );
};
