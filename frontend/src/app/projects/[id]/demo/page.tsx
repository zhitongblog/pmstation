'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useDemoStore } from '@/stores/demoStore';
import {
  DemoSidebar,
  DemoPreview,
  DemoCodeView,
  DemoControls,
} from './components';
import {
  Play,
  ArrowRight,
  Loader2,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';

interface GenerationStatus {
  isGenerating: boolean;
  currentPage: string | null;
  completedPages: number;
  totalPages: number;
  error: string | null;
}

export default function DemoPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const abortControllerRef = useRef<AbortController | null>(null);

  const { stages, confirmStage, fetchStages } = useWorkflowStore();
  const {
    platforms,
    viewMode,
    reset,
    setDemoProject,
    setPlatforms,
    setCurrentPlatform,
    setCurrentPageId,
    appendPageCode,
    completePageGeneration,
    setPageStatus,
  } = useDemoStore();

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [status, setStatus] = useState<GenerationStatus>({
    isGenerating: false,
    currentPage: null,
    completedPages: 0,
    totalPages: 0,
    error: null,
  });

  const stage = stages.find((s) => s.type === 'demo');
  const featuresStage = stages.find((s) => s.type === 'features');
  const canGenerate = featuresStage?.status === 'confirmed';
  const hasExistingDemo = stage?.output_data?.platforms || stage?.output_data?.files;

  // Initial load - fetch stages
  useEffect(() => {
    setIsInitialLoading(true);
    fetchStages(projectId).finally(() => {
      setIsInitialLoading(false);
    });

    return () => {
      reset();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [projectId, fetchStages, reset]);

  // Load existing demo when stages are loaded
  useEffect(() => {
    if (isInitialLoading) return;

    const demoStage = stages.find((s) => s.type === 'demo');
    if (demoStage?.output_data && (demoStage.output_data.platforms || demoStage.output_data.files)) {
      setDemoProject(demoStage.output_data as any);
    }
  }, [stages, isInitialLoading, setDemoProject]);

  // SSE streaming generation
  const startGeneration = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    reset();
    setStatus({
      isGenerating: true,
      currentPage: null,
      completedPages: 0,
      totalPages: 0,
      error: null,
    });

    const token = localStorage.getItem('token');
    const apiUrl = getApiBaseUrl();
    const url = `${apiUrl}/api/v1/projects/${projectId}/demo/generate/stream`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const chunk of lines) {
          if (!chunk.trim()) continue;

          const eventMatch = chunk.match(/^event:\s*(.+)$/m);
          const dataMatch = chunk.match(/^data:\s*(.+)$/m);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1];
            try {
              const data = JSON.parse(dataMatch[1]);

              switch (eventType) {
                case 'init':
                  setStatus(s => ({
                    ...s,
                    totalPages: data.total_pages,
                  }));
                  // Set platforms with pending status
                  if (data.platforms) {
                    const platformsWithStatus = data.platforms.map((p: any) => ({
                      ...p,
                      pages: p.pages?.map((page: any) => ({
                        ...page,
                        status: 'pending',
                        code: '',
                      })) || [],
                    }));
                    setPlatforms(platformsWithStatus);
                    // Auto-select first platform
                    if (platformsWithStatus.length > 0) {
                      setCurrentPlatform(platformsWithStatus[0].type);
                      if (platformsWithStatus[0].pages?.length > 0) {
                        setCurrentPageId(platformsWithStatus[0].pages[0].id);
                      }
                    }
                  }
                  break;

                case 'page_start':
                  setStatus(s => ({
                    ...s,
                    currentPage: data.page_name,
                  }));
                  setPageStatus(data.page_id, 'generating');
                  break;

                case 'page_progress':
                  appendPageCode(data.page_id, data.chunk);
                  break;

                case 'page_complete':
                  completePageGeneration(data.page_id, data.code);
                  setStatus(s => ({
                    ...s,
                    completedPages: s.completedPages + 1,
                    currentPage: null,
                  }));
                  break;

                case 'page_error':
                  setPageStatus(data.page_id, 'error');
                  break;

                case 'complete':
                  setStatus(s => ({
                    ...s,
                    isGenerating: false,
                  }));
                  // Refresh stages to get updated data
                  fetchStages(projectId);
                  break;

                case 'error':
                  setStatus(s => ({
                    ...s,
                    isGenerating: false,
                    error: data.message,
                  }));
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      setStatus(s => ({ ...s, isGenerating: false }));
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation aborted');
        return;
      }
      console.error('SSE Error:', error);
      setStatus(s => ({
        ...s,
        isGenerating: false,
        error: error.message,
      }));
    }
  }, [projectId, reset, setPlatforms, setCurrentPlatform, setCurrentPageId, setPageStatus, appendPageCode, completePageGeneration, fetchStages]);

  // Auto-generate if no existing demo
  useEffect(() => {
    if (
      !isInitialLoading &&
      canGenerate &&
      !hasExistingDemo &&
      !status.isGenerating &&
      platforms.length === 0
    ) {
      startGeneration();
    }
  }, [isInitialLoading, canGenerate, hasExistingDemo, status.isGenerating, platforms.length, startGeneration]);

  const handleConfirm = async () => {
    try {
      await confirmStage(projectId, 'demo');
      router.push(`/projects/${projectId}/prd`);
    } catch (error) {
      console.error('Failed to confirm:', error);
      alert('确认失败，请重试');
    }
  };

  const handleRegenerate = async () => {
    await startGeneration();
  };

  // Loading state
  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="text-gray-600">加载中...</p>
      </div>
    );
  }

  // Not ready state
  if (!canGenerate) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Play className="w-16 h-16 text-gray-300" />
        <p className="text-gray-500">请先完成功能模块的确认</p>
        <button
          onClick={() => router.push(`/projects/${projectId}/features`)}
          className="text-primary-600 hover:underline"
        >
          返回功能模块
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Play className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">交互 Demo</h1>
            <p className="text-sm text-gray-500">
              AI 生成的可交互演示
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {stage?.status !== 'confirmed' && (
            <button
              onClick={handleRegenerate}
              disabled={status.isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${status.isGenerating ? 'animate-spin' : ''}`} />
              重新生成
            </button>
          )}

          {stage?.status === 'confirmed' ? (
            <button
              onClick={() => router.push(`/projects/${projectId}/prd`)}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              继续下一步
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={status.isGenerating || platforms.length === 0}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              确认 Demo
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Generation Progress */}
      {status.isGenerating && (
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-4">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-blue-900">
                  {status.currentPage ? `正在生成: ${status.currentPage}` : '准备生成...'}
                </span>
                <span className="text-sm text-blue-600">
                  {status.completedPages} / {status.totalPages} 页面
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: status.totalPages > 0
                      ? `${(status.completedPages / status.totalPages) * 100}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {status.error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-100">
          <p className="text-sm text-red-600">生成错误: {status.error}</p>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <DemoSidebar />

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Controls */}
          <DemoControls
            onRegenerate={handleRegenerate}
            onOpenModify={() => {}}
            isRegenerating={status.isGenerating}
          />

          {/* Preview/Code area */}
          <div className="flex-1 overflow-hidden p-4">
            {viewMode === 'preview' && <DemoPreview />}
            {viewMode === 'code' && <DemoCodeView />}
            {viewMode === 'split' && (
              <div className="flex gap-4 h-full">
                <div className="flex-1 overflow-hidden">
                  <DemoPreview />
                </div>
                <div className="flex-1 overflow-hidden">
                  <DemoCodeView />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
