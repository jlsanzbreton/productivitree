// Simple, hand- or AI-writable JSON format to feed the whole tree at once.
// It is not the full backup (that one restores every setting): it only carries
// purpose, passions, experience, apps, branches, leaves and fruits.
// Format documented in docs/arbol-json.md.

export const TREE_JSON_VERSION = 1;

const DAY = 24 * 60 * 60 * 1000;
const STATUSES = ['active', 'paused', 'completed'];
const SIDES = ['left', 'right', 'center'];
const KINDS = ['webapp', 'bear', 'github', 'docs', 'other'];

const slug = (value) =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item';

const asItem = (value) => (typeof value === 'string' ? { name: value } : value && typeof value === 'object' ? value : null);
const text = (value, fallback = '') => (typeof value === 'string' ? value.trim() : fallback);
const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const toIso = (value, now) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    // A bare number means "days ago".
    return new Date(now.getTime() - value * DAY).toISOString();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

/**
 * Parses tree JSON text into app entities.
 * @returns {{ok: true, data: object, summary: object, warnings: string[]} | {ok: false, errors: string[]}}
 */
export const parseTreeJson = (raw, { userId, now = new Date() } = {}) => {
  let input;
  try {
    input = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (error) {
    return { ok: false, errors: [`El archivo no es JSON válido: ${error.message}`] };
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['El JSON debe ser un objeto con "branches" (ramas).'] };
  }
  if (input.data && input.data.schemaVersion && !input.branches) {
    return {
      ok: false,
      errors: ['Esto parece una copia de seguridad completa. Restáurala desde Privacidad y ajustes.'],
    };
  }
  if (!Array.isArray(input.branches)) {
    return { ok: false, errors: ['Falta la lista "branches" (ramas).'] };
  }

  const errors = [];
  const warnings = [];
  const stamp = now.toISOString();
  const usedIds = new Set();
  const uniqueId = (prefix, name) => {
    const base = `${prefix}-${slug(name)}`;
    let id = base;
    for (let i = 2; usedIds.has(id); i++) id = `${base}-${i}`;
    usedIds.add(id);
    return id;
  };

  const roots = (Array.isArray(input.passions) ? input.passions : []).map(asItem).filter(Boolean).map((item, index) => {
    const name = text(item.name);
    if (!name) errors.push(`Pasión ${index + 1}: falta "name".`);
    return {
      id: uniqueId('root', name || index),
      userId,
      title: name,
      description: text(item.description),
      strengthLevel: clamp(item.strength, 1, 5, 3),
      createdAt: stamp,
    };
  });

  const trunkSegments = (Array.isArray(input.experience) ? input.experience : []).map(asItem).filter(Boolean).map((item, index) => {
    const name = text(item.name);
    if (!name) errors.push(`Experiencia ${index + 1}: falta "name".`);
    return {
      id: uniqueId('trunk', name || index),
      userId,
      title: name,
      description: text(item.description),
      proficiencyLevel: clamp(item.level, 1, 5, 3),
      yearsOfExperience: clamp(item.years, 0, 80, 0),
      createdAt: stamp,
    };
  });

  const appKeys = new Map();
  const connections = (Array.isArray(input.apps) ? input.apps : []).map(asItem).filter(Boolean).map((item, index) => {
    const name = text(item.name);
    if (!name) errors.push(`App ${index + 1}: falta "name".`);
    const id = uniqueId('app', text(item.id) || name || index);
    appKeys.set(slug(text(item.id) || name), id);
    appKeys.set(slug(name), id);
    return {
      id,
      name,
      kind: KINDS.includes(item.kind) ? item.kind : 'other',
      openUrl: text(item.openUrl),
      tracking: item.tracking === 'link' ? 'link' : 'manual',
      createdAt: stamp,
    };
  });

  const rootByName = new Map(roots.map((root) => [slug(root.title), root.id]));
  const projects = [];
  const stages = [];
  const achievements = [];

  input.branches.map(asItem).forEach((branch, index) => {
    if (!branch) {
      errors.push(`Rama ${index + 1}: debe ser un texto o un objeto.`);
      return;
    }
    const name = text(branch.name);
    if (!name) {
      errors.push(`Rama ${index + 1}: falta "name".`);
      return;
    }
    const projectId = uniqueId('project', name);
    const appRef = text(branch.app);
    const appId = appRef ? appKeys.get(slug(appRef)) : undefined;
    if (appRef && !appId) warnings.push(`Rama "${name}": no encuentro la app "${appRef}" en "apps".`);
    const passionRef = text(branch.passion);
    const rootId = passionRef ? rootByName.get(slug(passionRef)) : undefined;
    if (passionRef && !rootId) warnings.push(`Rama "${name}": no encuentro la pasión "${passionRef}".`);
    const created = toIso(branch.createdAt, now) || stamp;

    projects.push({
      id: projectId,
      userId,
      title: name,
      description: text(branch.description),
      priorityLevel: clamp(branch.priority, 1, 5, 3),
      status: STATUSES.includes(branch.status) ? branch.status : 'active',
      createdAt: created,
      updatedAt: stamp,
      ...(appId ? { appId } : {}),
      ...(rootId ? { rootId } : {}),
      ...(SIDES.includes(branch.side) ? { side: branch.side } : {}),
      ...(branch.height !== undefined ? { height: clamp(branch.height, 0, 1, 0.7) } : {}),
      ...(text(branch.sproutedFrom) ? { sproutedFrom: text(branch.sproutedFrom) } : {}),
    });

    (Array.isArray(branch.leaves) ? branch.leaves : []).map(asItem).forEach((leaf, leafIndex) => {
      const leafName = leaf && text(leaf.name);
      if (!leafName) {
        errors.push(`Rama "${name}", hoja ${leafIndex + 1}: falta "name".`);
        return;
      }
      const last = toIso(leaf.lastActivity, now);
      if (last === undefined) warnings.push(`Hoja "${leafName}": fecha "lastActivity" no válida, uso hoy.`);
      const lastActivityAt = last || stamp;
      const done = leaf.done === true;
      stages.push({
        id: uniqueId('stage', `${name}-${leafName}`),
        userId,
        projectId,
        title: leafName,
        description: text(leaf.description),
        status: done ? 'completed' : 'healthy',
        priority: clamp(leaf.priority, 1, 5, 3),
        createdAt: lastActivityAt,
        lastActivityAt,
        ...(done ? { completedAt: lastActivityAt } : {}),
        ...(text(leaf.notes) ? { notes: text(leaf.notes) } : {}),
        ...(text(leaf.link) ? { link: text(leaf.link) } : {}),
        ...(toIso(leaf.due, now) ? { dueDate: toIso(leaf.due, now) } : {}),
      });
    });

    (Array.isArray(branch.fruits) ? branch.fruits : []).map(asItem).forEach((fruit, fruitIndex) => {
      const fruitName = fruit && text(fruit.name);
      if (!fruitName) {
        errors.push(`Rama "${name}", fruto ${fruitIndex + 1}: falta "name".`);
        return;
      }
      achievements.push({
        id: uniqueId('fruit', `${name}-${fruitName}`),
        projectId,
        title: fruitName,
        type: 'milestone',
        createdAt: stamp,
        harvested: fruit.harvested === true,
        ...(text(fruit.link) ? { link: text(fruit.link) } : {}),
        ...(text(fruit.description) ? { description: text(fruit.description) } : {}),
      });
    });
  });

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    warnings,
    data: {
      purpose: text(input.purpose),
      roots,
      trunkSegments,
      projects,
      stages,
      achievements,
      connections,
    },
    summary: {
      branches: projects.length,
      leaves: stages.length,
      fruits: achievements.filter((item) => item.projectId).length,
      passions: roots.length,
      experience: trunkSegments.length,
      apps: connections.length,
    },
  };
};

