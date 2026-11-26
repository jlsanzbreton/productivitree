export interface ExampleSnapshot {
  purpose: string;
  roots: Record<string, string>;
  trunk: Record<string, string>;
  branches: Record<string, string>;
  leaves: string[];
  apps: Record<string, string>;
}
type Item = { id: string; title?: string; name?: string; deletedAt?: string; projectId?: string; appId?: string };
export interface GuideState {
  purpose?: string;
  roots?: Item[];
  trunkSegments?: Item[];
  projects?: Item[];
  stages?: Item[];
  connections?: Item[];
}
export function snapshotExample(data: GuideState): ExampleSnapshot;
export function guideProgress(snap: ExampleSnapshot | null, state: GuideState): { sun: boolean; roots: boolean; trunk: boolean; branch: boolean };
export function leftoverExample(
  snap: ExampleSnapshot | null,
  state: GuideState
): { purpose: boolean; rootIds: string[]; trunkIds: string[]; branchIds: string[]; appIds: string[]; count: number };
