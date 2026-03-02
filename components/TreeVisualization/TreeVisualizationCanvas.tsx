import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { treeThemes } from '../../constants';
import { LeafStatus, TreeNode, TreeSpecies } from '../../types';

interface TreeVisualizationCanvasProps {
  treeData: TreeNode;
  onNodeClick: (node: TreeNode) => void;
  treeSpecies: TreeSpecies;
  waterPulse?: number;
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

interface Point {
  x: number;
  y: number;
}

interface BranchPath {
  id: string;
  start: Point;
  cp1: Point;
  cp2: Point;
  end: Point;
  width: number;
  leafCount: number;
  growthScale: number;
  node: TreeNode;
}

interface WaterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  duration: number;
  size: number;
  glow: number;
  targetX: number;
  targetY: number;
}

interface SceneState {
  trunkX: number;
  groundY: number;
  branchTips: Point[];
  canopyTop: number;
}

const stringHash = (value: string) =>
  value.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000, 7);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
  return { roots, trunks, branches, leaves };
};

const stageColorsBySpecies: Record<TreeSpecies, Record<LeafStatus, { fill: string; glow: string }>> = {
  oak: {
    [LeafStatus.Healthy]: { fill: '#FEEA96', glow: 'rgba(254, 234, 150, 0.72)' },
    [LeafStatus.NeedsAttention]: { fill: '#E6A218', glow: 'rgba(230, 162, 24, 0.58)' },
    [LeafStatus.Neglected]: { fill: '#A59765', glow: 'rgba(165, 151, 101, 0.4)' },
    [LeafStatus.InProgress]: { fill: '#F9D967', glow: 'rgba(249, 217, 103, 0.62)' },
    [LeafStatus.Completed]: { fill: '#FEEDA0', glow: 'rgba(254, 237, 160, 0.76)' },
  },
  fir: {
    [LeafStatus.Healthy]: { fill: '#FEE688', glow: 'rgba(254, 230, 138, 0.68)' },
    [LeafStatus.NeedsAttention]: { fill: '#DD7E00', glow: 'rgba(221, 126, 0, 0.52)' },
    [LeafStatus.Neglected]: { fill: '#8A7649', glow: 'rgba(138, 118, 73, 0.34)' },
    [LeafStatus.InProgress]: { fill: '#F9D967', glow: 'rgba(249, 217, 103, 0.58)' },
    [LeafStatus.Completed]: { fill: '#FEEA96', glow: 'rgba(254, 234, 150, 0.72)' },
  },
  cherry: {
    [LeafStatus.Healthy]: { fill: '#FEEC9D', glow: 'rgba(254, 236, 157, 0.74)' },
    [LeafStatus.NeedsAttention]: { fill: '#E98500', glow: 'rgba(233, 133, 0, 0.55)' },
    [LeafStatus.Neglected]: { fill: '#9A8350', glow: 'rgba(154, 131, 80, 0.38)' },
    [LeafStatus.InProgress]: { fill: '#FEE688', glow: 'rgba(254, 230, 138, 0.62)' },
    [LeafStatus.Completed]: { fill: '#FEEDA0', glow: 'rgba(254, 237, 160, 0.78)' },
  },
};

const speciesPalette = (species: TreeSpecies, trunkColor: string, branchColor: string, rootColor: string) => {
  if (species === 'fir') {
    return {
      trunk: '#C9901E',
      branch: '#D9A33A',
      root: '#B2710E',
      glow: 'rgba(217, 122, 0, 0.3)',
      canopy: 'rgba(217, 122, 0, 0.12)',
    };
  }
  if (species === 'cherry') {
    return {
      trunk: '#B8842A',
      branch: '#E6A218',
      root: '#9A650F',
      glow: 'rgba(254, 234, 150, 0.28)',
      canopy: 'rgba(254, 234, 150, 0.1)',
    };
  }
  return {
    trunk: trunkColor,
    branch: branchColor,
    root: rootColor,
    glow: 'rgba(217, 122, 0, 0.28)',
    canopy: 'rgba(254, 234, 150, 0.09)',
  };
};

