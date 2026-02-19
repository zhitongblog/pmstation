'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflowStore';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Loader2,
  RefreshCw,
  Download,
} from 'lucide-react';

export default function PRDPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { stages, fetchStage, generate, confirmStage, isGenerating } = useWorkflowStore();
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  const stage = stages.find((s) => s.type === 'prd');
  const prdData = stage?.output_data;
  const modules = prdData?.modules || [];

  useEffect(() => {
    if (projectId && !stage) {
      generate(projectId, 'prd').catch(console.error);
    } else if (projectId) {
      fetchStage(projectId, 'prd');
    }
  }, [projectId, stage, generate, fetchStage]);

  useEffect(() => {
    // Expand all modules by default
    if (modules.length > 0) {
      setExpandedModules(new Set(modules.map((m: any) => m.id)));
    }
  }, [modules]);

  const toggleModule = (id: number) => {
    const newSet = new Set(expandedModules);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedModules(newSet);
  };

  const handleConfirm = async () => {
    try {
      await confirmStage(projectId, 'prd');
      router.push(`/projects/${projectId}/testcases`);
    } catch (error) {
      console.error('Failed to confirm:', error);
      alert('确认失败，请重试');
    }
  };

  const handleExport = () => {
    // Generate markdown content
    const content = generateMarkdown(prdData);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prdData?.title || 'PRD'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateMarkdown = (data: any): string => {
    if (!data) return '';

    let md = `# ${data.title}\n\n`;
    md += `版本: ${data.version}\n`;
    md += `更新日期: ${data.last_updated}\n\n`;

    if (data.overview) {
      md += `## 概述\n\n`;
      md += `### 背景\n${data.overview.background}\n\n`;
      if (data.overview.goals) {
        md += `### 目标\n`;
        data.overview.goals.forEach((g: string) => (md += `- ${g}\n`));
        md += '\n';
      }
    }

    data.modules?.forEach((module: any) => {
      md += `## ${module.name}\n\n`;
      md += `${module.description}\n\n`;

      module.features?.forEach((feature: any) => {
        md += `### ${feature.name}\n\n`;
        md += `${feature.description}\n\n`;

        if (feature.user_stories) {
          md += `**用户故事:**\n`;
          feature.user_stories.forEach((story: any) => {
            md += `- 作为${story.role}，${story.action}，${story.benefit}\n`;
          });
          md += '\n';
        }

        if (feature.acceptance_criteria) {
          md += `**验收标准:**\n`;
          feature.acceptance_criteria.forEach((c: string) => {
            md += `- ${c}\n`;
          });
          md += '\n';
        }
      });
    });

    return md;
  };

  if (!stage || stage.status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="text-gray-600">AI 正在生成 PRD 文档...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{prdData?.title || 'PRD 文档'}</h1>
            <p className="text-gray-600">版本 {prdData?.version || '1.0'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            导出 Markdown
          </button>
          {stage.status !== 'confirmed' && (
            <button
              onClick={() => generate(projectId, 'prd')}
              disabled={isGenerating}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {isGenerating ? '生成中...' : '重新生成'}
            </button>
          )}
        </div>
      </div>

      {/* Overview */}
      {prdData?.overview && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">概述</h2>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700">{prdData.overview.background}</p>
            {prdData.overview.goals && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700">目标</h3>
                <ul className="mt-2">
                  {prdData.overview.goals.map((goal: string, idx: number) => (
                    <li key={idx} className="text-gray-600">{goal}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modules */}
      <div className="space-y-4 mb-6">
        {modules.map((module: any) => (
          <div key={module.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleModule(module.id)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{module.name}</h3>
                <p className="text-gray-600 text-sm mt-1">{module.description}</p>
              </div>
              {expandedModules.has(module.id) ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedModules.has(module.id) && module.features && (
              <div className="border-t border-gray-200 px-6 py-4 space-y-6">
                {module.features.map((feature: any) => (
                  <div key={feature.id} className="border-l-2 border-primary-200 pl-4">
                    <h4 className="font-medium text-gray-900">{feature.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{feature.description}</p>

                    {feature.user_stories && feature.user_stories.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-xs font-semibold text-gray-500 uppercase">用户故事</h5>
                        <ul className="mt-1 space-y-1">
                          {feature.user_stories.map((story: any, idx: number) => (
                            <li key={idx} className="text-sm text-gray-600">
                              作为<span className="text-primary-600">{story.role}</span>，
                              {story.action}，{story.benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {feature.acceptance_criteria && feature.acceptance_criteria.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-xs font-semibold text-gray-500 uppercase">验收标准</h5>
                        <ul className="mt-1 space-y-1">
                          {feature.acceptance_criteria.map((criteria: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">✓</span>
                              {criteria}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {stage.status === 'confirmed' ? (
        <button
          onClick={() => router.push(`/projects/${projectId}/testcases`)}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
        >
          继续下一步
          <ArrowRight className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={handleConfirm}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
        >
          确认 PRD 文档
          <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
