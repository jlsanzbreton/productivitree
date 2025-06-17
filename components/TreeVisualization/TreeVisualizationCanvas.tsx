
import React, { useRef, useEffect, useContext, useState, useCallback } from 'react';
import { TreeNode, TaskData, LeafStatus } from '../../types';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import OrganicTreeLayout, { OrganicTreeConfig, OrganicNode, OrganicLayoutResult } from './OrganicTreeLayout';

interface OrganicRenderConfig {
  canvas: HTMLCanvasElement;
  theme: string;
  showRoots?: boolean;
  showTrunkSections?: boolean;
  enableAnimations?: boolean;
  healthFactor: number;
}

interface OrganicInteractionCallbacks {
  onLeafClick: (nodeId: string) => void;
  onRootHover: () => void;
  onTrunkSectionHover: () => void;
}

// Organic Tree Renderer integrado
class IntegratedOrganicTreeRenderer {
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

  public render(layout: OrganicLayoutResult, _callbacks: OrganicInteractionCallbacks): void {
    if (!this.context) return;

    const { width, height } = this.config.canvas;
    this.context.clearRect(0, 0, width, height);

    this.renderRoots(layout.nodes.filter(n => n.type === 'root'));
    this.renderTrunkSections(layout.nodes.filter(n => n.type === 'trunk'));
    this.renderBranches(layout.nodes.filter(n => n.type === 'branch'));
    this.renderLeaves(layout.nodes.filter(n => n.type === 'leaf'));
  }

