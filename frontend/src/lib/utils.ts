import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    idea: '创意输入',
    direction: '产品方向',
    platform: '平台选择',
    features: '功能模块',
    demo: '交互演示',
    prd: 'PRD文档',
    testcases: '测试用例',
  };
  return labels[stage] || stage;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '待处理',
    generating: '生成中',
    completed: '已完成',
    confirmed: '已确认',
  };
  return labels[status] || status;
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    P0: 'bg-red-100 text-red-800',
    P1: 'bg-orange-100 text-orange-800',
    P2: 'bg-yellow-100 text-yellow-800',
    P3: 'bg-gray-100 text-gray-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
}
