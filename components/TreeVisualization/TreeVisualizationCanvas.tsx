import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { leafColors, treeThemes } from '../../constants';
import { LeafStatus, TreeNode } from '../../types';

interface TreeVisualizationCanvasProps {
  treeData: TreeNode;
  onNodeClick: (node: TreeNode) => void;
  width?: number;
  height?: number;
}

interface HitNode {
  id: string;
  x: number;
  y: number;
  r: number;
  node: TreeNode;
  label: string;
}

const stringHash = (value: string) =>
  value.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000, 7);

const parseTree = (treeData: TreeNode) => {
  const roots: TreeNode[] = [];
  const trunks: TreeNode[] = [];
  const branches: TreeNode[] = [];
  const leaves: TreeNode[] = [];

  const walk = (node: TreeNode) => {
    if (node.type === 'root') roots.push(node);
    if (node.type === 'trunk') trunks.push(node);
    if (node.type === 'branch') branches.push(node);
    if (node.type === 'leaf') leaves.push(node);
    node.children?.forEach(walk);
  };

  walk(treeData);
  return {
    roots,
    trunks,
    branches,
    leaves,
  };
};

const TreeVisualizationCanvas: React.FC<TreeVisualizationCanvasProps> = ({ treeData, onNodeClick, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hitNodesRef = useRef<HitNode[]>([]);
  const rafRef = useRef<number | null>(null);
  const { activeTreeTheme, treeHealth } = useContext(AppContext) as AppContextType;
  const [hoveredNode, setHoveredNode] = useState<HitNode | null>(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  const theme = useMemo(() => treeThemes[activeTreeTheme] || treeThemes.spring, [activeTreeTheme]);
  const parsed = useMemo(() => parseTree(treeData), [treeData]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      const w = width || containerRef.current?.offsetWidth || 600;
      const h = height || containerRef.current?.offsetHeight || 520;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const sway = Math.sin(time / 1400) * (0.8 + (100 - treeHealth) / 90);
      const healthFactor = Math.max(0.25, Math.min(1, treeHealth / 100));
      const trunkX = w / 2;
      const groundY = h * 0.79;

      const background = ctx.createLinearGradient(0, 0, 0, h);
      background.addColorStop(0, 'rgba(255,255,255,0.03)');
      background.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);

      const soil = ctx.createLinearGradient(0, groundY, 0, h);
      soil.addColorStop(0, 'rgba(62,39,24,0.45)');
      soil.addColorStop(1, 'rgba(21,16,10,0.75)');
      ctx.fillStyle = soil;
      ctx.fillRect(0, groundY, w, h - groundY);

      const hitNodes: HitNode[] = [];

      const roots = parsed.roots.length > 0 ? parsed.roots : [{ id: 'default-root', type: 'root', data: { title: 'Purpose' } }];
      roots.forEach((rootNode, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        const spread = (index + 1) * 26;
        const endX = trunkX + direction * spread;
        const endY = groundY + 38 + index * 16;

        ctx.strokeStyle = theme.rootColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(trunkX, groundY);
        ctx.bezierCurveTo(
          trunkX + direction * 16,
          groundY + 20,
          endX - direction * 8,
          endY - 10,
          endX,
          endY
        );
        ctx.stroke();

        ctx.fillStyle = theme.rootColor;
        ctx.beginPath();
        ctx.arc(endX, endY, 5, 0, Math.PI * 2);
        ctx.fill();

        hitNodes.push({
          id: rootNode.id,
          x: endX,
          y: endY,
          r: 11,
          node: rootNode as TreeNode,
          label: String((rootNode.data as Record<string, unknown>)?.title || 'Core Root'),
        });
      });

      ctx.strokeStyle = theme.trunkColor;
      ctx.lineCap = 'round';
      ctx.lineWidth = 24 * healthFactor;
      ctx.beginPath();
      ctx.moveTo(trunkX, groundY);
      ctx.bezierCurveTo(trunkX - 10, h * 0.6, trunkX + 8, h * 0.38, trunkX, h * 0.2);
      ctx.stroke();

      const trunkNodes = parsed.trunks.filter((node) => node.id !== 'trunk-hub');
      trunkNodes.forEach((node, index) => {
        const y = groundY - (index + 1) * ((groundY - h * 0.2) / Math.max(trunkNodes.length + 1, 2));
        ctx.fillStyle = theme.trunkColor;
        ctx.beginPath();
        ctx.arc(trunkX, y, 8, 0, Math.PI * 2);
        ctx.fill();
        hitNodes.push({
          id: node.id,
          x: trunkX,
          y,
          r: 12,
          node,
          label: String((node.data as Record<string, unknown>)?.title || 'Skill Segment'),
        });
      });

      const branches = parsed.branches;
      branches.forEach((branch, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const depth = Math.floor(index / 2);
        const startY = h * (0.55 - depth * 0.06);
        const branchLength = Math.max(80, w * (0.17 + (index % 3) * 0.04));
        const endX = trunkX + side * (branchLength + sway * 8);
        const endY = startY - 24 - depth * 8;
        const cpOffset = 24 + depth * 8;

        ctx.strokeStyle = theme.branchColor;
        ctx.lineWidth = 7 * healthFactor;
        ctx.beginPath();
        ctx.moveTo(trunkX, startY);
        ctx.bezierCurveTo(
          trunkX + side * cpOffset,
          startY - 20,
          endX - side * cpOffset,
          endY + 10,
          endX,
          endY
        );
        ctx.stroke();

        ctx.fillStyle = theme.branchColor;
        ctx.beginPath();
        ctx.arc(endX, endY, 6, 0, Math.PI * 2);
        ctx.fill();

        hitNodes.push({
          id: branch.id,
          x: endX,
          y: endY,
          r: 13,
          node: branch,
          label: String((branch.data as Record<string, unknown>)?.title || 'Project Branch'),
        });

        const projectLeaves = parsed.leaves.filter(
          (leaf) => String((leaf.data as Record<string, unknown>)?.projectId || '') === branch.id
        );
        projectLeaves.forEach((leaf, leafIndex) => {
          const hash = stringHash(leaf.id);
          const orbit = 18 + (hash % 26);
          const angle = ((leafIndex + 1) * Math.PI) / Math.max(projectLeaves.length + 1, 2);
          const lx = endX + Math.cos(angle + (hash % 5) * 0.2) * orbit + side * 8;
          const ly = endY - Math.sin(angle) * orbit - 5;
          const stageStatus = (leaf.data as Record<string, unknown>)?.status as LeafStatus;
          const statusColor = leafColors[stageStatus] || leafColors[LeafStatus.Healthy];

          let fillColor = statusColor.fill;
          if (treeHealth < 45 && (stageStatus === LeafStatus.Healthy || stageStatus === LeafStatus.NeedsAttention)) {
            fillColor = leafColors[LeafStatus.Neglected].fill;
          }

          ctx.fillStyle = fillColor;
          ctx.shadowColor = statusColor.glow;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.ellipse(lx, ly, 8, 5.5, (hash % 20) * 0.05 + sway * 0.02, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          hitNodes.push({
            id: leaf.id,
            x: lx,
            y: ly,
            r: 11,
            node: leaf,
            label: String((leaf.data as Record<string, unknown>)?.title || 'Stage'),
          });
        });
      });

      hitNodesRef.current = hitNodes;
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [parsed, theme, treeHealth, width, height]);

  const getHitNode = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return hitNodesRef.current.find((node) => (x - node.x) ** 2 + (y - node.y) ** 2 <= node.r ** 2) || null;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative rounded-xl overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-xl"
        onMouseMove={(event) => {
          const hitNode = getHitNode(event.clientX, event.clientY);
          setHoveredNode(hitNode);
          if (hitNode && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            setTooltip({ x: event.clientX - rect.left + 10, y: event.clientY - rect.top + 10 });
          }
        }}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={(event) => {
          const hitNode = getHitNode(event.clientX, event.clientY);
          if (hitNode) {
            onNodeClick(hitNode.node);
          }
        }}
      />
      {hoveredNode && (
        <div
          className="absolute pointer-events-none text-xs px-2 py-1 rounded-md bg-black/75 text-emerald-100 border border-emerald-500/30"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {hoveredNode.label}
        </div>
      )}
    </div>
  );
};

export default TreeVisualizationCanvas;
