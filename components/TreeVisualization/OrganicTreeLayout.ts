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
  curve?: { 
    startX: number; startY: number; // Punto de inicio
    cp1x: number; cp1y: number; cp2x: number; cp2y: number; // Puntos de control para curvas Bézier
    endX: number; endY: number; // Punto final
  }; 
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
      const length = 80 + Math.random() * 50; // Aumentado de 50+30 a 80+50
      const thickness = 6 + Math.random() * 8; // Aumentado de 3+4 a 6+8
      
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
        color: '#DC143C', // Rojo carmesí como en el dibujo del usuario
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
      
      const baseThickness = 45; // Aumentado de 25 a 45
      const topThickness = 25; // Aumentado de 12 a 25
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
   * Generates branches and leaves siguiendo el diseño orgánico del dibujo
   */
  private generateBranchesAndLeaves(treeData: TreeNode, trunkSections: OrganicNode[]): { branchNodes: OrganicNode[], leafNodes: OrganicNode[] } {
    const branchNodes: OrganicNode[] = [];
    const leafNodes: OrganicNode[] = [];
    
    if (!treeData.children || trunkSections.length === 0) return { branchNodes, leafNodes };
    
    // 🌳 Mejora 1: Seleccionar secciones del tronco más altas para las ramas
    const upperTrunkSections = trunkSections
      .sort((a, b) => a.y - b.y) // Ordenar por Y (menor Y = más alto)
      .slice(0, Math.ceil(trunkSections.length * 0.6)); // Tomar 60% superior
    
    const totalProjects = treeData.children.length;
    
    treeData.children.forEach((projectNode, projectIndex) => {
      // 🌿 Mejora 2: Distribución angular más natural (en abanico)
      const angleRange = Math.PI * 1.2; // 216 grados total
      const angleStart = -angleRange / 2; // Empezar desde -108 grados
      const baseAngle = angleStart + (projectIndex / Math.max(1, totalProjects - 1)) * angleRange;
      
      // 🎲 Pequeña variación natural pero controlada
      const angleVariation = (Math.random() - 0.5) * 0.2; // Reducir variación
      const finalAngle = baseAngle + angleVariation;
      
      // 🌿 Mejora 3: Origen más variado pero controlado
      const originSection = upperTrunkSections[projectIndex % upperTrunkSections.length];
      
      // 📏 Longitud de rama variable pero más controlada
      const baseBranchLength = 100 + (projectIndex % 3) * 30; // 100, 130, 160 patrón (aumentado)
      const branchLength = baseBranchLength + Math.random() * 25; // Más variación
      const branchThickness = Math.max(8, 18 - projectIndex * 0.8); // Ramas más gruesas (8-18)
      
      const branchEnd = {
        x: originSection.x + Math.cos(finalAngle) * branchLength,
        y: originSection.y + Math.sin(finalAngle) * branchLength * 0.7 // Menos caída vertical
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
        color: '#228B22', // Verde de rama
        data: projectNode.data
      };
      
      branchNodes.push(branch);

      // 🍃 Mejora 4: Generar hojas con separación adecuada
      if (projectNode.children) {
        const totalTasks = projectNode.children.length;
        
        projectNode.children.forEach((taskNode, taskIndex) => {
          // 📍 Posición a lo largo de la rama (más distribuida)
          const progress = 0.2 + (taskIndex / Math.max(1, totalTasks - 1)) * 0.6; // Entre 20% y 80% de la rama
          const leafPosition = this.getPointOnBranch(branch, originSection, progress);
          
          // 🔄 Alternancia de lados para evitar superposición
          const side = taskIndex % 2 === 0 ? 1 : -1;
          const perpOffset = side * (15 + (taskIndex % 3) * 8); // 15, 23, 31 píxeles
          const perpAngle = finalAngle + Math.PI / 2;
          
          // 🎨 Tamaño de hoja más consistente
          const leafSize = 5 + Math.random() * 2; // Entre 5-7 píxeles
          
          const leaf: OrganicNode = {
            id: taskNode.id,
            type: 'leaf',
            x: leafPosition.x + Math.cos(perpAngle) * perpOffset,
            y: leafPosition.y + Math.sin(perpAngle) * perpOffset,
            size: leafSize,
            angle: finalAngle + side * 0.3, // Rotación según el lado
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
   * Generates Bézier curves for organic connections
   */
  private generateBezierCurve(start: { x: number; y: number }, end: { x: number; y: number }, type: 'root' | 'branch'): { 
    startX: number; startY: number; 
    cp1x: number; cp1y: number; cp2x: number; cp2y: number; 
    endX: number; endY: number; 
  } {
    const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    const curvature = distance * 0.3;
    
    if (type === 'root') {
      return {
        startX: start.x,
        startY: start.y,
        cp1x: start.x + (Math.random() - 0.5) * 20,
        cp1y: start.y + curvature * 0.3,
        cp2x: end.x + (Math.random() - 0.5) * 15,
        cp2y: (start.y + end.y) / 2 + curvature * 0.5,
        endX: end.x,
        endY: end.y
      };
    } else {
      return {
        startX: start.x,
        startY: start.y,
        cp1x: start.x + (end.x - start.x) * 0.3,
        cp1y: start.y - curvature * 0.5,
        cp2x: start.x + (end.x - start.x) * 0.7,
        cp2y: end.y - curvature * 0.3,
        endX: end.x,
        endY: end.y
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
