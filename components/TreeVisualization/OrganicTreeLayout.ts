// Algoritmo de layout orgánico para Productivitree
// Crea una estructura de árbol que se ve natural y orgánica

import { TreeNode, ExperienceArea, RootData } from '../../types';

export interface OrganicNode {
  id: string;
  type: 'root' | 'trunk' | 'branch' | 'leaf' | 'fruit';
  x: number;
  y: number;
  size: number;
  angle?: number; // Para rotación de elementos
  data: any;
  children?: OrganicNode[];
  // Propiedades específicas para renderizado orgánico
  thickness?: number; // Para tronco y ramas
  curve?: { cp1x: number; cp1y: number; cp2x: number; cp2y: number }; // Puntos de control para curvas Bézier
  color?: string;
  textureDetail?: 'basic' | 'medium' | 'detailed';
}

export interface OrganicTreeConfig {
  width: number;
  height: number;
  rootDepth?: number;
  trunkHeight?: number;
  maxBranchLevels?: number;
  branchingFactor?: number;
  windStrength?: number;
  seasonalEffects?: boolean;
}

export interface OrganicLayoutResult {
  nodes: OrganicNode[];
  connections: Array<{
    from: OrganicNode;
    to: OrganicNode;
    curve?: { cp1x: number; cp1y: number; cp2x: number; cp2y: number };
  }>;
}

export class OrganicTreeLayout {
  private config: OrganicTreeConfig;
  private currentLayout: OrganicLayoutResult | null = null;
  
  constructor(config: OrganicTreeConfig) {
    this.config = {
      width: config.width,
      height: config.height,
      rootDepth: config.rootDepth || 150,
      trunkHeight: config.trunkHeight || 200,
      maxBranchLevels: config.maxBranchLevels || 4,
      branchingFactor: config.branchingFactor || 0.7,
      windStrength: config.windStrength || 0.3,
      seasonalEffects: config.seasonalEffects || false
    };
  }

