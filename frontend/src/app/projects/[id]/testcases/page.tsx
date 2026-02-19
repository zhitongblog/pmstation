'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflowStore';
import { cn } from '@/lib/utils';
import {
  TestTube,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';

export default function TestCasesPage() {
  const params = useParams();
  const projectId = params.id as string;

  const { stages, fetchStage, generate, isGenerating } = useWorkflowStore();
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());

  const stage = stages.find((s) => s.type === 'testcases');
  const testData = stage?.output_data;
  const testSuites = testData?.test_suites || [];

  useEffect(() => {
    if (projectId && !stage) {
      generate(projectId, 'testcases').catch(console.error);
    } else if (projectId) {
      fetchStage(projectId, 'testcases');
    }
  }, [projectId, stage, generate, fetchStage]);

  useEffect(() => {
    // Expand all suites by default
    if (testSuites.length > 0) {
      setExpandedSuites(new Set(testSuites.map((s: any) => s.module)));
    }
  }, [testSuites]);

  const toggleSuite = (module: string) => {
    const newSet = new Set(expandedSuites);
    if (newSet.has(module)) {
      newSet.delete(module);
    } else {
      newSet.add(module);
    }
    setExpandedSuites(newSet);
  };

  const handleExport = () => {
    // Generate CSV content
    let csv = 'ID,模块,功能,标题,优先级,类型,前置条件,测试步骤,预期结果\n';

    testSuites.forEach((suite: any) => {
      suite.cases?.forEach((tc: any) => {
        csv += `"${tc.id}","${tc.module}","${tc.feature}","${tc.title}","${tc.priority}","${tc.type}","${tc.preconditions?.join('; ') || ''}","${tc.steps?.join('; ') || ''}","${tc.expected_result}"\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '测试用例.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      P0: 'bg-red-100 text-red-700',
      P1: 'bg-orange-100 text-orange-700',
      P2: 'bg-yellow-100 text-yellow-700',
      P3: 'bg-gray-100 text-gray-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      functional: 'bg-blue-100 text-blue-700',
      boundary: 'bg-purple-100 text-purple-700',
      exception: 'bg-red-100 text-red-700',
      performance: 'bg-green-100 text-green-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (!stage || stage.status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="text-gray-600">AI 正在生成测试用例...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
            <TestTube className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">测试用例</h1>
            <p className="text-gray-600">
              共 {testData?.total_cases || 0} 个测试用例
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            导出 CSV
          </button>
          <button
            onClick={() => generate(projectId, 'testcases')}
            disabled={isGenerating}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {isGenerating ? '生成中...' : '重新生成'}
          </button>
        </div>
      </div>

      {/* Coverage summary */}
      {testData?.coverage && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">覆盖统计</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{testData.coverage.functional}</div>
              <div className="text-sm text-gray-500">功能测试</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{testData.coverage.boundary}</div>
              <div className="text-sm text-gray-500">边界测试</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{testData.coverage.exception}</div>
              <div className="text-sm text-gray-500">异常测试</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{testData.coverage.performance}</div>
              <div className="text-sm text-gray-500">性能测试</div>
            </div>
          </div>
        </div>
      )}

      {/* Test suites */}
      <div className="space-y-4">
        {testSuites.map((suite: any) => (
          <div key={suite.module} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSuite(suite.module)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">{suite.module}</h3>
                <span className="text-sm text-gray-500">
                  {suite.cases?.length || 0} 个用例
                </span>
              </div>
              {expandedSuites.has(suite.module) ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSuites.has(suite.module) && suite.cases && (
              <div className="border-t border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="px-4 py-3 w-24">ID</th>
                      <th className="px-4 py-3">标题</th>
                      <th className="px-4 py-3 w-20">优先级</th>
                      <th className="px-4 py-3 w-24">类型</th>
                      <th className="px-4 py-3 w-24">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {suite.cases.map((tc: any) => (
                      <tr key={tc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{tc.id}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{tc.title}</div>
                          <div className="text-xs text-gray-500 mt-1">{tc.feature}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-1 rounded-full', getPriorityColor(tc.priority))}>
                            {tc.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-1 rounded-full', getTypeColor(tc.type))}>
                            {tc.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Clock className="w-4 h-4 text-gray-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900">工作流已完成</h3>
            <p className="text-green-700 text-sm">
              恭喜！您已完成从创意到测试用例的完整产品设计流程。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
