'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useDemoStore } from '@/stores/demoStore';
import { useDemoGeneration, useDemoModify } from './hooks/useDemoGeneration';
import {
  DemoSidebar,
  DemoPreview,
  DemoCodeView,
  DemoControls,
  GenerationProgress,
  ModifyDialog,
} from './components';
import {
  Play,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { demoApi } from '@/lib/api';
import type { DemoProject } from '@/types';

export default function DemoPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { stages, confirmStage, fetchStages } = useWorkflowStore();
  const {
    platforms,
    currentPageId,
    isGenerating,
    viewMode,
    reset,
    fetchDemoStructure,
    setDemoProject,
  } = useDemoStore();

  const { startGeneration, isConnected } = useDemoGeneration(projectId);
  const { modifyPage, isModifying } = useDemoModify(projectId);

  const [isModifyDialogOpen, setIsModifyDialogOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const stage = stages.find((s) => s.type === 'demo');
  const hasExistingDemo = stage?.output_data?.platforms;
  const featuresStage = stages.find((s) => s.type === 'features');
  const canGenerate = featuresStage?.status === 'confirmed';

  // Initial load - fetch stages
  useEffect(() => {
    setIsInitialLoading(true);
    fetchStages(projectId).finally(() => {
      setIsInitialLoading(false);
    });

    // Cleanup on unmount
    return () => {
      reset();
    };
  }, [projectId, fetchStages, reset]);

  // Load existing demo when stages are loaded
  useEffect(() => {
    if (isInitialLoading) return;

    const demoStage = stages.find((s) => s.type === 'demo');
    if (demoStage?.output_data?.platforms) {
      setDemoProject(demoStage.output_data as DemoProject);
    }
  }, [stages, isInitialLoading, setDemoProject]);

  // Start generation when navigating to page without existing demo
  useEffect(() => {
    if (
      !isInitialLoading &&
      canGenerate &&
      !hasExistingDemo &&
      !isGenerating &&
      platforms.length === 0
    ) {
      startGeneration();
    }
  }, [isInitialLoading, canGenerate, hasExistingDemo, isGenerating, platforms.length, startGeneration]);

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
    reset();
    startGeneration();
  };

  const handleRegeneratePage = useCallback(async () => {
    if (!currentPageId) return;

    setIsRegenerating(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${apiUrl}/api/v1/projects/${projectId}/demo/pages/${currentPageId}/regenerate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // Process SSE events...
      }
    } catch (error) {
      console.error('Regenerate error:', error);
    } finally {
      setIsRegenerating(false);
    }
  }, [projectId, currentPageId]);

  const handleModify = async (instruction: string) => {
    if (!currentPageId) return;
    await modifyPage(currentPageId, instruction);
    setIsModifyDialogOpen(false);
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

  // Not ready state (features not confirmed)
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
              {isConnected && (
                <span className="ml-2 text-green-600">● 连接中</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {stage?.status !== 'confirmed' && (
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? '生成中...' : '重新生成全部'}
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
              disabled={isGenerating || platforms.length === 0}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              确认 Demo
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <div className="px-6 py-4">
          <GenerationProgress />
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
            onRegenerate={handleRegeneratePage}
            onOpenModify={() => setIsModifyDialogOpen(true)}
            isRegenerating={isRegenerating}
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

      {/* Modify Dialog */}
      <ModifyDialog
        isOpen={isModifyDialogOpen}
        onClose={() => setIsModifyDialogOpen(false)}
        onModify={handleModify}
        isModifying={isModifying}
      />
    </div>
  );
}
