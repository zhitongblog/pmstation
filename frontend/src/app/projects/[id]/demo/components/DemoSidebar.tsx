'use client';

import { useDemoStore } from '@/stores/demoStore';
import {
  Monitor,
  Smartphone,
  FileCode,
  Loader2,
  CheckCircle,
  AlertCircle,
  Circle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

export function DemoSidebar() {
  const {
    platforms,
    currentPlatform,
    currentPageId,
    setCurrentPlatform,
    setCurrentPageId,
    generatingPageCode,
  } = useDemoStore();

  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(
    new Set(platforms.map((p) => p.type))
  );

  const togglePlatform = (platformType: string) => {
    const newExpanded = new Set(expandedPlatforms);
    if (newExpanded.has(platformType)) {
      newExpanded.delete(platformType);
    } else {
      newExpanded.add(platformType);
    }
    setExpandedPlatforms(newExpanded);
  };

  const getStatusIcon = (status: string, pageId: string) => {
    // Check if currently generating
    if (generatingPageCode[pageId]) {
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    }

    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'generating':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-300" />;
    }
  };

  const getPlatformIcon = (type: string) => {
    return type === 'pc' ? (
      <Monitor className="w-4 h-4" />
    ) : (
      <Smartphone className="w-4 h-4" />
    );
  };

  const getPlatformLabel = (type: string, subtype: string) => {
    if (type === 'pc') {
      return subtype === 'admin' ? 'PC 端 (管理后台)' : 'PC 端';
    }
    return subtype === 'user' ? '移动端 (用户端)' : '移动端';
  };

  if (platforms.length === 0) {
    return (
      <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
        <div className="text-sm text-gray-500">等待生成结构...</div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">页面结构</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {platforms.map((platform) => {
          const isExpanded = expandedPlatforms.has(platform.type);
          const sortedPages = [...platform.pages].sort((a, b) => a.order - b.order);

          return (
            <div key={platform.type} className="border-b border-gray-200">
              {/* Platform header */}
              <button
                onClick={() => {
                  togglePlatform(platform.type);
                  if (currentPlatform !== platform.type) {
                    setCurrentPlatform(platform.type);
                  }
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
                  currentPlatform === platform.type ? 'bg-gray-100' : ''
                }`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                {getPlatformIcon(platform.type)}
                <span className="text-sm font-medium text-gray-700">
                  {getPlatformLabel(platform.type, platform.subtype)}
                </span>
                <span className="ml-auto text-xs text-gray-400">
                  {platform.pages.length}
                </span>
              </button>

              {/* Pages */}
              {isExpanded && (
                <div className="pb-2">
                  {sortedPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => {
                        setCurrentPlatform(platform.type);
                        setCurrentPageId(page.id);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 pl-10 text-left text-sm transition-colors ${
                        currentPageId === page.id
                          ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {getStatusIcon(page.status, page.id)}
                      <FileCode className="w-4 h-4 text-gray-400" />
                      <div className="flex-1 truncate">
                        <div className="truncate">{page.name}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {page.path}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
