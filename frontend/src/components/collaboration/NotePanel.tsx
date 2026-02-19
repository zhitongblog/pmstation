'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { notesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils';
import type { Note } from '@/types';
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react';

interface NotePanelProps {
  stageId: string;
}

export function NotePanel({ stageId }: NotePanelProps) {
  const { user } = useAuthStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [stageId]);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const data = await notesApi.list(stageId);
      setNotes(data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      const note = await notesApi.create(stageId, newNote.trim());
      setNotes([note, ...notes]);
      setNewNote('');
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('添加备注失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('确定要删除这条备注吗？')) return;

    try {
      await notesApi.delete(noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('删除失败，请重试');
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-gray-900">备注</h3>
        <span className="text-sm text-gray-500">({notes.length})</span>
      </div>

      {/* Add note form */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="添加备注..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <button
            type="submit"
            disabled={!newNote.trim() || isSubmitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Notes list */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">暂无备注</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="flex gap-3 group">
              {note.user_avatar ? (
                <Image
                  src={note.user_avatar}
                  alt={note.user_name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-medium">
                    {note.user_name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{note.user_name}</span>
                  <span className="text-xs text-gray-500">{formatDateTime(note.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{note.content}</p>
              </div>
              {note.user_id === user?.id && (
                <button
                  onClick={() => handleDelete(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
