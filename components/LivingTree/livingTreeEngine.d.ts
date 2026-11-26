import type { LivingLeaf, LivingTreeModel } from '../../utils/livingTreeModel';

export interface LivingTreeOptions {
  container: HTMLElement;
  tip?: HTMLElement;
  onBranch?: (branchId: string) => void;
  onLeaf?: (branchId: string, leafId: string) => void;
  onFruit?: (branchId: string, fruitId: string) => void;
  onBackground?: () => void;
  onZoom?: (branchId: string | null) => void;
}
export interface LivingTree {
  setModel(model: LivingTreeModel): void;
  zoomTo(branchId: string | null): void;
  setRightInset(px: number): void;
  select(selection: { branchId?: string | null; leafId?: string | null; fruitId?: string | null }): void;
  destroy(): void;
}
export function createLivingTree(canvas: HTMLCanvasElement, options: LivingTreeOptions): LivingTree;
export function leafStateLabel(task: LivingLeaf): string;
export function leafStateColor(task: LivingLeaf): string;
