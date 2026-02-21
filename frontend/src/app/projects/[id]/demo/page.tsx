'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';

export default function DemoPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { stages, generate, confirmStage, isGenerating, fetchStages } = useWorkflowStore();
  const {
    platforms,
    currentPageId,
    viewMode,
    reset,
    setDemoProject,
  } = useDemoStore();

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const stage = stages.find((s) => s.type === 'demo');
  const featuresStage = stages.find((s) => s.type === 'features');
  const canGenerate = featuresStage?.status === 'confirmed';
  // Support both new format (platforms) and legacy format (files)
  const hasExistingDemo = stage?.output_data?.platforms || stage?.output_data?.files;

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
    if (demoStage?.output_data && (demoStage.output_data.platforms || demoStage.output_data.files)) {
      setDemoProject(demoStage.output_data as any);
    }
  }, [stages, isInitialLoading, setDemoProject]);

  // Auto-generate if no existing demo and can generate
  useEffect(() => {
    if (
      !isInitialLoading &&
      canGenerate &&
      !hasExistingDemo &&
      !isGenerating &&
      platforms.length === 0
    ) {
      handleGenerate();
    }
  }, [isInitialLoading, canGenerate, hasExistingDemo, isGenerating, platforms.length]);

  const handleGenerate = async () => {
    try {
      const result = await generate(projectId, 'demo');
      if (result?.output_data) {
        setDemoProject(result.output_data as any);
      }
    } catch (error) {
      console.error('Failed to generate demo:', error);
    }
  };

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
    await handleGenerate();
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

  // Generating state
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="text-gray-600">AI 正在生成交互 Demo...</p>
        <p className="text-sm text-gray-400">这可能需要一些时间，请耐心等待</p>
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
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
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
              disabled={isGenerating || platforms.length === 0}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              确认 Demo
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

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
            isRegenerating={isGenerating}
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
