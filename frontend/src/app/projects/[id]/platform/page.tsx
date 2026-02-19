'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflowStore';
import { cn } from '@/lib/utils';
import {
  Monitor,
  Smartphone,
  Check,
  ArrowRight,
  Loader2,
  Settings,
  Users,
} from 'lucide-react';

type PcType = 'full' | 'admin';
type MobileType = 'full' | 'user';

export default function PlatformPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { stages, fetchStage, selectPlatform } = useWorkflowStore();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['pc', 'mobile']);
  const [pcType, setPcType] = useState<PcType>('admin');
  const [mobileType, setMobileType] = useState<MobileType>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stage = stages.find((s) => s.type === 'platform');

  useEffect(() => {
    if (projectId) {
      fetchStage(projectId, 'platform').catch(() => {
        // Platform stage might not exist yet, that's ok
      });
    }
  }, [projectId, fetchStage]);

  useEffect(() => {
    if (stage?.selected_option) {
      const selection = stage.selected_option;
      setSelectedPlatforms(selection.platforms || ['pc', 'mobile']);
      if (selection.pc_type) setPcType(selection.pc_type as PcType);
      if (selection.mobile_type) setMobileType(selection.mobile_type as MobileType);
    }
  }, [stage]);

  const togglePlatform = (platform: string) => {
    if (stage?.status === 'confirmed') return;

    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        // Don't allow deselecting if it's the last one
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== platform);
      }
      return [...prev, platform];
    });
  };

  const handleConfirm = async () => {
    if (selectedPlatforms.length === 0) return;

    setIsSubmitting(true);
    try {
      await selectPlatform(projectId, {
        platforms: selectedPlatforms,
        pc_type: selectedPlatforms.includes('pc') ? pcType : undefined,
        mobile_type: selectedPlatforms.includes('mobile') ? mobileType : undefined,
      });
      router.push(`/projects/${projectId}/features`);
    } catch (error) {
      console.error('Failed to save platform selection:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Monitor className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">选择目标平台</h1>
          <p className="text-gray-600">请选择产品需要支持的平台（可多选）</p>
        </div>
      </div>

      {/* Platform Selection Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* PC Platform Card */}
        <div
          onClick={() => togglePlatform('pc')}
          className={cn(
            'bg-white rounded-xl border-2 p-6 cursor-pointer transition-all',
            selectedPlatforms.includes('pc')
              ? 'border-primary-500 shadow-sm'
              : 'border-gray-200 hover:border-gray-300',
            stage?.status === 'confirmed' && 'cursor-default'
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Monitor className="w-6 h-6 text-blue-600" />
            </div>
            {selectedPlatforms.includes('pc') && (
              <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">PC 端</h3>
          <p className="text-sm text-gray-600">桌面网页应用</p>
        </div>

        {/* Mobile Platform Card */}
        <div
          onClick={() => togglePlatform('mobile')}
          className={cn(
            'bg-white rounded-xl border-2 p-6 cursor-pointer transition-all',
            selectedPlatforms.includes('mobile')
              ? 'border-primary-500 shadow-sm'
              : 'border-gray-200 hover:border-gray-300',
            stage?.status === 'confirmed' && 'cursor-default'
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-green-600" />
            </div>
            {selectedPlatforms.includes('mobile') && (
              <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">移动端</h3>
          <p className="text-sm text-gray-600">手机 App / H5</p>
        </div>
      </div>

      {/* PC Type Selection */}
      {selectedPlatforms.includes('pc') && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-600" />
            PC 端定位
          </h3>
          <div className="space-y-3">
            <label
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                pcType === 'full'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300',
                stage?.status === 'confirmed' && 'cursor-default'
              )}
              onClick={() => stage?.status !== 'confirmed' && setPcType('full')}
            >
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                pcType === 'full' ? 'border-primary-500' : 'border-gray-300'
              )}>
                {pcType === 'full' && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
              </div>
              <div>
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  完整版（全功能产品）
                </div>
                <p className="text-sm text-gray-600">PC 端包含产品的所有功能，适合独立的 Web 应用</p>
              </div>
            </label>
            <label
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                pcType === 'admin'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300',
                stage?.status === 'confirmed' && 'cursor-default'
              )}
              onClick={() => stage?.status !== 'confirmed' && setPcType('admin')}
            >
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                pcType === 'admin' ? 'border-primary-500' : 'border-gray-300'
              )}>
                {pcType === 'admin' && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
              </div>
              <div>
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  管理后台
                </div>
                <p className="text-sm text-gray-600">数据管理、系统配置、报表统计、权限管理等后台功能</p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Mobile Type Selection */}
      {selectedPlatforms.includes('mobile') && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-600" />
            移动端定位
          </h3>
          <div className="space-y-3">
            <label
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                mobileType === 'user'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300',
                stage?.status === 'confirmed' && 'cursor-default'
              )}
              onClick={() => stage?.status !== 'confirmed' && setMobileType('user')}
            >
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                mobileType === 'user' ? 'border-primary-500' : 'border-gray-300'
              )}>
                {mobileType === 'user' && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
              </div>
              <div>
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  用户操作端
                </div>
                <p className="text-sm text-gray-600">面向终端用户的操作功能，如浏览、下单、社交等</p>
              </div>
            </label>
            <label
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                mobileType === 'full'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300',
                stage?.status === 'confirmed' && 'cursor-default'
              )}
              onClick={() => stage?.status !== 'confirmed' && setMobileType('full')}
            >
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                mobileType === 'full' ? 'border-primary-500' : 'border-gray-300'
              )}>
                {mobileType === 'full' && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
              </div>
              <div>
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  完整版（全功能产品）
                </div>
                <p className="text-sm text-gray-600">移动端包含产品的所有功能，适合独立的移动应用</p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Confirm Button */}
      {stage?.status === 'confirmed' ? (
        <button
          onClick={() => router.push(`/projects/${projectId}/features`)}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
        >
          继续下一步
          <ArrowRight className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={handleConfirm}
          disabled={selectedPlatforms.length === 0 || isSubmitting}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              确认中...
            </>
          ) : (
            <>
              确认并生成功能模块
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
