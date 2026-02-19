'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflowStore';
import { cn, getPriorityColor } from '@/lib/utils';
import type { Feature } from '@/types';
import {
  Boxes,
  ChevronRight,
  ChevronDown,
  Check,
  ArrowRight,
  Loader2,
  Monitor,
  Smartphone,
} from 'lucide-react';

interface FeatureItemProps {
  feature: Feature;
  level: number;
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  disabled: boolean;
}

function FeatureItem({ feature, level, selectedIds, onToggle, disabled }: FeatureItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = feature.sub_features && feature.sub_features.length > 0;
  const isSelected = selectedIds.has(feature.id);

  return (
    <div className={cn('border-l-2', level > 0 && 'ml-6', isSelected ? 'border-primary-500' : 'border-gray-200')}>
      <div
        className={cn(
          'flex items-center gap-3 py-2 px-3 hover:bg-gray-50 cursor-pointer',
          disabled && 'cursor-default'
        )}
        onClick={() => !disabled && onToggle(feature.id)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}

        <div
          className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
            isSelected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
          )}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('font-medium', isSelected ? 'text-gray-900' : 'text-gray-500')}>
              {feature.name}
            </span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full', getPriorityColor(feature.priority))}>
              {feature.priority}
            </span>
            {feature.platforms && feature.platforms.length > 0 && (
              <div className="flex gap-1">
                {feature.platforms.includes('pc') && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    <Monitor className="w-3 h-3" />
                    PC
                  </span>
                )}
                {feature.platforms.includes('mobile') && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    <Smartphone className="w-3 h-3" />
                    移动
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">{feature.description}</p>
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="pl-4">
          {feature.sub_features!.map((child) => (
            <FeatureItem
              key={child.id}
              feature={child}
              level={level + 1}
              selectedIds={selectedIds}
              onToggle={onToggle}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FeaturesPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { stages, fetchStage, selectFeatures, generate, isGenerating } = useWorkflowStore();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stage = stages.find((s) => s.type === 'features');
  const features: Feature[] = stage?.output_data?.modules || [];

  useEffect(() => {
    if (projectId && !stage) {
      // Generate features if not exists
      generate(projectId, 'features').catch(console.error);
    } else if (projectId) {
      fetchStage(projectId, 'features');
    }
  }, [projectId, stage, generate, fetchStage]);

  useEffect(() => {
    if (features.length > 0 && selectedIds.size === 0) {
      // Initialize with all selected
      const allIds = getAllFeatureIds(features);
      setSelectedIds(new Set(allIds));
    }
  }, [features]);

  useEffect(() => {
    if (stage?.selected_option?.selected_ids) {
      setSelectedIds(new Set(stage.selected_option.selected_ids));
    }
  }, [stage]);

  const getAllFeatureIds = (featureList: Feature[]): number[] => {
    const ids: number[] = [];
    const collect = (list: Feature[]) => {
      list.forEach((f) => {
        ids.push(f.id);
        if (f.sub_features) collect(f.sub_features);
      });
    };
    collect(featureList);
    return ids;
  };

  const handleToggle = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const idsArray = Array.from(selectedIds);
    console.log('[FeaturesPage] Confirming features with IDs:', idsArray);
    console.log('[FeaturesPage] Project ID:', projectId);
    try {
      const result = await selectFeatures(projectId, idsArray);
      console.log('[FeaturesPage] Success! Result:', result);
      router.push(`/projects/${projectId}/demo`);
    } catch (error: any) {
      console.error('[FeaturesPage] Failed to confirm features:', error);
      console.error('[FeaturesPage] Error details:', error?.response?.data || error?.message);
      alert(`确认失败: ${error?.response?.data?.detail || error?.message || '请重试'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!stage || stage.status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="text-gray-600">AI 正在生成功能模块...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Boxes className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">功能模块确认</h1>
          <p className="text-gray-600">选择要包含在产品中的功能模块</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">
            已选择 {selectedIds.size} / {getAllFeatureIds(features).length} 个功能
          </span>
          {stage.status !== 'confirmed' && (
            <button
              onClick={() => setSelectedIds(new Set(getAllFeatureIds(features)))}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              全选
            </button>
          )}
        </div>

        <div className="space-y-1">
          {features.map((feature) => (
            <FeatureItem
              key={feature.id}
              feature={feature}
              level={0}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              disabled={stage.status === 'confirmed'}
            />
          ))}
        </div>
      </div>

      {stage.status === 'confirmed' ? (
        <button
          onClick={() => router.push(`/projects/${projectId}/demo`)}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
        >
          继续下一步
          <ArrowRight className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={handleConfirm}
          disabled={selectedIds.size === 0 || isSubmitting}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              确认中...
            </>
          ) : (
            <>
              确认功能模块
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