/** Builds the same simple format from the current state, so it round-trips. */
export const exportTreeJson = ({ purpose, roots, trunkSegments, projects, stages, achievements, connections }) => {
  const appKey = new Map((connections || []).map((app) => [app.id, app.id]));
  const rootName = new Map((roots || []).map((root) => [root.id, root.title]));
  const doc = {
    productivitree: TREE_JSON_VERSION,
    purpose: purpose || '',
    passions: (roots || []).map((root) =>
      root.description ? { name: root.title, description: root.description } : root.title
    ),
    experience: (trunkSegments || []).map((segment) =>
      segment.description ? { name: segment.title, description: segment.description } : segment.title
    ),
    apps: (connections || []).map(({ id, name, kind, openUrl, tracking }) => ({ id, name, kind, openUrl, tracking })),
    branches: (projects || []).map((project) => {
      const branch = { name: project.title };
      if (project.description) branch.description = project.description;
      branch.priority = project.priorityLevel;
      branch.status = project.status;
      if (project.appId && appKey.has(project.appId)) branch.app = project.appId;
      if (project.rootId && rootName.has(project.rootId)) branch.passion = rootName.get(project.rootId);
      if (project.side) branch.side = project.side;
      if (project.height !== undefined) branch.height = project.height;
      if (project.sproutedFrom) branch.sproutedFrom = project.sproutedFrom;
      branch.createdAt = project.createdAt;
      branch.leaves = (stages || [])
        .filter((stage) => stage.projectId === project.id)
        .map((stage) => {
          const leaf = { name: stage.title, lastActivity: stage.lastActivityAt, done: stage.status === 'completed' };
          if (stage.description) leaf.description = stage.description;
          if (stage.notes) leaf.notes = stage.notes;
          if (stage.link) leaf.link = stage.link;
          if (stage.dueDate) leaf.due = stage.dueDate;
          return leaf;
        });
      branch.fruits = (achievements || [])
        .filter((item) => item.projectId === project.id && typeof item.harvested === 'boolean')
        .map((item) => {
          const fruit = { name: item.title, harvested: Boolean(item.harvested) };
          if (item.link) fruit.link = item.link;
          if (item.description) fruit.description = item.description;
          return fruit;
        });
      return branch;
    }),
  };
  return JSON.stringify(doc, null, 2);
};
