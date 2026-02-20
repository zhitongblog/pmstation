'use client';

import { useEffect, useRef, useState } from 'react';
import { useDemoStore } from '@/stores/demoStore';
import {
  Monitor,
  Smartphone,
  RefreshCw,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Loader2,
} from 'lucide-react';

interface DemoPreviewProps {
  onNavigate?: (pageId: string, stateChanges?: Record<string, any>) => void;
}

export function DemoPreview({ onNavigate }: DemoPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const {
    currentPlatform,
    getCurrentPage,
    generatingPageCode,
    sharedState,
    navigationHistory,
    goBack,
    updateSharedState,
    navigateToPage,
  } = useDemoStore();

  const currentPage = getCurrentPage();
  const pageId = currentPage?.id || '';

  // Get code: either from completed page or from generating buffer
  const code = currentPage?.code || generatingPageCode[pageId] || '';

  // Generate iframe content
  const generateIframeContent = (componentCode: string) => {
    // Escape the code for embedding
    const escapedCode = componentCode
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    #root { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    // Shared state from parent
    const sharedState = ${JSON.stringify(sharedState)};

    // Navigation helper
    function navigateTo(pageId, stateChanges = {}) {
      window.parent.postMessage({ type: 'navigate', pageId, stateChanges }, '*');
    }

    // Update state helper
    function updateState(changes) {
      window.parent.postMessage({ type: 'updateState', changes }, '*');
    }

    // Component code
    ${componentCode}

    // Try to find and render the component
    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));

      // Find the default export or first component
      const componentNames = Object.keys(window).filter(key =>
        typeof window[key] === 'function' &&
        /^[A-Z]/.test(key) &&
        key !== 'React' &&
        key !== 'ReactDOM'
      );

      // Try common component names
      const possibleNames = ['App', 'Page', 'Component', ...componentNames];
      let Component = null;

      for (const name of possibleNames) {
        if (typeof window[name] === 'function') {
          Component = window[name];
          break;
        }
      }

      if (Component) {
        root.render(<Component sharedState={sharedState} navigateTo={navigateTo} updateState={updateState} />);
      } else {
        root.render(<div className="p-8 text-center text-gray-500">No component found to render</div>);
      }
    } catch (error) {
      console.error('Render error:', error);
      document.getElementById('root').innerHTML = '<div class="p-8 text-center text-red-500">Error: ' + error.message + '</div>';
    }
  </script>
</body>
</html>
    `;
  };

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'navigate') {
        const { pageId, stateChanges } = event.data;
        if (onNavigate) {
          onNavigate(pageId, stateChanges);
        } else {
          navigateToPage(pageId, stateChanges);
        }
      } else if (event.data.type === 'updateState') {
        updateSharedState(event.data.changes);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onNavigate, navigateToPage, updateSharedState]);

  // Update iframe content when code changes
  useEffect(() => {
    if (iframeRef.current && code) {
      setIsLoading(true);
      const content = generateIframeContent(code);
      const blob = new Blob([content], { type: 'text/html' });
      iframeRef.current.src = URL.createObjectURL(blob);

      iframeRef.current.onload = () => {
        setIsLoading(false);
      };
    }
  }, [code, sharedState]);

  const refreshPreview = () => {
    if (iframeRef.current && code) {
      setIsLoading(true);
      const content = generateIframeContent(code);
      const blob = new Blob([content], { type: 'text/html' });
      iframeRef.current.src = URL.createObjectURL(blob);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Device frame dimensions
  const frameWidth = currentPlatform === 'mobile' ? 375 : '100%';
  const frameHeight = currentPlatform === 'mobile' ? 667 : 600;

  if (!currentPage && !generatingPageCode[pageId]) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">选择一个页面开始预览</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col bg-gray-100 rounded-lg overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          {/* Back button */}
          {navigationHistory.length > 0 && (
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
          )}

          {/* Current page info */}
          <div className="flex items-center gap-2">
            {currentPlatform === 'mobile' ? (
              <Smartphone className="w-4 h-4 text-gray-400" />
            ) : (
              <Monitor className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm text-gray-600">
              {currentPage?.name || '加载中...'}
            </span>
            <span className="text-xs text-gray-400">
              {currentPage?.path}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshPreview}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="刷新预览"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div
          className={`relative bg-white shadow-lg rounded-lg overflow-hidden ${
            currentPlatform === 'mobile' ? 'border-8 border-gray-800 rounded-3xl' : ''
          }`}
          style={{
            width: frameWidth,
            height: isFullscreen ? 'calc(100vh - 100px)' : frameHeight,
            maxWidth: '100%',
          }}
        >
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
          )}

          {/* Generating indicator */}
          {generatingPageCode[pageId] && (
            <div className="absolute top-2 right-2 flex items-center gap-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded z-10">
              <Loader2 className="w-3 h-3 animate-spin" />
              生成中...
            </div>
          )}

          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title="Demo Preview"
          />
        </div>
      </div>
    </div>
  );
}
