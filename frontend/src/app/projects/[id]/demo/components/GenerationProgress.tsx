'use client';

import { useDemoStore } from '@/stores/demoStore';
import { Loader2, CheckCircle, Code } from 'lucide-react';

export function GenerationProgress() {
  const { isGenerating, generationProgress, error } = useDemoStore();

  if (!isGenerating && generationProgress.totalPages === 0) {
    return null;
  }

  const progress =
    generationProgress.totalPages > 0
      ? (generationProgress.completedPages / generationProgress.totalPages) * 100
      : 0;

  const isComplete = generationProgress.completedPages === generationProgress.totalPages;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        {isGenerating ? (
          <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
        ) : isComplete ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <Code className="w-5 h-5 text-gray-500" />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">
              {isGenerating
                ? '正在生成 Demo...'
                : isComplete
                ? '生成完成'
                : '准备生成'}
            </span>
            <span className="text-sm text-gray-500">
              {generationProgress.completedPages} / {generationProgress.totalPages} 页面
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Current page */}
      {isGenerating && generationProgress.currentPageName && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>正在生成: {generationProgress.currentPageName}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
