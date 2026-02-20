'use client';

import { useState } from 'react';
import { X, Wand2, Loader2 } from 'lucide-react';
import { useDemoStore } from '@/stores/demoStore';

interface ModifyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onModify: (instruction: string) => Promise<void>;
  isModifying: boolean;
}

const SUGGESTIONS = [
  '让按钮更大一些',
  '添加加载动画',
  '修改配色为蓝色主题',
  '添加表单验证提示',
  '增加一个返回按钮',
  '让布局更紧凑',
];

export function ModifyDialog({
  isOpen,
  onClose,
  onModify,
  isModifying,
}: ModifyDialogProps) {
  const [instruction, setInstruction] = useState('');
  const { getCurrentPage } = useDemoStore();

  const currentPage = getCurrentPage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isModifying) return;

    await onModify(instruction);
    setInstruction('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInstruction(suggestion);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">修改页面</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Current page info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">当前页面</div>
            <div className="font-medium text-gray-900">
              {currentPage?.name || '未选择页面'}
            </div>
            <div className="text-sm text-gray-500">{currentPage?.path}</div>
          </div>

          {/* Instruction input */}
          <div className="mb-4">
            <label
              htmlFor="instruction"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              修改指令
            </label>
            <textarea
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="描述你想要的修改，例如：让按钮更突出..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              rows={3}
              disabled={isModifying}
            />
          </div>

          {/* Suggestions */}
          <div className="mb-6">
            <div className="text-sm text-gray-500 mb-2">快捷建议</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isModifying}
                  className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isModifying}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!instruction.trim() || isModifying}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {isModifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  修改中...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  应用修改
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
