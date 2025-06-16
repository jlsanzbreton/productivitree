
import React, { useRef, useEffect, useContext } from 'react';
import * as d3 from 'd3';
import { TreeNode, TaskData, LeafStatus, AchievementData } from '../../types';
import { leafColors, fruitColors } from '../../constants';
import { AppContext, AppContextType } from '../../contexts/AppContext';


interface TreeVisualizationCanvasProps {
  treeData: TreeNode;
  onLeafClick: (nodeId: string) => void; // Semicolon added here
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
  const { activeTreeTheme, treeHealth } = useContext(AppContext) as AppContextType;


  useEffect(() => {
    if (!canvasRef.current || !treeData || !containerRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    
    const currentWidth = propWidth || containerWidth;
    const currentHeight = propHeight || containerHeight;

    canvas.width = currentWidth * window.devicePixelRatio;
    canvas.height = currentHeight * window.devicePixelRatio;
    canvas.style.width = `${currentWidth}px`;
    canvas.style.height = `${currentHeight}px`;
    context.scale(window.devicePixelRatio, window.devicePixelRatio);

    context.clearRect(0, 0, currentWidth, currentHeight);

    // Create a tree layout
    const root = d3.hierarchy(treeData, d => d.children);
    const treeLayout = d3.tree<TreeNode>().size([currentWidth * 0.9, currentHeight * 0.8]); // Use 90% of width, 80% of height
    treeLayout(root);

    const healthFactor = treeHealth / 100; // 0 to 1

    // Center the tree
    const offsetX = currentWidth * 0.05; // Small margin
    const offsetY = currentHeight * 0.1; // Margin from top for root

    // Draw links (branches)
    context.strokeStyle = `rgba(136, 103, 65, ${0.5 + healthFactor * 0.5})`; // Brownish, more vibrant with health
    context.lineWidth = 2 * healthFactor + 1; // Thicker lines for healthier tree
    
    root.links().forEach(link => {
      const source = link.source as d3.HierarchyPointNode<TreeNode>;
      const target = link.target as d3.HierarchyPointNode<TreeNode>;
      context.beginPath();
      context.moveTo(source.x + offsetX, source.y + offsetY);
      context.lineTo(target.x + offsetX, target.y + offsetY);
      context.stroke();
    });

    // Draw nodes (trunk, leaves, fruits)
    root.descendants().forEach(node => {
      const cx = node.x + offsetX;
      const cy = node.y + offsetY;

      context.beginPath();
      let nodeSize = node.data.size || 5;
      nodeSize = nodeSize * (0.8 + healthFactor * 0.4); // Nodes slightly larger when healthy

      let nodeColor = node.data.color || '#ccc'; // Default color

      if (node.data.type === 'leaf') {
        const task = node.data.data as TaskData;
        const leafStyle = leafColors[task.status];
        // For canvas, gradient is complex. Use a solid color representation or average.
        // Example: using the 'from' color of the gradient.
        if (leafStyle && leafStyle.gradient.includes('from-')) {
            const fromColorMatch = leafStyle.gradient.match(/from-([a-z]+)-(\d+)/);
            if (fromColorMatch) {
                 // This is a simplification; direct Tailwind class to hex/rgb is not trivial
                const colorMap: Record<string,string> = { teal: '#14b8a6', amber: '#f59e0b', red: '#ef4444', gray: '#9ca3af', lime: '#84cc16'};
                nodeColor = colorMap[fromColorMatch[1]] || '#ccc';
            }
        } else {
            nodeColor = '#9ca3af'; // Default completed/gray
        }
        context.fillStyle = nodeColor;
        // Apply animation effect if status indicates
        if (task.status === LeafStatus.RecentActivity || task.status === LeafStatus.Urgent || task.status === LeafStatus.InProgress) {
          // Simulate pulse/sway by slightly varying size or position over time
          // This requires a requestAnimationFrame loop, simplified here
           const time = Date.now() / 1000; // time in seconds
           if (task.status === LeafStatus.Urgent) {
             nodeSize *= (1 + Math.sin(time * 5) * 0.1); // Pulsing size
           } else if (task.status === LeafStatus.RecentActivity) {
             // Swaying would involve minor x-offset changes
             // context.arc(cx + Math.sin(time*2)*3, cy, nodeSize, 0, 2 * Math.PI);
             // For simplicity, just draw a static leaf here
           }
        }

        // Draw leaf shape (e.g., ellipse or actual leaf path)
        context.ellipse(cx, cy, nodeSize * 1.5, nodeSize, Math.PI / 4, 0, 2 * Math.PI);

      } else if (node.data.type === 'fruit') {
        const achievement = node.data.data as AchievementData; // AchievementData
        const fruitTypeKey = achievement.type as keyof typeof fruitColors;
        nodeColor = fruitColors[fruitTypeKey] || '#ffcc00';
        // Convert Tailwind text color to fill color for canvas
        if(nodeColor.startsWith('text-')) {
             const colorName = nodeColor.split('-')[1];
             // const colorShade = nodeColor.split('-')[2]; // e.g., 500 (not used directly in map)
             const colorMap: Record<string,string> = { green: '#22c55e', red: '#ef4444', amber: '#f59e0b'}; // Ensure these match your fruitColors definitions
             context.fillStyle = colorMap[colorName] || '#ffcc00';
        } else {
            context.fillStyle = nodeColor;
        }
        context.arc(cx, cy, nodeSize, 0, 2 * Math.PI);

      } else if (node.data.type === 'rootNode' || node.data.type === 'trunk' || node.data.type === 'branch') {
         const baseColor = node.data.type === 'rootNode' || node.data.type === 'trunk' ? `101, 67, 33` : `136, 103, 65`; // Darker brown for trunk, lighter for branches
         const baseAlpha = node.data.type === 'rootNode' || node.data.type === 'trunk' ? 0.7 : 0.6;
        context.fillStyle = `rgba(${baseColor}, ${baseAlpha + healthFactor * 0.3})`;
        
        if(node.data.type === 'rootNode' || node.data.type === 'trunk'){
            // A thicker representation for the root/trunk
            context.rect(cx - nodeSize * 1.5, cy, nodeSize * 3, nodeSize * 2);
        } else { // branch nodes (usually just connection points)
            context.arc(cx, cy, nodeSize / 2, 0, 2 * Math.PI); // Smaller circle for branch joints
        }
      }
      
      context.fill();
      
      // Add text label (optional, can make it cluttered)
      // context.fillStyle = activeTreeTheme === 'dark' ? 'white' : 'black'; // This activeTreeTheme check needs context value
      // context.font = '10px Arial';
      // context.textAlign = 'center';
      // context.fillText((node.data.data as any).name || node.data.id, cx, cy + nodeSize + 10);

    });

    // Handle click events on canvas to identify nodes
    const clickHandler = (event: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left);
      const y = (event.clientY - rect.top);

      root.descendants().forEach(nodePoint => {
        const dNode = nodePoint;
        const nodeDrawX = dNode.x + offsetX;
        const nodeDrawY = dNode.y + offsetY;
        // Recalculate nodeDrawSize based on its type as it might differ (leaf vs fruit vs branch point)
        let hitTestSize = (dNode.data.size || 5) * (0.8 + healthFactor * 0.4);
        if (dNode.data.type === 'leaf') hitTestSize *= 1.5; // Ellipse major radius for leaves
        else if (dNode.data.type === 'branch') hitTestSize /= 2; // Smaller hit area for branch joints


        // Simple circular hit detection
        const distance = Math.sqrt(Math.pow(x - nodeDrawX, 2) + Math.pow(y - nodeDrawY, 2));
        
        if (distance < hitTestSize) { 
          if (dNode.data.type === 'leaf') {
            onLeafClick(dNode.data.id);
          }
          // console.log('Clicked node:', dNode.data);
        }
      });
    };

    canvas.addEventListener('click', clickHandler);

    // Animation loop for dynamic effects like pulse/sway
    let animationFrameId: number;
    const renderLoop = () => {
        // This is where you would redraw parts of the canvas that animate
        // For instance, to make 'urgent' tasks pulse without redrawing everything:
        // Clear only specific areas or re-draw only animated nodes.
        // For simplicity, this example re-draws everything on data change,
        // true canvas animation would be more optimized.
        
        // If any node has an animation like pulse, you'd trigger a re-draw of that node.
        // The current useEffect handles re-draw on treeData change, which is less frequent.
        // For continuous animations:
        // context.clearRect(0,0, currentWidth, currentHeight); // Or selective clear
        // ... draw all elements, applying time-based transformations for animations ...
        // animationFrameId = requestAnimationFrame(renderLoop);
    };
    // renderLoop(); // Uncomment for continuous animation

    return () => {
      canvas.removeEventListener('click', clickHandler);
      // cancelAnimationFrame(animationFrameId); // If using continuous animation
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeData, activeTreeTheme, treeHealth, propWidth, propHeight, onLeafClick]); // Rerender on data or theme change

  return (
    <div ref={containerRef} className="w-full h-full flex justify-center items-center relative z-10">
        <canvas ref={canvasRef} className="rounded-lg shadow-2xl"></canvas>
    </div>
  );
};

export default TreeVisualizationCanvas;
