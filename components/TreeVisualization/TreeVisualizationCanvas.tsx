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
  startWidth: number;
  tipWidth: number;
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
const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
const cubicPoint = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
};
const cubicTangent = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
  const mt = 1 - t;
  return {
    x: 3 * mt ** 2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t ** 2 * (p3.x - p2.x),
    y: 3 * mt ** 2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t ** 2 * (p3.y - p2.y),
  };
};

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
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

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

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const trunkTopY = treeSpecies === 'fir' ? h * 0.1 : h * 0.16;
      const trunkBasePoint: Point = { x: trunkX, y: groundY };
      const trunkC1: Point =
        treeSpecies === 'fir'
          ? { x: trunkX + swayAt(h * 0.58) * 0.12, y: h * 0.62 }
          : treeSpecies === 'cherry'
            ? { x: trunkX - 14 + swayAt(h * 0.62) * 0.55, y: h * 0.64 }
            : { x: trunkX - 10 + swayAt(h * 0.62) * 0.42, y: h * 0.64 };
      const trunkC2: Point =
        treeSpecies === 'fir'
          ? { x: trunkX + swayAt(h * 0.3) * 0.14, y: h * 0.34 }
          : treeSpecies === 'cherry'
            ? { x: trunkX + 10 + swayAt(h * 0.3) * 0.72, y: h * 0.3 }
            : { x: trunkX + 8 + swayAt(h * 0.3) * 0.58, y: h * 0.3 };
      const trunkTopPoint: Point = {
        x: trunkX + swayAt(trunkTopY) * (treeSpecies === 'fir' ? 0.24 : 0.62),
        y: trunkTopY,
      };

      const trunkPointAt = (t: number) => cubicPoint(trunkBasePoint, trunkC1, trunkC2, trunkTopPoint, t);
      const trunkTangentAt = (t: number) => {
        const tangent = cubicTangent(trunkBasePoint, trunkC1, trunkC2, trunkTopPoint, t);
        const length = Math.max(0.001, Math.hypot(tangent.x, tangent.y));
        const normalized = { x: tangent.x / length, y: tangent.y / length };
        return normalized.y > 0 ? { x: -normalized.x, y: -normalized.y } : normalized;
      };
      const trunkTFromY = (y: number) => clamp((groundY - y) / Math.max(1, groundY - trunkTopY), 0, 1);
      const trunkPointAtY = (y: number) => trunkPointAt(trunkTFromY(y));
      const trunkTangentAtY = (y: number) => trunkTangentAt(trunkTFromY(y));

      const branches = parsed.branches;
      const branchSkeletons = branches.map((branch, index) => {
        const total = Math.max(1, branches.length);
        const ratio = total === 1 ? 0.5 : index / (total - 1);
        const side = index % 2 === 0 ? -1 : 1;
        const branchLeaves = leavesByProject.get(branch.id) || [];
        const leafCount = branchLeaves.length;
        let lengthScale = clamp(0.32 + Math.log2(leafCount + 1) * 0.5, 0.32, 2.08);
        let widthScale = clamp(0.28 + Math.log2(leafCount + 1) * 0.44, 0.28, 1.86);
        if (leafCount <= 1) {
          lengthScale *= 0.68;
          widthScale *= 0.62;
        }
        const growthScale = clamp((lengthScale + widthScale) / 2, 0.22, 1.92);

        let startY = h * (0.33 + ratio * 0.31);
        let span = w * (0.16 + ratio * 0.12) * lengthScale;
        let endYOffset = 0;

        if (treeSpecies === 'fir') {
          const layer = index % Math.max(3, Math.ceil(total / 2));
          const layerRatio = layer / Math.max(1, Math.ceil(total / 2) - 1);
          startY = h * (0.2 + ratio * 0.48);
          span = w * (0.11 + (1 - layerRatio) * 0.2) * lengthScale;
          endYOffset = 10 + layer * 5 + lengthScale * 3;
        } else if (treeSpecies === 'cherry') {
          startY = h * (0.28 + ratio * 0.32);
          span = w * (0.2 + ratio * 0.16) * lengthScale;
          endYOffset = 4 + lengthScale * 2;
        }

        const trunkAnchor = trunkPointAtY(startY);
        const trunkDirection = trunkTangentAtY(startY);
        const trunkNormal = { x: -trunkDirection.y, y: trunkDirection.x };

        const approxBaseWidth =
          (treeSpecies === 'oak' ? 34 : treeSpecies === 'fir' ? 22 : 26) * healthFactor;
        const approxTopWidth =
          (treeSpecies === 'oak' ? 10 : treeSpecies === 'fir' ? 8 : 9) * healthFactor;
        const approxTrunkWidth = lerp(approxBaseWidth, approxTopWidth, trunkTFromY(startY));
        const barkOffset = approxTrunkWidth * 0.18;
        const start: Point = {
          x: trunkAnchor.x + trunkNormal.x * side * barkOffset,
          y: trunkAnchor.y,
        };

        const lift = 22 + 8 * lengthScale;
        const gravity = 10 + 14 * lengthScale + Math.abs(ratio - 0.5) * 10 + endYOffset;
        const end: Point = {
          x: start.x + side * span + swayAt(startY) * (treeSpecies === 'fir' ? 0.45 : 0.85),
          y: start.y - lift + gravity,
        };

        const cp1Distance = 24 + 14 * lengthScale;
        const cp1: Point = {
          // Y-shaped tangential birth: first control follows trunk direction upward.
          x: start.x + trunkDirection.x * cp1Distance,
          y: start.y + trunkDirection.y * cp1Distance,
        };

        const cp2Out = span * (treeSpecies === 'fir' ? 0.58 : treeSpecies === 'cherry' ? 0.78 : 0.68);
        const cp2: Point = {
          x: start.x + side * cp2Out,
          // Long branches start rising, then bend and slightly drop by weight.
          y: end.y - (8 - Math.min(6, lengthScale * 3)),
        };

        return {
          id: branch.id,
          node: branch,
          leafCount,
          growthScale,
          start,
          cp1,
          cp2,
          end,
          startY,
        };
      });

      const branchStartYs = branchSkeletons.map((branch) => branch.startY);
      const baseTrunkWidth = (treeSpecies === 'oak' ? 34 : treeSpecies === 'fir' ? 22 : 26) * healthFactor;
      const topTrunkWidth = (treeSpecies === 'oak' ? 9 : treeSpecies === 'fir' ? 7 : 8) * healthFactor;
      const trunkWidthAtY = (y: number) => {
        const t = trunkTFromY(y);
        const releasedBranches = branchStartYs.filter((startY) => startY > y).length;
        const releaseFactor = 1 - clamp(releasedBranches * 0.024, 0, 0.42);
        return clamp(lerp(baseTrunkWidth, topTrunkWidth, t) * releaseFactor, 4, baseTrunkWidth);
      };

      ctx.strokeStyle = palette.trunk;
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = 14;
      const trunkSegments = 24;
      for (let index = 0; index < trunkSegments; index += 1) {
        const t0 = index / trunkSegments;
        const t1 = (index + 1) / trunkSegments;
        const p0 = trunkPointAt(t0);
        const p1 = trunkPointAt(t1);
        const yMid = (p0.y + p1.y) / 2;
        ctx.lineWidth = trunkWidthAtY(yMid);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      const trunkNodes = parsed.trunks.filter((node) => node.id !== 'trunk-hub');
      trunkNodes.forEach((node, index) => {
        const y = groundY - (index + 1) * ((groundY - trunkTopY) / Math.max(trunkNodes.length + 1, 2));
        const point = trunkPointAtY(y);
        ctx.fillStyle = palette.trunk;
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        hitNodes.push({
          id: node.id,
          x: point.x,
          y: point.y,
          r: 11,
          node,
          label: String((node.data as Record<string, unknown>)?.title || 'Skill Segment'),
        });
      });

      const branchPaths: BranchPath[] = branchSkeletons.map((skeleton) => {
        const trunkWidth = trunkWidthAtY(skeleton.start.y);
        const startWidth = clamp(
          trunkWidth * (0.36 + skeleton.growthScale * 0.16),
          1.8,
          Math.max(3.2, trunkWidth * 0.72)
        );
        const tipWidth = clamp(startWidth * (0.2 + skeleton.growthScale * 0.06), 0.7, 3.8);

        return {
          id: skeleton.id,
          start: skeleton.start,
          cp1: skeleton.cp1,
          cp2: skeleton.cp2,
          end: skeleton.end,
          leafCount: skeleton.leafCount,
          growthScale: skeleton.growthScale,
          node: skeleton.node,
          startWidth,
          tipWidth,
        };
      });

      const drawTaperedBranch = (branchPath: BranchPath) => {
        ctx.strokeStyle = palette.branch;
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = 8 + branchPath.growthScale * 4;
        const segments = 14;

        for (let index = 0; index < segments; index += 1) {
          const t0 = index / segments;
          const t1 = (index + 1) / segments;
          const p0 = cubicPoint(branchPath.start, branchPath.cp1, branchPath.cp2, branchPath.end, t0);
          const p1 = cubicPoint(branchPath.start, branchPath.cp1, branchPath.cp2, branchPath.end, t1);
          const tMid = (t0 + t1) / 2;
          ctx.lineWidth = lerp(branchPath.startWidth, branchPath.tipWidth, tMid);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
      };

      branchPaths.forEach((branchPath) => {
        drawTaperedBranch(branchPath);

        ctx.fillStyle = palette.branch;
        ctx.beginPath();
        ctx.arc(branchPath.end.x, branchPath.end.y, clamp(branchPath.tipWidth * 1.05, 2, 4), 0, Math.PI * 2);
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
      className="w-full h-full min-h-[360px] sm:min-h-0 relative rounded-2xl overflow-hidden border border-yellow-700/35 shadow-[0_20px_50px_rgba(0,0,0,0.62),inset_0_0_120px_rgba(217,122,0,0.12)]"
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
        onTouchStart={(event) => {
          const touch = event.touches[0];
          if (!touch) return;
          const hitNode = getHitNode(touch.clientX, touch.clientY);
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
