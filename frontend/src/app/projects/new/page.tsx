'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProjectStore } from '@/stores/projectStore';
import { Header } from '@/components/layout/Header';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';

export default function NewProjectPage() {
  const router = useRouter();
  const { createProject, isLoading } = useProjectStore();
  const [title, setTitle] = useState('');
  const [idea, setIdea] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !idea.trim()) return;

    try {
      const project = await createProject(title.trim(), idea.trim(), description.trim() || undefined);
      router.push(`/projects/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('创建项目失败，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          返回项目列表
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">创建新项目</h1>
              <p className="text-gray-600 text-sm">输入你的产品想法，AI 将帮你完成后续设计</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                项目名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：智能健身追踪应用"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="idea" className="block text-sm font-medium text-gray-700 mb-2">
                产品想法 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="idea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="详细描述你的产品想法，包括：解决什么问题、目标用户是谁、核心功能有哪些..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors resize-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                描述越详细，AI 生成的结果越准确
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                项目描述 <span className="text-gray-400">(可选)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简短的项目描述，用于在项目列表中展示"
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors resize-none"
              />
            </div>

            <div className="flex justify-end gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={isLoading || !title.trim() || !idea.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    创建项目
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
