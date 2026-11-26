// Turns app data (roots, trunk, projects, stages, achievements) into the drawing model
// used by the living tree: where each branch grows, how thick it is, how old each leaf is.

/** Fruits are achievements made as products of a branch (old automatic "milestones" are not). */
export const isFruit = (item) => Boolean(item && item.projectId && typeof item.harvested === 'boolean' && !item.deletedAt);

export const DAY_MS = 24 * 60 * 60 * 1000;
const LOW = 0.5;
const HIGH = 0.93;

const daysSince = (iso, now) => {
  const t = new Date(iso || 0).getTime();
  if (!Number.isFinite(t) || t <= 0) return 99;
  return Math.max(0, (now.getTime() - t) / DAY_MS);
};

/** Splits a trunk label in two lines at the space closest to the middle. */
export const splitTwoLines = (title) => {
  const text = String(title || '').trim();
  if (text.length <= 10 || !text.includes(' ')) return [text, ''];
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  }
  return [text.slice(0, best), text.slice(best + 1)];
};

/**
 * Decides where each branch grows. Explicit side/height win; the rest alternate
 * right/left in creation order, older branches lower on the trunk (like a real tree).
 */
export const placeBranches = (projects) => {
  const ordered = [...projects].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const sides = new Map();
  let flip = 0;
  ordered.forEach((project) => {
    const side = project.side === 'left' ? -1 : project.side === 'right' ? 1 : project.side === 'center' ? 0 : null;
    if (side !== null) {
      sides.set(project.id, side);
    } else {
      sides.set(project.id, flip % 2 === 0 ? 1 : -1);
      flip++;
    }
  });
  const placement = new Map();
  [-1, 0, 1].forEach((side) => {
    const group = ordered.filter((project) => sides.get(project.id) === side);
    group.forEach((project, index) => {
      let t;
      if (typeof project.height === 'number') t = LOW + (HIGH + 0.06 - LOW) * Math.min(1, Math.max(0, project.height));
      else if (side === 0) t = 0.99;
      else if (group.length === 1) t = 0.7;
      else t = LOW + ((HIGH - LOW) * index) / (group.length - 1);
      placement.set(project.id, { side, t });
    });
  });
  return placement;
};

export const buildLivingTreeModel = (
  { purpose, roots = [], trunkSegments = [], projects = [], stages = [], achievements = [] },
  now = new Date()
) => {
  const placement = placeBranches(projects);
  const branches = projects.map((project) => {
    const tasks = stages
      .filter((stage) => stage.projectId === project.id)
      .map((stage) => ({
        id: stage.id,
        n: stage.title,
        d: daysSince(stage.lastActivityAt, now),
        done: stage.status === 'completed',
      }));
    const fruits = achievements
      .filter((item) => item.projectId === project.id && isFruit(item))
      .map((item) => ({ id: item.id, n: item.title, done: Boolean(item.harvested) }));
    const age = daysSince(project.createdAt, now);
    const { side, t } = placement.get(project.id) || { side: 1, t: 0.7 };
    return {
      id: project.id,
      name: project.title,
      side,
      t,
      prio: Math.min(5, Math.max(1, Number(project.priorityLevel) || 3)),
      paused: project.status === 'paused',
      young: tasks.length <= 2 || (age < 21 && tasks.length <= 3),
      from: project.sproutedFrom || '',
      tasks,
      fruits,
    };
  });
  return {
    purpose: (purpose || '').trim(),
    roots: roots.map((root) => root.title).filter(Boolean).slice(0, 7),
    trunk: trunkSegments.map((segment) => splitTwoLines(segment.title)).slice(0, 5),
    trunkIds: trunkSegments.map((segment) => segment.id).slice(0, 5),
    branches,
  };
};
