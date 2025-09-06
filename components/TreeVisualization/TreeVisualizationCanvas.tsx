
import React, { useRef, useEffect, useContext, useState, useCallback } from 'react';
import { TreeNode, TaskData, LeafStatus } from '../../types';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import OrganicTreeLayout, { OrganicTreeConfig, OrganicNode, OrganicLayoutResult } from './OrganicTreeLayout';
import { TREE_PALETTE, TREE_TEXTURES } from '../../constants';

interface OrganicRenderConfig {
  canvas: HTMLCanvasElement;
  theme: string;
  showRoots?: boolean;
  showTrunkSections?: boolean;
  enableAnimations?: boolean;
  healthFactor: number;
  windIntensity?: number;
  useTextures?: boolean;
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
  private trunkPattern: CanvasPattern | null = null;
  private leafPattern: CanvasPattern | null = null;

  constructor(config: OrganicRenderConfig) {
    this.config = config;
    this.context = config.canvas.getContext('2d');
    this.initTextures();
  }

  public updateConfig(newConfig: Partial<OrganicRenderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.canvas) {
      this.context = newConfig.canvas.getContext('2d');
    }
    if (newConfig.canvas || typeof newConfig.useTextures !== 'undefined') {
      this.initTextures();
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

  private initTextures(): void {
    if (!this.context || !this.config.useTextures) return;

    const trunkImg = new Image();
    trunkImg.src = TREE_TEXTURES.trunk;
    trunkImg.onload = () => {
      this.trunkPattern = this.context!.createPattern(trunkImg, 'repeat');
    };

    const leafImg = new Image();
    leafImg.src = TREE_TEXTURES.leaf;
    leafImg.onload = () => {
      this.leafPattern = this.context!.createPattern(leafImg, 'repeat');
    };
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

  this.context!.fillStyle = (this.config.useTextures && this.trunkPattern) || section.color || TREE_PALETTE.trunk.base;
      
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
  this.context!.strokeStyle = (this.config.useTextures && this.trunkPattern) || branch.color || TREE_PALETTE.trunk.base;
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
  this.context!.fillStyle = (this.config.useTextures && this.trunkPattern) || branch.color || TREE_PALETTE.trunk.base;
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

      const t = this.config.enableAnimations ? performance.now() : 0;
      const windOffset = Math.sin(t / 1000 + leaf.x) * (this.config.windIntensity || 0);
      const angle = (leaf.angle || 0) + windOffset;

      this.context!.fillStyle = (this.config.useTextures && this.leafPattern) || leafColor;
      this.drawLeafShape(leaf, angle);
    });
  }

  private drawLeafShape(leaf: OrganicNode, angle: number): void {
    if (!this.context) return;

    const size = leaf.size;

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
  const [currentAnimationTime, setCurrentAnimationTime] = useState(0); // Para hover detection
  const [debugMode, setDebugMode] = useState(false); // Debug mode for development

  // Memoize callback to prevent unnecessary re-renders
  const handleLeafClick = useCallback((nodeId: string) => {
    onLeafClick(nodeId);
  }, [onLeafClick]);

  // Keyboard shortcuts to toggle animations and debug mode
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'a') {
        setAnimationsEnabled(prev => {
          console.log(`Animations ${!prev ? 'enabled' : 'disabled'}`);
          return !prev;
        });
      }
      if (event.key.toLowerCase() === 'd' && event.ctrlKey) {
        event.preventDefault();
        setDebugMode(prev => {
          console.log(`Debug mode ${!prev ? 'enabled' : 'disabled'}`);
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
      if (clickedNode) {
        // Handle different types of clicks with user feedback
        switch (clickedNode.type) {
          case 'leaf':
            handleLeafClick(clickedNode.id);
            break;
          case 'branch':
            // Project/branch interaction - show info or edit options
            console.log('Branch clicked:', clickedNode.data);
            // TODO: Open project management modal
            alert(`🌿 Project Branch clicked!\n\nThis will open project management in a future update.\n\nBranch: ${clickedNode.id || 'Unnamed project'}`);
            break;
          case 'trunk':
            // Experience area visualization
            console.log('Trunk section clicked:', clickedNode.data);
            // TODO: Show experience details modal
            alert(`🌳 Experience Area clicked!\n\nThis will show your experience details in a future update.\n\nArea: ${clickedNode.id || 'Core experience'}`);
            break;
          case 'root':
            // Passion/root editing
            console.log('Root clicked:', clickedNode.data);
            // TODO: Open passion editing modal
            alert(`🌱 Root clicked!\n\nThis will open passion editing in a future update.\n\nRoot: ${clickedNode.id || 'Unnamed passion'}`);
            break;
        }
      }
    };

    const handleCanvasMouseMove = (event: MouseEvent) => {
      if (!canvasRef.current || !layoutRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setMousePosition({ x: event.clientX, y: event.clientY });

      // Usar el tiempo de animación actual si las animaciones están habilitadas
      const animTime = animationsEnabled ? currentAnimationTime : undefined;
      const hoveredNodeData = layoutRef.current.getNodeAtPosition(x, y, animTime);
      
      if (hoveredNodeData) {
        setHoveredNode(`${hoveredNodeData.type}-${hoveredNodeData.id}`);
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

    // Render function with error handling
    const renderFrame = (useAnimations = false, animationTime = 0) => {
      if (!rendererRef.current || !layoutRef.current) return;

      try {
        let layoutToRender;
        if (useAnimations) {
          // Use animated layout
          layoutToRender = layoutRef.current.getAnimatedLayout(animationTime);
          if (!layoutToRender) {
            // Fallback to static layout if animation fails
            layoutToRender = layoutRef.current.generateLayout(treeData, experienceAreas, roots);
          }
        } else {
          // Use static layout
          layoutToRender = layoutRef.current.generateLayout(treeData, experienceAreas, roots);
        }

        context.clearRect(0, 0, currentWidth, currentHeight);
        rendererRef.current.render(layoutToRender, {
          onLeafClick: handleLeafClick,
          onRootHover: () => {},
          onTrunkSectionHover: () => {}
        });
      } catch (error) {
        console.error('Error rendering tree frame:', error);
        // Fallback: try rendering without animations
        if (useAnimations) {
          renderFrame(false, 0);
        }
      }
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

        // Render with animations
        const time = currentTime / 1000;
        setCurrentAnimationTime(time); // Actualizar tiempo para hover detection
        renderFrame(true, time);
        
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
      
      {/* Tooltip mejorado para todos los tipos de nodos */}
      {hoveredNode && (
        <div 
          className="absolute pointer-events-none bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm z-20"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 40,
            transform: 'translateX(-50%)'
          }}
        >
          {(() => {
            const [nodeType, nodeId] = hoveredNode.split('-');
            switch (nodeType) {
              case 'leaf':
                return (
                  <>
                    <div className="font-semibold">📄 Task: {nodeId}</div>
                    <div className="text-gray-300 text-xs">Click to edit task</div>
                  </>
                );
              case 'branch':
                return (
                  <>
                    <div className="font-semibold">🌿 Project: {nodeId}</div>
                    <div className="text-gray-300 text-xs">Click to manage project</div>
                  </>
                );
              case 'trunk':
                return (
                  <>
                    <div className="font-semibold">🌳 Experience Area</div>
                    <div className="text-gray-300 text-xs">Click to view details</div>
                  </>
                );
              case 'root':
                return (
                  <>
                    <div className="font-semibold">🌱 Root: {nodeId}</div>
                    <div className="text-gray-300 text-xs">Click to edit passion</div>
                  </>
                );
              default:
                return (
                  <>
                    <div className="font-semibold">Element: {hoveredNode}</div>
                    <div className="text-gray-300 text-xs">Click to interact</div>
                  </>
                );
            }
          })()}
        </div>
      )}

      {/* Enhanced animation toggle indicator with debug info */}
      <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg text-sm border border-gray-600">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${animationsEnabled ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="font-medium">
            Wind Effects {animationsEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <div className="text-gray-300 text-xs mt-1 flex items-center">
          <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs mr-1">A</kbd>
          to toggle
        </div>
        {debugMode && (
          <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
            <div>Nodes: {layoutRef.current?.generateLayout(treeData, experienceAreas, roots).nodes.length || 0}</div>
            <div>Projects: {projects.length}</div>
            <div>Tasks: {currentTasks.length}</div>
            <div>Roots: {roots.length}</div>
            <div>Experience: {experienceAreas.length}</div>
            <div>FPS: ~{animationsEnabled ? '30' : '0'}</div>
            <div>Time: {currentAnimationTime.toFixed(1)}s</div>
          </div>
        )}
        {debugMode && (
          <div className="text-gray-400 text-xs mt-1">
            <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs mr-1">Ctrl+D</kbd>
            debug
          </div>
        )}
      </div>
    </div>
  );
};

export default TreeVisualizationCanvas;
