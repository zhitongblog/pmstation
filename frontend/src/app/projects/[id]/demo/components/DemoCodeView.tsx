'use client';

import { useState } from 'react';
import { useDemoStore } from '@/stores/demoStore';
import { Copy, Check, Code, Loader2 } from 'lucide-react';

export function DemoCodeView() {
  const [copied, setCopied] = useState(false);

  const { getCurrentPage, generatingPageCode } = useDemoStore();

  const currentPage = getCurrentPage();
  const pageId = currentPage?.id || '';

  // Get code: either from completed page or from generating buffer
  const code = currentPage?.code || generatingPageCode[pageId] || '';
  const isGenerating = !!generatingPageCode[pageId];

  const handleCopy = async () => {
    if (code) {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!currentPage && !isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <Code className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">选择一个页面查看代码</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">
            {currentPage?.name || '加载中...'}.tsx
          </span>
          {isGenerating && (
            <span className="flex items-center gap-1 text-xs text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              生成中...
            </span>
          )}
        </div>

        <button
          onClick={handleCopy}
          disabled={!code}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-500" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              复制代码
            </>
          )}
        </button>
      </div>

      {/* Code area */}
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
          <code>{code || '// 等待生成代码...'}</code>
        </pre>

        {/* Cursor effect when generating */}
        {isGenerating && (
          <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}
