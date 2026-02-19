'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflowStore';
import { cn } from '@/lib/utils';
import type { Direction } from '@/types';
import {
  Compass,
  Target,
  Users,
  TrendingUp,
  AlertTriangle,
  Check,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function DirectionPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { stages, fetchStage, selectDirection, generate, isGenerating } = useWorkflowStore();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stage = stages.find((s) => s.type === 'direction');
  const directions: Direction[] = stage?.output_data?.directions || [];

  useEffect(() => {
    if (projectId) {
      fetchStage(projectId, 'direction');
    }
  }, [projectId, fetchStage]);

  useEffect(() => {
    if (stage?.selected_option) {
      setSelectedId(stage.selected_option.id);
    }
  }, [stage]);

  const handleSelect = async () => {
    if (!selectedId) return;

    setIsSubmitting(true);
    try {
      await selectDirection(projectId, selectedId);
      router.push(`/projects/${projectId}/platform`);
    } catch (error) {
      console.error('Failed to select direction:', error);
      alert('选择失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      await generate(projectId, 'direction');
    } catch (error) {
      console.error('Failed to regenerate:', error);
      alert('重新生成失败，请重试');
    }
  };

  if (!stage) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (stage.status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="text-gray-600">AI 正在分析产品方向...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Compass className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">选择产品方向</h1>
            <p className="text-gray-600">AI 分析了 {directions.length} 个可行的产品方向</p>
          </div>
        </div>
        {stage.status !== 'confirmed' && (
          <button
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
          >
            {isGenerating ? '生成中...' : '重新生成'}
          </button>
        )}
      </div>

      <div className="space-y-4 mb-6">
        {directions.map((direction) => (
          <div
            key={direction.id}
            onClick={() => stage.status !== 'confirmed' && setSelectedId(direction.id)}
            className={cn(
              'bg-white rounded-xl border-2 p-6 cursor-pointer transition-all',
              selectedId === direction.id
                ? 'border-primary-500 shadow-sm'
                : 'border-gray-200 hover:border-gray-300',
              stage.status === 'confirmed' && 'cursor-default'
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{direction.title}</h3>
                <p className="text-gray-600">{direction.positioning}</p>
              </div>
              {selectedId === direction.id && (
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="font-medium text-gray-700">目标用户</span>
                  <p className="text-gray-600">{direction.target_users}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="font-medium text-gray-700">价值主张</span>
                  <p className="text-gray-600">{direction.value_proposition}</p>
                </div>
              </div>

              {direction.market_opportunity && (
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="font-medium text-gray-700">市场机会</span>
                    <p className="text-gray-600">{direction.market_opportunity}</p>
                  </div>
                </div>
              )}

              {direction.risks.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="font-medium text-gray-700">风险提示</span>
                    <ul className="text-gray-600 list-disc list-inside">
                      {direction.risks.slice(0, 2).map((risk, i) => (
                        <li key={i}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {stage.status === 'confirmed' ? (
        <button
          onClick={() => router.push(`/projects/${projectId}/platform`)}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
        >
          继续下一步
          <ArrowRight className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={handleSelect}
          disabled={!selectedId || isSubmitting}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              确认中...
            </>
          ) : (
            <>
              确认选择
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
