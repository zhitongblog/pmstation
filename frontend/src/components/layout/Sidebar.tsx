'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, getStageLabel } from '@/lib/utils';
import type { StageType, StageInfo } from '@/types';
import {
  Lightbulb,
  Compass,
  Boxes,
  Monitor,
  Play,
  FileText,
  TestTube,
  Check,
  Circle,
  Loader2,
} from 'lucide-react';

const STAGE_ICONS: Record<StageType, React.ComponentType<{ className?: string }>> = {
  idea: Lightbulb,
  direction: Compass,
  platform: Monitor,
  features: Boxes,
  demo: Play,
  prd: FileText,
  testcases: TestTube,
};

const STAGE_ORDER: StageType[] = [
  'idea',
  'direction',
  'platform',
  'features',
  'demo',
  'prd',
  'testcases',
];

interface SidebarProps {
  projectId: string;
  stages: StageInfo[];
  currentStage: StageType;
}

export function Sidebar({ projectId, stages, currentStage }: SidebarProps) {
  const pathname = usePathname();

  const getStageStatus = (stageType: StageType): StageInfo | undefined => {
    return stages.find((s) => s.type === stageType);
  };

  const isStageAccessible = (stageType: StageType): boolean => {
    const stageIndex = STAGE_ORDER.indexOf(stageType);
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    return stageIndex <= currentIndex;
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-[calc(100vh-57px)] sticky top-[57px]">
      <nav className="p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          工作流程
        </h2>
        <ul className="space-y-1">
          {STAGE_ORDER.map((stageType, index) => {
            const Icon = STAGE_ICONS[stageType];
            const stageInfo = getStageStatus(stageType);
            const isAccessible = isStageAccessible(stageType);
            const isActive = pathname.includes(`/projects/${projectId}`) &&
              (pathname.endsWith(`/${stageType}`) ||
                (stageType === 'idea' && pathname.endsWith(`/projects/${projectId}`)));

            const href =
              stageType === 'idea'
                ? `/projects/${projectId}`
                : `/projects/${projectId}/${stageType}`;

            return (
              <li key={stageType}>
                <Link
                  href={isAccessible ? href : '#'}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : isAccessible
                        ? 'text-gray-700 hover:bg-gray-50'
                        : 'text-gray-400 cursor-not-allowed'
                  )}
                  onClick={(e) => !isAccessible && e.preventDefault()}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {stageInfo && (
                      <span
                        className={cn(
                          'absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center',
                          stageInfo.status === 'confirmed'
                            ? 'bg-green-500'
                            : stageInfo.status === 'completed'
                              ? 'bg-blue-500'
                              : stageInfo.status === 'generating'
                                ? 'bg-yellow-500'
                                : 'bg-gray-300'
                        )}
                      >
                        {stageInfo.status === 'confirmed' && (
                          <Check className="w-2 h-2 text-white" />
                        )}
                        {stageInfo.status === 'generating' && (
                          <Loader2 className="w-2 h-2 text-white animate-spin" />
                        )}
                      </span>
                    )}
                  </div>
                  <span>{getStageLabel(stageType)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
