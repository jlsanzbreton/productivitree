import type { ActivityEntry, ProjectBranch, ProjectStageLeaf } from '../types';

export const ACTIVITY_PARAM: string;
export interface ActivityParams { branch: string; task: string; app: string; note: string; url: string }
export const DESKTOP_ACTIVITY_ORIGIN: string;
export function activitySearchFromUrl(url: string): string | null;
export function parseActivityParams(search: string): ActivityParams | { error: string } | null;
export function buildActivityLink(origin: string, options?: { branch?: string; task?: string; app?: string; note?: string }): string;
export function fillUrlTemplate(template: string, values?: { branch?: string; task?: string }): string;
export function isSafeOpenUrl(url: string): boolean;
export function applyActivity(
  context: { projects: ProjectBranch[]; stages: ProjectStageLeaf[]; userId: string; now?: Date; newId: (prefix: string) => string },
  activity: ActivityParams
): {
  ok: boolean;
  error?: string;
  stages?: ProjectStageLeaf[];
  projectId?: string;
  taskId?: string;
  created?: boolean;
  message?: string;
};
export function addActivityEntry(stage: ProjectStageLeaf, entry: ActivityEntry): ProjectStageLeaf;