  private renderRoots(rootNodes: OrganicNode[]): void {
    if (!this.context || !this.config.showRoots) return;

    rootNodes.forEach(root => {
      this.context!.strokeStyle = root.color || '#DC143C'; // Rojo carmesí por defecto
      this.context!.lineWidth = root.thickness || 3;
      this.context!.lineCap = 'round';
      
      if (root.curve) {
        this.context!.beginPath();
        this.context!.moveTo(root.curve.startX, root.curve.startY);
        this.context!.bezierCurveTo(
          root.curve.cp1x, root.curve.cp1y,
          root.curve.cp2x, root.curve.cp2y,
          root.curve.endX, root.curve.endY
        );
        this.context!.stroke();
      }

      this.context!.fillStyle = root.color || '#DC143C'; // Rojo carmesí por defecto
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

      // Renderizar la rama como una línea con curva
      if (branch.curve) {
        this.context!.beginPath();
        this.context!.moveTo(branch.curve.startX, branch.curve.startY);
        this.context!.bezierCurveTo(
          branch.curve.cp1x, branch.curve.cp1y,
          branch.curve.cp2x, branch.curve.cp2y,
          branch.curve.endX, branch.curve.endY
        );
        this.context!.stroke();
      }

      // Dibujar el final de la rama
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

interface TreeVisualizationCanvasProps {
  treeData: TreeNode;
  onLeafClick: (nodeId: string) => void;
  width?: number;
  height?: number;
}

const TreeVisualizationCanvas: React.FC<TreeVisualizationCanvasProps> = ({ 
  treeData, 
  onLeafClick,
  width: propWidth, 
  height: propHeight 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef<OrganicTreeLayout | null>(null);
  const rendererRef = useRef<IntegratedOrganicTreeRenderer | null>(null);
  
  const { 
    activeTreeTheme, 
    treeHealth, 
    experienceAreas, 
    roots, 
    currentTasks,
    projects
  } = useContext(AppContext) as AppContextType;

  const [isInitialized, setIsInitialized] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [animationsEnabled, setAnimationsEnabled] = useState(false);

  // Memoize callback to prevent unnecessary re-renders
  const handleLeafClick = useCallback((nodeId: string) => {
    onLeafClick(nodeId);
  }, [onLeafClick]);

  // Keyboard shortcut to toggle animations
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'a') {
        setAnimationsEnabled(prev => {
          console.log(`Animations ${!prev ? 'enabled' : 'disabled'}`);
          return !prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Setup canvas and initial render - only run when essential props change
  useEffect(() => {
    if (!canvasRef.current || !treeData || !containerRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    
    const currentWidth = propWidth || containerWidth;
    const currentHeight = propHeight || containerHeight;

    // Set up canvas for high DPI displays
    canvas.width = currentWidth * window.devicePixelRatio;
    canvas.height = currentHeight * window.devicePixelRatio;
    canvas.style.width = `${currentWidth}px`;
    canvas.style.height = `${currentHeight}px`;
    context.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Initialize organic tree layout if not exists
    if (!layoutRef.current) {
      const layoutConfig: OrganicTreeConfig = {
        width: currentWidth,
        height: currentHeight,
        rootDepth: 150,
        trunkHeight: 200,
        maxBranchLevels: 4,
        branchingFactor: 0.7,
        windStrength: 0.3,
        seasonalEffects: activeTreeTheme === 'winter'
      };
      layoutRef.current = new OrganicTreeLayout(layoutConfig);
    }

    // Initialize organic tree renderer if not exists
    if (!rendererRef.current) {
      const renderConfig: OrganicRenderConfig = {
        canvas,
        theme: activeTreeTheme,
        showRoots: true,
        showTrunkSections: true,
        enableAnimations: true,
        healthFactor: treeHealth / 100
      };
      rendererRef.current = new IntegratedOrganicTreeRenderer(renderConfig);
    }

    // Update configuration when props change
    layoutRef.current.updateConfig({
      width: currentWidth,
      height: currentHeight,
      seasonalEffects: activeTreeTheme === 'winter',
      windStrength: treeHealth > 80 ? 0.3 : 0.1
    });

    if (rendererRef.current) {
      rendererRef.current.updateConfig({
        canvas,
        theme: activeTreeTheme,
        healthFactor: treeHealth / 100
      });
    }

    // Set up click handler for interactive elements
    const handleCanvasClick = (event: MouseEvent) => {
      if (!canvasRef.current || !layoutRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const clickedNode = layoutRef.current.getNodeAtPosition(x, y);
      if (clickedNode && clickedNode.type === 'leaf') {
        handleLeafClick(clickedNode.id);
      }
    };

    const handleCanvasMouseMove = (event: MouseEvent) => {
      if (!canvasRef.current || !layoutRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setMousePosition({ x: event.clientX, y: event.clientY });

      const hoveredNodeData = layoutRef.current.getNodeAtPosition(x, y);
      if (hoveredNodeData && hoveredNodeData.type === 'leaf') {
        setHoveredNode(hoveredNodeData.id);
        canvas.style.cursor = 'pointer';
      } else {
        setHoveredNode(null);
        canvas.style.cursor = 'default';
      }
    };

    const handleCanvasMouseLeave = () => {
      setHoveredNode(null);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'default';
      }
    };

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseleave', handleCanvasMouseLeave);
    setIsInitialized(true);

    // Cleanup
    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
      canvas.removeEventListener('mousemove', handleCanvasMouseMove);
      canvas.removeEventListener('mouseleave', handleCanvasMouseLeave);
    };

  }, [
    treeData, 
    activeTreeTheme, 
    treeHealth, 
    propWidth, 
    propHeight,
    handleLeafClick
  ]);

  // Separate animation loop effect
  useEffect(() => {
    if (!isInitialized || !canvasRef.current || !layoutRef.current || !rendererRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const containerWidth = containerRef.current?.offsetWidth || propWidth || 800;
    const containerHeight = containerRef.current?.offsetHeight || propHeight || 600;
    const currentWidth = propWidth || containerWidth;
    const currentHeight = propHeight || containerHeight;

    // Render once initially
    const renderFrame = () => {
      if (!rendererRef.current || !layoutRef.current) return;

      const organicLayout = layoutRef.current.generateLayout(treeData, experienceAreas, roots);
      context.clearRect(0, 0, currentWidth, currentHeight);
      rendererRef.current.render(organicLayout, {
        onLeafClick: handleLeafClick,
        onRootHover: () => {},
        onTrunkSectionHover: () => {}
      });
    };

    // Initial render
    renderFrame();

    // Animation loop with toggle
    if (animationsEnabled) {
      let lastRenderTime = 0;
      const targetFPS = 30;
      const frameInterval = 1000 / targetFPS;

      const animate = (currentTime: number) => {
        if (currentTime - lastRenderTime < frameInterval) {
          requestAnimationFrame(animate);
          return;
        }

        lastRenderTime = currentTime;

        if (!rendererRef.current || !layoutRef.current) return;

        // Update organic animations
        const time = currentTime / 1000;
        layoutRef.current.updateAnimations(time);
        
        renderFrame();
        requestAnimationFrame(animate);
      };

      const frameId = requestAnimationFrame(animate);

      return () => {
        if (frameId) {
          cancelAnimationFrame(frameId);
        }
      };
    }

  }, [isInitialized, experienceAreas, roots, currentTasks, projects, treeData, handleLeafClick, animationsEnabled]);

  return (
    <div ref={containerRef} className="w-full h-full flex justify-center items-center relative z-10">
      <canvas ref={canvasRef} className="rounded-lg shadow-2xl"></canvas>
      
      {/* Tooltip para hojas */}
      {hoveredNode && (
        <div 
          className="absolute pointer-events-none bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm z-20"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 40,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-semibold">Task: {hoveredNode}</div>
          <div className="text-gray-300 text-xs">Click to interact</div>
        </div>
      )}

      {/* Indicador de animaciones */}
      <div className="absolute top-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${animationsEnabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span>Animations {animationsEnabled ? 'ON' : 'OFF'}</span>
        </div>
        <div className="text-gray-300 text-xs mt-1">Press 'A' to toggle</div>
      </div>
    </div>
  );
};

export default TreeVisualizationCanvas;
