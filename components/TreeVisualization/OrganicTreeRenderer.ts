import { OrganicNode, OrganicLayoutResult } from './OrganicTreeLayout';
import { TaskData, LeafStatus } from '../../types';

// Interfaces para configuración
export interface OrganicRenderConfig {
  canvas: HTMLCanvasElement;
  theme: string;
  showRoots?: boolean;
  showTrunkSections?: boolean;
  enableAnimations?: boolean;
  healthFactor: number;
}

export interface OrganicInteractionCallbacks {
  onLeafClick: (nodeId: string) => void;
  onRootHover: () => void;
  onTrunkSectionHover: () => void;
}

// Clase principal del renderer
class OrganicTreeRenderer {
  private config: OrganicRenderConfig;
  private context: CanvasRenderingContext2D | null = null;

  constructor(config: OrganicRenderConfig) {
    this.config = config;
    this.context = config.canvas.getContext('2d');
  }

  public updateConfig(newConfig: Partial<OrganicRenderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.canvas) {
      this.context = newConfig.canvas.getContext('2d');
    }
  }

  public render(layout: OrganicLayoutResult, callbacks: OrganicInteractionCallbacks): void {
    if (!this.context) return;

    console.log('Rendering tree with callbacks:', callbacks);

    // Clear canvas
    const { width, height } = this.config.canvas;
    this.context.clearRect(0, 0, width, height);

    // Render components
    this.renderRoots(layout.nodes.filter(n => n.type === 'root'));
    this.renderTrunkSections(layout.nodes.filter(n => n.type === 'trunk'));
    this.renderBranches(layout.nodes.filter(n => n.type === 'branch'));
    this.renderLeaves(layout.nodes.filter(n => n.type === 'leaf'));
  }

  private renderRoots(rootNodes: OrganicNode[]): void {
    if (!this.context || !this.config.showRoots) return;

    rootNodes.forEach(root => {
      this.context!.strokeStyle = root.color || '#8B4513';
      this.context!.lineWidth = root.thickness || 3;
      
      if (root.curve) {
        this.context!.beginPath();
        this.context!.moveTo(root.x, root.y);
        this.context!.bezierCurveTo(
          root.curve.cp1x, root.curve.cp1y,
          root.curve.cp2x, root.curve.cp2y,
          root.x, root.y
        );
        this.context!.stroke();
      }

      this.context!.fillStyle = root.color || '#8B4513';
      this.context!.beginPath();
      this.context!.arc(root.x, root.y, root.size / 2, 0, Math.PI * 2);
      this.context!.fill();
    });
  }

  private renderTrunkSections(trunkNodes: OrganicNode[]): void {
    if (!this.context || !this.config.showTrunkSections) return;

    const sortedTrunk = trunkNodes.sort((a, b) => b.y - a.y);

    for (let i = 0; i < sortedTrunk.length; i++) {
      const section = sortedTrunk[i];
      const nextSection = sortedTrunk[i + 1];

      this.context!.fillStyle = section.color || '#8B4513';
      
      if (nextSection) {
        this.context!.beginPath();
        this.context!.moveTo(section.x - section.size / 2, section.y);
        this.context!.lineTo(section.x + section.size / 2, section.y);
        this.context!.lineTo(nextSection.x + nextSection.size / 2, nextSection.y);
        this.context!.lineTo(nextSection.x - nextSection.size / 2, nextSection.y);
        this.context!.closePath();
        this.context!.fill();
      } else {
        this.context!.beginPath();
        this.context!.arc(section.x, section.y, section.size / 2, 0, Math.PI * 2);
        this.context!.fill();
      }
    }
  }

  private renderBranches(branchNodes: OrganicNode[]): void {
    if (!this.context) return;

    branchNodes.forEach(branch => {
      this.context!.strokeStyle = branch.color || '#228B22';
      this.context!.lineWidth = branch.thickness || 5;
      this.context!.lineCap = 'round';

      if (branch.curve) {
        this.context!.beginPath();
        this.context!.moveTo(branch.x, branch.y);
        this.context!.bezierCurveTo(
          branch.curve.cp1x, branch.curve.cp1y,
          branch.curve.cp2x, branch.curve.cp2y,
          branch.x, branch.y
        );
        this.context!.stroke();
      }

      this.context!.fillStyle = branch.color || '#228B22';
      this.context!.beginPath();
      this.context!.arc(branch.x, branch.y, branch.size / 2, 0, Math.PI * 2);
      this.context!.fill();
    });
  }

  private renderLeaves(leafNodes: OrganicNode[]): void {
    if (!this.context) return;

    leafNodes.forEach(leaf => {
      const taskData = leaf.data as TaskData;
      
      let leafColor = this.getLeafColor(taskData.status);
      
      if (this.config.theme === 'winter') {
        leafColor = 'rgba(255, 255, 255, 0.3)';
      }

      this.context!.fillStyle = leafColor;
      this.drawLeafShape(leaf);
    });
  }

  private drawLeafShape(leaf: OrganicNode): void {
    if (!this.context) return;

    const size = leaf.size;
    const angle = leaf.angle || 0;

    this.context!.save();
    this.context!.translate(leaf.x, leaf.y);
    this.context!.rotate(angle);

    this.context!.beginPath();
    this.context!.ellipse(0, 0, size * 1.5, size, 0, 0, Math.PI * 2);
    this.context!.fill();

    this.context!.restore();
  }

  private getLeafColor(status: LeafStatus): string {
    const colorMap: Record<LeafStatus, string> = {
      [LeafStatus.Pending]: '#14b8a6',
      [LeafStatus.InProgress]: '#f59e0b',
      [LeafStatus.Urgent]: '#ef4444',
      [LeafStatus.Completed]: '#9ca3af',
      [LeafStatus.RecentActivity]: '#84cc16'
    };
    
    return colorMap[status] || '#9ca3af';
  }

  public renderGround(groundY: number): void {
    if (!this.context) return;

    const { width } = this.config.canvas;
    
    this.context!.strokeStyle = 'rgba(139, 69, 19, 0.3)';
    this.context!.lineWidth = 2;
    this.context!.beginPath();
    this.context!.moveTo(0, groundY);
    this.context!.lineTo(width, groundY);
    this.context!.stroke();
  }
}

// Export explícito
export { OrganicTreeRenderer };
