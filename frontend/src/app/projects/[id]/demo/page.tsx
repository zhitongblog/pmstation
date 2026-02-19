'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflowStore';
import {
  Play,
  Code,
  Eye,
  ArrowRight,
  Loader2,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

export default function DemoPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { stages, fetchStage, generate, confirmStage, isGenerating } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const stage = stages.find((s) => s.type === 'demo');
  const demoData = stage?.output_data;
  const files = demoData?.files || [];

  useEffect(() => {
    if (projectId && !stage) {
      generate(projectId, 'demo').catch(console.error);
    } else if (projectId) {
      fetchStage(projectId, 'demo');
    }
  }, [projectId, stage, generate, fetchStage]);

  useEffect(() => {
    if (files.length > 0 && !activeFile) {
      setActiveFile(files[0].filename);
    }
  }, [files, activeFile]);

  const handleConfirm = async () => {
    try {
      await confirmStage(projectId, 'demo');
      router.push(`/projects/${projectId}/prd`);
    } catch (error) {
      console.error('Failed to confirm:', error);
      alert('确认失败，请重试');
    }
  };

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentFile = files.find((f: any) => f.filename === activeFile);

  if (!stage || stage.status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="text-gray-600">AI 正在生成交互 Demo...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Play className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">交互 Demo</h1>
            <p className="text-gray-600">
              {demoData?.project_name || 'AI 生成的可交互演示代码'}
            </p>
          </div>
        </div>
        {stage.status !== 'confirmed' && (
          <button
            onClick={() => generate(projectId, 'demo')}
            disabled={isGenerating}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {isGenerating ? '生成中...' : '重新生成'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            预览
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'code'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Code className="w-4 h-4" />
            代码
          </button>
        </div>

        {activeTab === 'preview' ? (
          <div className="p-8">
            <div className="bg-gray-100 rounded-lg p-12 flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-gray-300">
              <Play className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-500 text-center text-lg mb-2">Demo 预览区域</p>
              <p className="text-gray-400 text-sm text-center">
                在实际部署时，这里将显示可交互的 React 应用
              </p>
            </div>
          </div>
        ) : (
          <div className="flex">
            {/* File list */}
            <div className="w-64 border-r border-gray-200 bg-gray-50">
              <div className="p-3 text-xs font-semibold text-gray-500 uppercase">文件列表</div>
              <div className="space-y-0.5 px-2 pb-2">
                {files.map((file: any) => (
                  <button
                    key={file.filename}
                    onClick={() => setActiveFile(file.filename)}
                    className={`w-full text-left px-3 py-2 rounded text-sm truncate ${
                      activeFile === file.filename
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {file.filename}
                  </button>
                ))}
              </div>
            </div>

            {/* Code view */}
            <div className="flex-1">
              {currentFile && (
                <>
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <span className="text-sm text-gray-600">{currentFile.description}</span>
                    <button
                      onClick={() => handleCopy(currentFile.code)}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          复制
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 overflow-auto max-h-[500px] text-sm">
                    <code className="text-gray-800">{currentFile.code}</code>
                  </pre>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {demoData?.setup_instructions && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">运行说明</h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            {demoData.setup_instructions.map((instruction: string, idx: number) => (
              <li key={idx}>{instruction}</li>
            ))}
          </ol>
        </div>
      )}

      {stage.status === 'confirmed' ? (
        <button
          onClick={() => router.push(`/projects/${projectId}/prd`)}
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
          确认 Demo
          <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