const TreeVisualizationCanvas: React.FC<TreeVisualizationCanvasProps> = ({
  treeData,
  onNodeClick,
  treeSpecies,
  waterPulse = 0,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hitNodesRef = useRef<HitNode[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const particlesRef = useRef<WaterParticle[]>([]);
  const sceneRef = useRef<SceneState>({ trunkX: 0, groundY: 0, branchTips: [], canopyTop: 0 });
  const { activeTreeTheme, treeHealth } = useContext(AppContext) as AppContextType;
  const [hoveredNode, setHoveredNode] = useState<HitNode | null>(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  const theme = useMemo(() => treeThemes[activeTreeTheme] || treeThemes.spring, [activeTreeTheme]);
  const parsed = useMemo(() => parseTree(treeData), [treeData]);

  useEffect(() => {
    if (waterPulse <= 0) return;

    const { trunkX, groundY, branchTips, canopyTop } = sceneRef.current;
    if (!Number.isFinite(trunkX) || !Number.isFinite(groundY) || groundY <= 0) return;

    const targets = branchTips.length > 0 ? branchTips : [{ x: trunkX, y: canopyTop || groundY * 0.5 }];
    const particles: WaterParticle[] = [];

    for (let index = 0; index < 84; index += 1) {
      const target = targets[index % targets.length];
      const spread = (Math.random() - 0.5) * 38;
      particles.push({
        x: trunkX + (Math.random() - 0.5) * 34,
        y: groundY - 4 + Math.random() * 10,
        vx: spread * 0.014,
        vy: -0.24 - Math.random() * 0.1,
        age: 0,
        duration: 2100 + Math.random() * 900,
        size: 1.8 + Math.random() * 2.2,
        glow: 8 + Math.random() * 12,
        targetX: target.x + (Math.random() - 0.5) * 26,
        targetY: target.y + (Math.random() - 0.5) * 22,
      });
    }

    particlesRef.current = particles;
  }, [waterPulse]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      const w = width || containerRef.current?.offsetWidth || 600;
      const h = height || containerRef.current?.offsetHeight || 520;
      const dpr = window.devicePixelRatio || 1;
      const groundY = h * 0.8;
      const canopyTop = h * 0.16;
      const trunkX = w / 2;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const dt = lastFrameRef.current > 0 ? time - lastFrameRef.current : 16;
      lastFrameRef.current = time;

      const healthFactor = clamp(treeHealth / 100, 0.2, 1);
      const breezeForce = 1.8 + (1 - healthFactor) * 4.2;
      const windCore = Math.sin(time / 1100) * breezeForce;
      const windSecondary = Math.sin(time / 860 + 0.7) * (breezeForce * 0.5);
      const swayAt = (y: number) => {
        const heightRatio = clamp((groundY - y) / (groundY - canopyTop), 0, 1);
        return (windCore + windSecondary * 0.45) * heightRatio;
      };

      const palette = speciesPalette(treeSpecies, theme.trunkColor, theme.branchColor, theme.rootColor);

      const skyGradient = ctx.createLinearGradient(0, 0, 0, h);
      skyGradient.addColorStop(0, '#101113');
      skyGradient.addColorStop(0.44, '#0E0F11');
      skyGradient.addColorStop(1, '#070707');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, w, h);

      const atmosphericGlow = ctx.createRadialGradient(w * 0.24, h * 0.2, 24, w * 0.45, h * 0.36, w * 0.7);
      atmosphericGlow.addColorStop(0, 'rgba(217, 122, 0, 0.26)');
      atmosphericGlow.addColorStop(0.42, 'rgba(254, 234, 150, 0.12)');
      atmosphericGlow.addColorStop(1, 'rgba(4, 8, 16, 0)');
      ctx.fillStyle = atmosphericGlow;
      ctx.fillRect(0, 0, w, h);

      const canopyAura = ctx.createRadialGradient(trunkX, h * 0.32, 20, trunkX, h * 0.34, w * 0.5);
      canopyAura.addColorStop(0, palette.canopy);
      canopyAura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = canopyAura;
      ctx.fillRect(0, 0, w, h);

      const soil = ctx.createLinearGradient(0, groundY, 0, h);
      soil.addColorStop(0, 'rgba(38, 28, 15, 0.52)');
      soil.addColorStop(1, 'rgba(8, 6, 5, 0.94)');
      ctx.fillStyle = soil;
      ctx.fillRect(0, groundY, w, h - groundY);

      const hitNodes: HitNode[] = [];
      const leavesByProject = new Map<string, TreeNode[]>();
      parsed.leaves.forEach((leaf) => {
        const projectId = String((leaf.data as Record<string, unknown>)?.projectId || '');
        if (!projectId) return;
        if (!leavesByProject.has(projectId)) {
          leavesByProject.set(projectId, []);
        }
        leavesByProject.get(projectId)?.push(leaf);
      });
      const totalProjects = Math.max(1, parsed.branches.length);

      const roots = parsed.roots.length > 0 ? parsed.roots : [{ id: 'default-root', type: 'root', data: { title: 'Purpose' } }];
      const rootReachScale = clamp(0.74 + totalProjects * 0.085 + healthFactor * 0.3, 0.82, 2.05);
      const rootDepthScale = clamp(0.78 + totalProjects * 0.075 + healthFactor * 0.34, 0.86, 2.08);
      roots.forEach((rootNode, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const spread = (30 + index * 22) * rootReachScale;
        const depth = (28 + index * 14) * rootDepthScale;
        const endX = trunkX + side * spread + swayAt(groundY + 26) * 0.4;
        const endY = groundY + depth;

        const midX = trunkX + side * spread * 0.56;
        const midY = groundY + depth * 0.54;
        const nearWidth = clamp((10 + totalProjects * 1.05) * healthFactor * (1 - index * 0.09), 5.8, 18);
        const tipWidth = clamp(nearWidth * 0.3, 1.8, 6.2);

        ctx.strokeStyle = palette.root;
        ctx.lineCap = 'round';
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = 10;

        ctx.lineWidth = nearWidth;
        ctx.beginPath();
        ctx.moveTo(trunkX, groundY + 1);
        ctx.bezierCurveTo(
          trunkX + side * spread * 0.18,
          groundY + depth * 0.22,
          midX - side * spread * 0.12,
          midY - depth * 0.08,
          midX,
          midY
        );
        ctx.stroke();

        ctx.lineWidth = tipWidth;
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.bezierCurveTo(
          midX + side * spread * 0.22,
          midY + depth * 0.19,
          endX - side * spread * 0.12,
          endY - depth * 0.12,
          endX,
          endY
        );
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = palette.root;
        ctx.beginPath();
        ctx.arc(endX, endY, clamp(tipWidth * 0.72, 2.2, 4.4), 0, Math.PI * 2);
        ctx.fill();

        hitNodes.push({
          id: rootNode.id,
          x: endX,
          y: endY,
          r: 10,
          node: rootNode as TreeNode,
          label: String((rootNode.data as Record<string, unknown>)?.title || 'Core Root'),
        });
      });

      const trunkTopY = treeSpecies === 'fir' ? h * 0.12 : h * 0.18;
      const trunkMidY = h * 0.48;
      const trunkTopX = trunkX + swayAt(trunkTopY) * (treeSpecies === 'fir' ? 0.4 : 1);
      const trunkMidX = trunkX + swayAt(trunkMidY) * 0.7;

      const drawTrunkSegment = (
        fromX: number,
        fromY: number,
        cpX: number,
        cpY: number,
        toX: number,
        toY: number,
        widthValue: number
      ) => {
        ctx.strokeStyle = palette.trunk;
        ctx.lineCap = 'round';
        ctx.lineWidth = widthValue;
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.bezierCurveTo(cpX, cpY, cpX, cpY, toX, toY);
        ctx.stroke();
        ctx.shadowBlur = 0;
      };

      if (treeSpecies === 'oak') {
        drawTrunkSegment(trunkX, groundY, trunkX - 14 + swayAt(h * 0.67), h * 0.63, trunkMidX, trunkMidY, 34 * healthFactor);
        drawTrunkSegment(
          trunkMidX,
          trunkMidY,
          trunkMidX + 7 + swayAt(h * 0.3),
          h * 0.28,
          trunkTopX,
          trunkTopY,
          18 * healthFactor
        );
      } else if (treeSpecies === 'fir') {
        drawTrunkSegment(trunkX, groundY, trunkX + swayAt(h * 0.45) * 0.25, h * 0.5, trunkMidX, trunkMidY, 22 * healthFactor);
        drawTrunkSegment(trunkMidX, trunkMidY, trunkTopX, h * 0.26, trunkTopX, trunkTopY, 12 * healthFactor);
      } else {
        drawTrunkSegment(trunkX, groundY, trunkX - 12 + swayAt(h * 0.58), h * 0.62, trunkMidX, trunkMidY, 26 * healthFactor);
        drawTrunkSegment(
          trunkMidX,
          trunkMidY,
          trunkMidX + 6 + swayAt(h * 0.27) * 0.8,
          h * 0.26,
          trunkTopX,
          trunkTopY,
          11 * healthFactor
        );
      }

      const trunkNodes = parsed.trunks.filter((node) => node.id !== 'trunk-hub');
      trunkNodes.forEach((node, index) => {
        const y = groundY - (index + 1) * ((groundY - trunkTopY) / Math.max(trunkNodes.length + 1, 2));
        const x = trunkX + swayAt(y) * 0.45;
        ctx.fillStyle = palette.trunk;
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, 6.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        hitNodes.push({
          id: node.id,
          x,
          y,
          r: 11,
          node,
          label: String((node.data as Record<string, unknown>)?.title || 'Skill Segment'),
        });
      });

      const branches = parsed.branches;
      const branchPaths: BranchPath[] = branches.map((branch, index) => {
        const total = Math.max(1, branches.length);
        const ratio = total === 1 ? 0.5 : index / (total - 1);
        const side = index % 2 === 0 ? -1 : 1;
        const branchLeaves = leavesByProject.get(branch.id) || [];
        const leafCount = branchLeaves.length;
        let lengthScale = clamp(0.32 + Math.log2(leafCount + 1) * 0.5, 0.32, 2.08);
        let widthScale = clamp(0.28 + Math.log2(leafCount + 1) * 0.44, 0.28, 1.86);
        if (leafCount <= 1) {
          lengthScale *= 0.7;
          widthScale *= 0.64;
        }
        const growthScale = clamp((lengthScale + widthScale) / 2, 0.22, 1.92);

        if (treeSpecies === 'fir') {
          const layer = index % Math.max(3, Math.ceil(total / 2));
          const layerRatio = layer / Math.max(1, Math.ceil(total / 2) - 1);
          const startY = h * (0.25 + ratio * 0.43);
          const span = (w * (0.12 + (1 - layerRatio) * 0.2)) * (1 + (1 - healthFactor) * 0.2) * lengthScale;
          const end = {
            x: trunkX + side * span + swayAt(startY) * 0.6,
            y: startY + (16 + layer * 7) * clamp(0.82 + lengthScale * 0.28, 0.78, 1.42),
          };

          return {
            id: branch.id,
            node: branch,
            start: { x: trunkX + swayAt(startY) * 0.18, y: startY },
            cp1: { x: trunkX + side * span * 0.35, y: startY + 2 },
            cp2: { x: end.x - side * 14, y: end.y - 4 },
            end,
            width: clamp((10 - ratio * 4.8) * healthFactor * widthScale, 1.5, 14),
            leafCount,
            growthScale,
          };
        }

        if (treeSpecies === 'cherry') {
          const spread = w * (0.2 + ratio * 0.12);
          const startY = h * (0.34 + ratio * 0.28);
          const reach = spread * (1.35 + (ratio - 0.5) * 0.2) * lengthScale;
          const upward = 24 + Math.abs(0.5 - ratio) * 34;
          const end = {
            x: trunkX + side * reach + swayAt(startY) * 1.25,
            y: startY - upward * clamp(0.82 + lengthScale * 0.22, 0.78, 1.3) + (index % 3) * 6,
          };

          return {
            id: branch.id,
            node: branch,
            start: { x: trunkX + swayAt(startY) * 0.42, y: startY },
            cp1: { x: trunkX + side * 26, y: startY - 12 },
            cp2: { x: end.x - side * (56 + ratio * 28), y: end.y + 16 },
            end,
            width: clamp((7.8 - ratio * 3.2) * healthFactor * widthScale, 1.4, 10.5),
            leafCount,
            growthScale,
          };
        }

        const angle = -Math.PI * 0.88 + ratio * Math.PI * 0.76;
        const radiusX = w * 0.22 * lengthScale;
        const radiusY = h * 0.22 * clamp(0.8 + lengthScale * 0.24, 0.74, 1.32);
        const startY = h * (0.43 + ratio * 0.22);
        const end = {
          x: trunkX + Math.cos(angle) * radiusX + swayAt(startY) * 1.15,
          y: h * 0.33 + Math.sin(angle) * radiusY,
        };
        const direction = end.x >= trunkX ? 1 : -1;

        return {
          id: branch.id,
          node: branch,
          start: { x: trunkX + swayAt(startY) * 0.32, y: startY },
          cp1: { x: trunkX + direction * 34, y: startY - 34 },
          cp2: { x: end.x - direction * 34, y: end.y + 12 },
          end,
          width: clamp((9.5 - ratio * 3.4) * healthFactor * widthScale, 1.4, 13),
          leafCount,
          growthScale,
        };
      });

      branchPaths.forEach((branchPath) => {
        ctx.strokeStyle = palette.branch;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1.4, branchPath.width);
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = 8 + branchPath.growthScale * 4;
        ctx.beginPath();
        ctx.moveTo(branchPath.start.x, branchPath.start.y);
        ctx.bezierCurveTo(
          branchPath.cp1.x,
          branchPath.cp1.y,
          branchPath.cp2.x,
          branchPath.cp2.y,
          branchPath.end.x,
          branchPath.end.y
        );
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = palette.branch;
        ctx.beginPath();
        ctx.arc(branchPath.end.x, branchPath.end.y, 4, 0, Math.PI * 2);
        ctx.fill();

        hitNodes.push({
          id: branchPath.id,
          x: branchPath.end.x,
          y: branchPath.end.y,
          r: 12,
          node: branchPath.node,
          label: String((branchPath.node.data as Record<string, unknown>)?.title || 'Project Branch'),
        });
      });

      const branchMap = new Map(branchPaths.map((path) => [path.id, path]));

      parsed.leaves.forEach((leaf, leafIndex) => {
        const projectId = String((leaf.data as Record<string, unknown>)?.projectId || '');
        const branch = branchMap.get(projectId);
        if (!branch) return;

        const projectLeaves = leavesByProject.get(projectId) || [];
        const localIndex = projectLeaves.findIndex((candidate) => candidate.id === leaf.id);
        const hash = stringHash(leaf.id);

        const tangentRaw = {
          x: branch.end.x - branch.cp2.x,
          y: branch.end.y - branch.cp2.y,
        };
        const tangentLen = Math.max(0.001, Math.hypot(tangentRaw.x, tangentRaw.y));
        const tangent = {
          x: tangentRaw.x / tangentLen,
          y: tangentRaw.y / tangentLen,
        };
        const normal = { x: -tangent.y, y: tangent.x };

        const localCount = Math.max(projectLeaves.length, 1);
        const centerOffset = localIndex - (localCount - 1) / 2;
        const along = 8 + (hash % 7) + (treeSpecies === 'fir' ? 2 : 0) + branch.growthScale * 1.8;
        const spread = centerOffset * (treeSpecies === 'fir' ? 6.2 : treeSpecies === 'cherry' ? 8.5 : 7.1);

        const baseX = branch.end.x + tangent.x * along + normal.x * spread;
        const baseY = branch.end.y + tangent.y * along + normal.y * spread;
        const leafSway = swayAt(baseY) * (0.58 + (hash % 5) * 0.1);

        const lx = baseX + leafSway;
        const ly = baseY + Math.sin(time / 720 + leafIndex * 0.42) * 1.2;

        const stageStatus = ((leaf.data as Record<string, unknown>)?.status as LeafStatus) || LeafStatus.Healthy;
        const paletteByStage = stageColorsBySpecies[treeSpecies];
        const isHighNeglect = treeHealth < 42 && (stageStatus === LeafStatus.Healthy || stageStatus === LeafStatus.NeedsAttention);
        const colorSet = isHighNeglect ? paletteByStage[LeafStatus.Neglected] : paletteByStage[stageStatus] || paletteByStage[LeafStatus.Healthy];
        const stageVisualScale: Record<LeafStatus, { size: number; glow: number }> = {
          [LeafStatus.Healthy]: { size: 1.22, glow: 16.5 },
          [LeafStatus.Completed]: { size: 1.28, glow: 18.5 },
          [LeafStatus.InProgress]: { size: 1.08, glow: 13.5 },
          [LeafStatus.NeedsAttention]: { size: 0.9, glow: 9.5 },
          [LeafStatus.Neglected]: { size: 0.78, glow: 7.5 },
        };
        const leafData = leaf.data as Record<string, unknown>;
        const createdMs = typeof leafData.createdAt === 'string' ? Date.parse(leafData.createdAt) : Number.NaN;
        const lastActivityMs = typeof leafData.lastActivityAt === 'string' ? Date.parse(leafData.lastActivityAt) : Number.NaN;
        const hasNoProgressYet =
          stageStatus !== LeafStatus.Completed &&
          Number.isFinite(createdMs) &&
          Number.isFinite(lastActivityMs) &&
          Math.abs(lastActivityMs - createdMs) < 1000;
        const stageVisual = stageVisualScale[stageStatus] || stageVisualScale[LeafStatus.Healthy];
        const ageScale = hasNoProgressYet ? 0.72 : 1;
        const leafScale = stageVisual.size * ageScale;
        const glowStrength = stageVisual.glow * (hasNoProgressYet ? 0.78 : 1);

        ctx.shadowColor = colorSet.glow;
        ctx.shadowBlur = glowStrength;
        ctx.fillStyle = colorSet.fill;

        if (treeSpecies === 'fir') {
          ctx.strokeStyle = colorSet.fill;
          ctx.lineCap = 'round';
          ctx.lineWidth = clamp(1.2 * leafScale, 0.9, 2.6);
          const needleCount = 4;
          const needleLength = 5 * leafScale;
          for (let n = 0; n < needleCount; n += 1) {
            const nOffset = (n - (needleCount - 1) / 2) * 3.3 * leafScale;
            const nx = lx + normal.x * nOffset;
            const ny = ly + normal.y * nOffset;
            ctx.beginPath();
            ctx.moveTo(nx, ny);
            ctx.lineTo(
              nx + normal.x * needleLength + tangent.x * (1.6 * leafScale),
              ny + normal.y * needleLength + tangent.y * (1.6 * leafScale)
            );
            ctx.stroke();
          }
        } else if (treeSpecies === 'cherry') {
          const angle = Math.atan2(tangent.y, tangent.x) + (hash % 11) * 0.03;
          ctx.beginPath();
          ctx.ellipse(lx, ly, 6.8 * leafScale, 3.4 * leafScale, angle, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const clusterRadius = (4 + (hash % 3)) * leafScale;
          for (let c = 0; c < 3; c += 1) {
            const clusterAngle = (Math.PI * 2 * c) / 3 + (hash % 10) * 0.1;
            const cx = lx + Math.cos(clusterAngle) * 4.2 * leafScale;
            const cy = ly + Math.sin(clusterAngle) * 3.6 * leafScale;
            ctx.beginPath();
            ctx.arc(cx, cy, clusterRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.shadowBlur = 0;

        hitNodes.push({
          id: leaf.id,
          x: lx,
          y: ly,
          r: clamp(8.5 * leafScale, 7, 15),
          node: leaf,
          label: String((leaf.data as Record<string, unknown>)?.title || 'Project Stage'),
        });
      });

      const particles: WaterParticle[] = [];
      particlesRef.current.forEach((particle) => {
        const next = { ...particle };
        next.age += dt;
        if (next.age >= next.duration) return;

        const pull = 0.000045 * dt;
        next.vx += (next.targetX - next.x) * pull;
        next.vy += (next.targetY - next.y) * pull;
        next.vy += 0.00009 * dt;
        next.x += next.vx * dt;
        next.y += next.vy * dt;

        const progress = next.age / next.duration;
        const alpha = 1 - progress;
        ctx.fillStyle = `rgba(103, 232, 249, ${alpha.toFixed(3)})`;
        ctx.shadowColor = `rgba(110, 255, 247, ${(alpha * 0.9).toFixed(3)})`;
        ctx.shadowBlur = next.glow;
        ctx.beginPath();
        ctx.arc(next.x, next.y, next.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        particles.push(next);
      });
      particlesRef.current = particles;

      sceneRef.current = {
        trunkX,
        groundY,
        branchTips: branchPaths.map((path) => ({ x: path.end.x, y: path.end.y })),
        canopyTop,
      };

      hitNodesRef.current = hitNodes;
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastFrameRef.current = 0;
    };
  }, [parsed, theme, treeHealth, treeSpecies, width, height]);

  const getHitNode = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return hitNodesRef.current.find((node) => (x - node.x) ** 2 + (y - node.y) ** 2 <= node.r ** 2) || null;
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative rounded-2xl overflow-hidden border border-yellow-700/35 shadow-[0_20px_50px_rgba(0,0,0,0.62),inset_0_0_120px_rgba(217,122,0,0.12)]"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-2xl"
        onMouseMove={(event) => {
          const hitNode = getHitNode(event.clientX, event.clientY);
          setHoveredNode(hitNode);
          if (hitNode && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            setTooltip({ x: event.clientX - rect.left + 12, y: event.clientY - rect.top + 12 });
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
          className="absolute pointer-events-none text-xs px-2 py-1 rounded-md border border-yellow-500/40 bg-black/75 text-[#FEEA96] shadow-[0_0_18px_rgba(217,122,0,0.45)]"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {hoveredNode.label}
        </div>
      )}
    </div>
  );
};

export default TreeVisualizationCanvas;
