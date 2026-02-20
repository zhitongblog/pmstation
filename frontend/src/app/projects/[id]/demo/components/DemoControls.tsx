'use client';

import { useDemoStore } from '@/stores/demoStore';
import { Eye, Code, Columns, Wand2, RefreshCw, Loader2 } from 'lucide-react';

interface DemoControlsProps {
  onRegenerate: () => void;
  onOpenModify: () => void;
  isRegenerating: boolean;
}

export function DemoControls({
  onRegenerate,
  onOpenModify,
  isRegenerating,
}: DemoControlsProps) {
  const { viewMode, setViewMode, currentPageId, isGenerating } = useDemoStore();

  const viewModes = [
    { value: 'preview', label: '预览', icon: Eye },
    { value: 'code', label: '代码', icon: Code },
    { value: 'split', label: '分屏', icon: Columns },
  ] as const;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
      {/* View mode toggle */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
        {viewModes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => setViewMode(mode.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === mode.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <mode.icon className="w-4 h-4" />
            {mode.label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Modify button */}
        <button
          onClick={onOpenModify}
          disabled={!currentPageId || isGenerating || isRegenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wand2 className="w-4 h-4" />
          修改
        </button>

        {/* Regenerate button */}
        <button
          onClick={onRegenerate}
          disabled={!currentPageId || isGenerating || isRegenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRegenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isRegenerating ? '重新生成中...' : '重新生成'}
        </button>
      </div>
    </div>
  );
}
