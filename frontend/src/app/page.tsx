'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { Sparkles, Zap, Users, FileText } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary-600" />
          <span className="text-xl font-bold">PMStation</span>
        </div>
        <GoogleLoginButton />
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
            AI 驱动的
            <span className="text-primary-600"> 产品经理工作站</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10">
            从创意到 PRD，让 AI 帮你完成产品设计全流程。
            输入想法，自动生成产品方向、功能模块、原型设计和文档。
          </p>
          <GoogleLoginButton size="lg" />
        </div>

        {/* Features */}
        <div className="mt-32 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI 智能生成</h3>
            <p className="text-gray-600">
              基于 Gemini API，自动分析产品方向、生成功能模块和 PRD 文档
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">完整工作流</h3>
            <p className="text-gray-600">
              从创意到测试用例，覆盖产品设计全流程，一站式完成
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">团队协作</h3>
            <p className="text-gray-600">
              邀请团队成员查看项目、添加备注，高效协同工作
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
