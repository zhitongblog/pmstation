'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';
import { collaboratorsApi } from '@/lib/api';
import type { Collaborator } from '@/types';
import {
  Settings,
  Users,
  Trash2,
  UserPlus,
  X,
  Loader2,
  Crown,
} from 'lucide-react';

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { currentProject, updateProject, deleteProject } = useProjectStore();
  const { user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const isOwner = currentProject?.owner_id === user?.id;

  useEffect(() => {
    if (currentProject) {
      setTitle(currentProject.title);
      setDescription(currentProject.description || '');
    }
  }, [currentProject]);

  useEffect(() => {
    fetchCollaborators();
  }, [projectId]);

  const fetchCollaborators = async () => {
    try {
      const data = await collaboratorsApi.list(projectId);
      setCollaborators(data);
    } catch (error) {
      console.error('Failed to fetch collaborators:', error);
    }
  };

  const handleUpdateProject = async () => {
    if (!isOwner) return;

    setIsLoading(true);
    try {
      await updateProject(projectId, { title, description: description || undefined });
      alert('项目信息已更新');
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('更新失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !isOwner) return;

    setIsInviting(true);
    try {
      const collaborator = await collaboratorsApi.invite(projectId, inviteEmail.trim());
      setCollaborators([...collaborators, collaborator]);
      setInviteEmail('');
      setShowInviteModal(false);
      alert('邀请成功');
    } catch (error: any) {
      console.error('Failed to invite:', error);
      alert(error.response?.data?.detail || '邀请失败，请检查邮箱地址');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!isOwner || !confirm('确定要移除该协作者吗？')) return;

    try {
      await collaboratorsApi.remove(projectId, userId);
      setCollaborators(collaborators.filter((c) => c.user_id !== userId));
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
      alert('移除失败，请重试');
    }
  };

  const handleDeleteProject = async () => {
    if (!isOwner) return;
    if (!confirm('确定要删除这个项目吗？此操作不可恢复。')) return;

    try {
      await deleteProject(projectId);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('删除失败，请重试');
    }
  };

  if (!currentProject) {
    return null;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5 text-gray-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">项目设置</h1>
      </div>

      {/* Project Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">基本信息</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isOwner}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">项目描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isOwner}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          {isOwner && (
            <button
              onClick={handleUpdateProject}
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '保存中...' : '保存更改'}
            </button>
          )}
        </div>
      </div>

      {/* Collaborators */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            协作者
          </h2>
          {isOwner && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <UserPlus className="w-4 h-4" />
              邀请协作者
            </button>
          )}
        </div>

        <div className="space-y-3">
          {/* Owner */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {user?.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.name}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-medium">{user?.name.charAt(0)}</span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{user?.name}</span>
                  <Crown className="w-4 h-4 text-yellow-500" />
                </div>
                <span className="text-sm text-gray-500">{user?.email}</span>
              </div>
            </div>
            <span className="text-sm text-gray-500">所有者</span>
          </div>

          {/* Collaborators */}
          {collaborators.map((collab) => (
            <div key={collab.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                {collab.user_avatar ? (
                  <Image
                    src={collab.user_avatar}
                    alt={collab.user_name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium">{collab.user_name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-900">{collab.user_name}</span>
                  <p className="text-sm text-gray-500">{collab.user_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">查看者</span>
                {isOwner && (
                  <button
                    onClick={() => handleRemoveCollaborator(collab.user_id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {collaborators.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">暂无协作者</p>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-600 mb-4">危险操作</h2>
          <p className="text-gray-600 mb-4">
            删除项目将永久移除所有数据，包括所有阶段内容、备注和协作者。此操作不可恢复。
          </p>
          <button
            onClick={handleDeleteProject}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            删除项目
          </button>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">邀请协作者</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvite}>
              <p className="text-sm text-gray-600 mb-4">
                输入用户的邮箱地址邀请其加入项目。协作者可以查看项目内容并添加备注，但不能修改项目。
              </p>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none mb-4"
                required
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!inviteEmail.trim() || isInviting}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {isInviting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  发送邀请
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