  /**
   * Updates the layout configuration
   */
  public updateConfig(newConfig: Partial<OrganicTreeConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Generates the complete organic tree layout
   */
  public generateLayout(treeData: TreeNode, experienceAreas: ExperienceArea[], roots: RootData[]): OrganicLayoutResult {
    const layout: OrganicLayoutResult = {
      nodes: [],
      connections: []
    };

    const centerX = this.config.width / 2;
    const groundLevel = this.config.height * 0.8;

    // 1. Generate underground root system
    const rootNodes = this.generateRootSystem(centerX, groundLevel, roots);
    layout.nodes.push(...rootNodes);

    // 2. Generate trunk sections based on experience areas
    const trunkNodes = this.generateTrunkSections(centerX, groundLevel, experienceAreas);
    layout.nodes.push(...trunkNodes);

    // 3. Generate branches and leaves
    const { branchNodes, leafNodes } = this.generateBranchesAndLeaves(treeData, trunkNodes);
    layout.nodes.push(...branchNodes, ...leafNodes);

    // 4. Generate connections between all parts
    layout.connections = this.generateConnections(layout.nodes);

    this.currentLayout = layout;
    return layout;
  }

  /**
   * Updates animations based on time
   */
  public updateAnimations(time: number): void {    
    if (!this.currentLayout) return;

    // Apply wind effects to branches and leaves
    this.currentLayout.nodes.forEach(node => {
      if (node.type === 'branch' || node.type === 'leaf') {
        const windOffset = Math.sin(time * 2 + node.x * 0.01) * this.config.windStrength! * 3;
        node.x += windOffset;
      }
    });
  }

  /**
   * Gets the node at a specific position for click detection
   */
  public getNodeAtPosition(x: number, y: number): OrganicNode | null {
    if (!this.currentLayout) return null;

    for (const node of this.currentLayout.nodes) {
      const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
      const hitRadius = node.size + 5; // Add some padding for easier clicking
      
      if (distance <= hitRadius) {
        return node;
      }
    }

    return null;
  }

  /**
   * Generates underground root system
   */
  private generateRootSystem(centerX: number, groundLevel: number, roots: RootData[]): OrganicNode[] {
    const rootNodes: OrganicNode[] = [];
    const rootCount = Math.min(5, roots.length + 2);
    
    for (let i = 0; i < rootCount; i++) {
      const angle = (i / rootCount) * Math.PI * 2 - Math.PI;
      const length = 50 + Math.random() * 30;
      const thickness = 3 + Math.random() * 4;
      
      const rootEnd = {
        x: centerX + Math.cos(angle) * length,
        y: groundLevel + Math.abs(Math.sin(angle)) * length * 0.6
      };

      const root: OrganicNode = {
        id: `root-${i}`,
        type: 'root',
        x: rootEnd.x,
        y: rootEnd.y,
        size: thickness,
        thickness: thickness,
        angle: angle,
        curve: this.generateBezierCurve({ x: centerX, y: groundLevel }, rootEnd, 'root'),
        color: '#8B4513',
        data: roots[i] || { name: `Root ${i + 1}` }
      };
      
      rootNodes.push(root);
    }
    
    return rootNodes;
  }

  /**
   * Generates trunk sections based on experience areas
   */
  private generateTrunkSections(centerX: number, groundLevel: number, experienceAreas: ExperienceArea[]): OrganicNode[] {
    const sections: OrganicNode[] = [];
    const trunkHeight = this.config.trunkHeight!;
    const sectionCount = Math.max(3, experienceAreas.length);
    
    for (let i = 0; i < sectionCount; i++) {
      const experienceArea = experienceAreas[i];
      const progress = i / (sectionCount - 1);
      
      const baseThickness = 25;
      const topThickness = 12;
      const thickness = baseThickness - (baseThickness - topThickness) * progress;
      
      const naturalVariation = 1 + (Math.sin(progress * Math.PI * 3) * 0.1);
      const finalThickness = thickness * naturalVariation;
      
      const experienceMultiplier = experienceArea ? 
        0.7 + (experienceArea.experienceLevel / 10) * 0.6 : 0.8;
      
      const section: OrganicNode = {
        id: `trunk-section-${i}`,
        type: 'trunk',
        x: centerX + (Math.sin(progress * Math.PI) * 3),
        y: groundLevel - (progress * trunkHeight),
        size: finalThickness * experienceMultiplier,
        thickness: finalThickness * experienceMultiplier,
        textureDetail: experienceArea?.trunkSection.textureDetail || 'basic',
        color: experienceArea?.trunkSection.color || '#8B4513',
        data: experienceArea || { name: `Trunk Section ${i + 1}` }
      };
      
      sections.push(section);
    }
    
    return sections;
  }

  /**
   * Generates branches and leaves
   */
  private generateBranchesAndLeaves(treeData: TreeNode, trunkSections: OrganicNode[]): { branchNodes: OrganicNode[], leafNodes: OrganicNode[] } {
    const branchNodes: OrganicNode[] = [];
    const leafNodes: OrganicNode[] = [];
    
    if (!treeData.children) return { branchNodes, leafNodes };
    
    treeData.children.forEach((projectNode, projectIndex) => {
      const originSection = this.selectOriginSection(trunkSections);
      
      const baseAngle = (projectIndex / treeData.children!.length) * Math.PI * 1.4 - Math.PI * 0.7;
      const angleVariation = (Math.random() - 0.5) * 0.5;
      const finalAngle = baseAngle + angleVariation;
      
      const branchLength = 80 + Math.random() * 40;
      const branchThickness = 8 + Math.random() * 4;
      
      const branchEnd = {
        x: originSection.x + Math.cos(finalAngle) * branchLength,
        y: originSection.y + Math.sin(finalAngle) * branchLength * 0.8
      };
      
      const branch: OrganicNode = {
        id: projectNode.id,
        type: 'branch',
        x: branchEnd.x,
        y: branchEnd.y,
        size: branchThickness,
        thickness: branchThickness,
        angle: finalAngle,
        curve: this.generateBezierCurve(originSection, branchEnd, 'branch'),
        color: '#228B22',
        data: projectNode.data
      };
      
      branchNodes.push(branch);

      // Generate leaves for this branch
      if (projectNode.children) {
        projectNode.children.forEach((taskNode, taskIndex) => {
          const progress = (taskIndex + 1) / (projectNode.children!.length + 1);
          const distanceAlongBranch = progress * 0.8;
          
          const leafPosition = this.getPointOnBranch(branch, originSection, distanceAlongBranch);
          
          const perpOffset = (Math.random() - 0.5) * 15;
          const perpAngle = finalAngle + Math.PI / 2;
          
          const leaf: OrganicNode = {
            id: taskNode.id,
            type: 'leaf',
            x: leafPosition.x + Math.cos(perpAngle) * perpOffset,
            y: leafPosition.y + Math.sin(perpAngle) * perpOffset,
            size: 4 + Math.random() * 3,
            angle: finalAngle + (Math.random() - 0.5) * 0.5,
            data: taskNode.data
          };
          
          leafNodes.push(leaf);
        });
      }
    });
    
    return { branchNodes, leafNodes };
  }

  /**
   * Generates connections between nodes
   */
  private generateConnections(_nodes: OrganicNode[]): Array<{ from: OrganicNode; to: OrganicNode; curve?: any }> {
    // For now, return empty array. Connections will be handled by the renderer
    return [];
  }

  /**
   * Selects trunk section for branch origin
   */
  private selectOriginSection(trunkSections: OrganicNode[]): OrganicNode {
    const index = Math.floor(Math.random() * trunkSections.length);
    return trunkSections[index];
  }

  /**
   * Generates Bézier curves for organic connections
   */
  private generateBezierCurve(start: { x: number; y: number }, end: { x: number; y: number }, type: 'root' | 'branch'): { cp1x: number; cp1y: number; cp2x: number; cp2y: number } {
    const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    const curvature = distance * 0.3;
    
    if (type === 'root') {
      return {
        cp1x: start.x + (Math.random() - 0.5) * 20,
        cp1y: start.y + curvature * 0.3,
        cp2x: end.x + (Math.random() - 0.5) * 15,
        cp2y: (start.y + end.y) / 2 + curvature * 0.5
      };
    } else {
      return {
        cp1x: start.x + (end.x - start.x) * 0.3,
        cp1y: start.y - curvature * 0.5,
        cp2x: start.x + (end.x - start.x) * 0.7,
        cp2y: end.y - curvature * 0.3
      };
    }
  }

  /**
   * Gets point along branch for leaf positioning
   */
  private getPointOnBranch(branch: OrganicNode, origin: OrganicNode, progress: number): { x: number; y: number } {
    return {
      x: origin.x + (branch.x - origin.x) * progress,
      y: origin.y + (branch.y - origin.y) * progress
    };
  }
}

export default OrganicTreeLayout;
