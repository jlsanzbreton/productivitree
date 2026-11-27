import type { AchievementData, AppConnection, CorePurposeRoot, ProjectBranch, ProjectStageLeaf, SkillTrunkSegment } from '../types';

export const TREE_JSON_VERSION: number;

export interface ParsedTreeData {
  purpose: string;
  roots: CorePurposeRoot[];
  trunkSegments: SkillTrunkSegment[];
  projects: ProjectBranch[];
  stages: ProjectStageLeaf[];
  achievements: AchievementData[];
  connections: AppConnection[];
}
export interface ParsedTreeSummary { branches: number; leaves: number; fruits: number; passions: number; experience: number; apps: number }

export function parseTreeJson(
  raw: string | object,
  options?: { userId?: string; now?: Date }
): { ok: true; data: ParsedTreeData; summary: ParsedTreeSummary; warnings: string[] } | { ok: false; errors: string[] };

export function exportTreeJson(state: {
  purpose?: string;
  roots?: CorePurposeRoot[];
  trunkSegments?: SkillTrunkSegment[];
  projects?: ProjectBranch[];
  stages?: ProjectStageLeaf[];
  achievements?: AchievementData[];
  connections?: AppConnection[];
}): string;
