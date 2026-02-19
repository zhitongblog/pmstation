'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { formatDateTime } from '@/lib/utils';
import { Lightbulb, ArrowRight, Loader2 } from 'lucide-react';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { currentProject } = useProjectStore();
  const { stages, generate, isGenerating } = useWorkflowStore();

  const ideaStage = stages.find((s) => s.type === 'idea');
  const directionStage = stages.find((s) => s.type === 'direction');

  const handleGenerateDirections = async () => {
    try {
      await generate(projectId, 'direction');
      router.push(`/projects/${projectId}/direction`);
    } catch (error) {
      console.error('Failed to generate directions:', error);
      alert('生成失败，请重试');
    }
  };

  if (!currentProject || !ideaStage) {
    return null;
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{currentProject.title}</h1>
        {currentProject.description && (
          <p className="text-gray-600 mt-1">{currentProject.description}</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">产品想法</h2>
            <p className="text-sm text-gray-500">
              创建于 {formatDateTime(ideaStage.created_at)}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-gray-700 whitespace-pre-wrap">
            {ideaStage.input_data?.content}
          </p>
        </div>

        {!directionStage ? (
          <button
            onClick={handleGenerateDirections}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AI 正在分析...
              </>
            ) : (
              <>
                生成产品方向
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => router.push(`/projects/${projectId}/direction`)}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
            查看产品方向
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
