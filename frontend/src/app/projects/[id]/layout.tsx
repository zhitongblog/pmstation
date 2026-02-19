'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const projectId = params.id as string;

  const { currentProject, fetchProject, isLoading } = useProjectStore();
  const { fetchStages, stages } = useWorkflowStore();

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
      fetchStages(projectId);
    }
  }, [projectId, fetchProject, fetchStages]);

  if (isLoading || !currentProject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-57px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar
          projectId={projectId}
          stages={currentProject.stages}
          currentStage={currentProject.current_stage}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
