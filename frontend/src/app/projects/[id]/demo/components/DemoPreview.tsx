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
  const rawCode = currentPage?.code || generatingPageCode[pageId] || '';

  // Clean up code for browser execution
  const cleanCodeForBrowser = (code: string): string => {
    let cleaned = code;

    // Remove import statements
    cleaned = cleaned.replace(/^import\s+.*?;?\s*$/gm, '');
    cleaned = cleaned.replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?\s*$/gm, '');

    // Find component names before removing exports
    const componentNames: string[] = [];

    // Find "export default function ComponentName"
    const defaultFuncMatch = cleaned.match(/export\s+default\s+function\s+([A-Z]\w*)/);
    if (defaultFuncMatch) {
      componentNames.push(defaultFuncMatch[1]);
    }

    // Find "export function ComponentName"
    const exportFuncMatches = Array.from(cleaned.matchAll(/export\s+function\s+([A-Z]\w*)/g));
    for (const match of exportFuncMatches) {
      componentNames.push(match[1]);
    }

    // Find "export const ComponentName"
    const exportConstMatches = Array.from(cleaned.matchAll(/export\s+const\s+([A-Z]\w*)\s*=/g));
    for (const match of exportConstMatches) {
      componentNames.push(match[1]);
    }

    // Find "export default ComponentName" (reference to existing component)
    const defaultRefMatch = cleaned.match(/export\s+default\s+([A-Z]\w*)\s*;?\s*$/m);
    if (defaultRefMatch) {
      componentNames.push(defaultRefMatch[1]);
    }

    // Find standalone function declarations "function ComponentName"
    const funcMatches = Array.from(cleaned.matchAll(/^function\s+([A-Z]\w*)\s*\(/gm));
    for (const match of funcMatches) {
      componentNames.push(match[1]);
    }

    // Find const arrow function components "const ComponentName = "
    const constMatches = Array.from(cleaned.matchAll(/^const\s+([A-Z]\w*)\s*=/gm));
    for (const match of constMatches) {
      componentNames.push(match[1]);
    }

    // Convert "export default function ComponentName" to "function ComponentName"
    cleaned = cleaned.replace(/export\s+default\s+function\s+/g, 'function ');

    // Convert "export default ComponentName" to just remove it (component already defined)
    cleaned = cleaned.replace(/export\s+default\s+(\w+);?\s*$/gm, '');

    // Convert "export function" to just "function"
    cleaned = cleaned.replace(/export\s+function\s+/g, 'function ');

    // Convert "export const" to just "const"
    cleaned = cleaned.replace(/export\s+const\s+/g, 'const ');

    // Remove any remaining export statements
    cleaned = cleaned.replace(/^export\s+.*?;?\s*$/gm, '');

    // Add window assignments for all found components
    // This makes them accessible globally for the renderer to find
    const uniqueNames = Array.from(new Set(componentNames));

    // Always ensure 'Page' is assigned if it exists
    let assignments = '';
    if (uniqueNames.length > 0) {
      assignments = uniqueNames
        .map(name => `if (typeof ${name} !== 'undefined') window.${name} = ${name};`)
        .join('\n');
    }

    // If no components found but code contains function definitions, try to extract them
    if (uniqueNames.length === 0) {
      // Look for any function starting with uppercase letter
      const anyFuncMatches = Array.from(cleaned.matchAll(/function\s+([A-Z]\w*)/g));
      if (anyFuncMatches.length > 0) {
        assignments = anyFuncMatches
          .map(match => `if (typeof ${match[1]} !== 'undefined') window.${match[1]} = ${match[1]};`)
          .join('\n');
      }
    }

    if (assignments) {
      cleaned = cleaned.trim() + '\n\n// Make components globally accessible\n' + assignments;
    }

    return cleaned.trim();
  };

  const code = cleanCodeForBrowser(rawCode);

  // Generate iframe content
  const generateIframeContent = (componentCode: string) => {
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
  <script type="text/babel" data-presets="react">
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

    // Mock hooks for demo
    const useState = React.useState;
    const useEffect = React.useEffect;
    const useCallback = React.useCallback;
    const useMemo = React.useMemo;
    const useRef = React.useRef;

    // Component code
    ${componentCode}

    // Try to find and render the component
    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));

      // Find the component - 'Page' is the required name from our prompt
      let Component = window.Page;

      // Fallback: try other common names
      if (!Component) {
        const possibleNames = ['App', 'Component', 'Main', 'Home', 'LoginPage', 'HomePage', 'DashboardPage', 'Dashboard', 'Login'];
        for (const name of possibleNames) {
          if (typeof window[name] === 'function') {
            Component = window[name];
            break;
          }
        }
      }

      // Last resort: find any PascalCase function
      if (!Component) {
        const allKeys = Object.keys(window);
        for (const key of allKeys) {
          if (/^[A-Z]/.test(key) && typeof window[key] === 'function' && !['React', 'ReactDOM', 'Babel', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Function', 'Symbol', 'Error', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Proxy', 'Reflect', 'JSON', 'Math', 'Date', 'RegExp', 'Int8Array', 'Uint8Array', 'Float32Array', 'Float64Array', 'ArrayBuffer', 'DataView', 'URL', 'URLSearchParams', 'Headers', 'Request', 'Response', 'FormData', 'Blob', 'File', 'FileReader', 'TextDecoder', 'TextEncoder'].includes(key)) {
            Component = window[key];
            console.log('Found component:', key);
            break;
          }
        }
      }

      if (Component) {
        root.render(React.createElement(Component, { sharedState, navigateTo, updateState }));
      } else {
        root.render(React.createElement('div', { className: 'p-8 text-center text-gray-500' }, 'No component found to render'));
      }
    } catch (error) {
      console.error('Render error:', error);
      document.getElementById('root').innerHTML = '<div class="p-8 text-center text-red-500">渲染错误: ' + error.message + '</div>';
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
