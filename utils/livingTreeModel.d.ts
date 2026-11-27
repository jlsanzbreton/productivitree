import type { AchievementData, CorePurposeRoot, ProjectBranch, ProjectStageLeaf, SkillTrunkSegment } from '../types';

export interface LivingLeaf { id: string; n: string; d: number; done: boolean; /** Parent leaf when this leaf grows on a twig. */ par?: string }
export interface LivingFruit { id: string; n: string; done: boolean; /** Leaf (task) it came from, if any. */ from?: string }
export interface LivingBranch {
  id: string;
  name: string;
  side: number;
  t: number;
  prio: number;
  paused: boolean;
  young: boolean;
  from: string;
  /** Grew out of another branch's twig: rises more upright, next to it. */
  grown?: boolean;
  tasks: LivingLeaf[];
  fruits: LivingFruit[];
}
export interface LivingTreeModel { purpose: string; roots: string[]; rootIds: string[]; trunk: string[][]; trunkIds: string[]; branches: LivingBranch[] }

export const DAY_MS: number;
export function isFruit(item: Partial<AchievementData> | null | undefined): boolean;
export function splitTwoLines(title: string): [string, string];
export function twigParent(stage: Partial<ProjectStageLeaf>, stagesOfBranch: Partial<ProjectStageLeaf>[]): string;
export function placeBranches(projects: ProjectBranch[]): Map<string, { side: number; t: number; grown?: boolean }>;
export function buildLivingTreeModel(
  data: {
    purpose?: string;
    roots?: CorePurposeRoot[];
    trunkSegments?: SkillTrunkSegment[];
    projects?: ProjectBranch[];
    stages?: ProjectStageLeaf[];
    achievements?: AchievementData[];
  },
  now?: Date
): LivingTreeModel;
