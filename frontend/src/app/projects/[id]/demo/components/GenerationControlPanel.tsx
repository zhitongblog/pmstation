'use client';

import { useDemoStore } from '@/stores/demoStore';
import {
  CheckCircle,
  AlertCircle,
  SkipForward,
  Circle,
  RefreshCw,
  Pause,
  Play,
  Loader2,
} from 'lucide-react';

interface GenerationControlPanelProps {
  onRetryAllFailed: () => void;
  onPause: () => void;
  onResume: () => void;
  isRetrying?: boolean;
}

export function GenerationControlPanel({
  onRetryAllFailed,
  onPause,
  onResume,
  isRetrying = false,
}: GenerationControlPanelProps) {
  const { isGenerating, isPaused, getStatusStats, getFailedPages } = useDemoStore();
  const stats = getStatusStats();
  const failedPages = getFailedPages();

  // Don't show if no pages exist
  if (stats.total === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
      {/* Status statistics */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span>{stats.completed} 完成</span>
        </div>

        {stats.error > 0 && (
          <div className="flex items-center gap-1.5 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span>{stats.error} 失败</span>
          </div>
        )}

        {stats.skipped > 0 && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <SkipForward className="w-4 h-4" />
            <span>{stats.skipped} 跳过</span>
          </div>
        )}

        {(stats.pending > 0 || stats.generating > 0) && (
          <div className="flex items-center gap-1.5 text-gray-400">
            <Circle className="w-4 h-4" />
            <span>{stats.pending + stats.generating} 待生成</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Retry all failed button */}
        {stats.error > 0 && (
          <button
            onClick={onRetryAllFailed}
            disabled={isGenerating || isRetrying}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRetrying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            重试失败 ({stats.error})
          </button>
        )}

        {/* Pause/Resume button - only show during generation */}
        {isGenerating && (
          <button
            onClick={isPaused ? onResume : onPause}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isPaused
                ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4" />
                继续
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                暂停
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
