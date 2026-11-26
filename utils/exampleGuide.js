// The first-run guide works on an example tree: it remembers what the example looked like,
// notices when the person has made each part their own, and can remove what is left of it.

const byId = (items, field = 'title') => Object.fromEntries((items || []).map((item) => [item.id, item[field] || '']));

/** What the example tree looked like when it was planted. */
export const snapshotExample = (data) => ({
  purpose: data.purpose || '',
  roots: byId(data.roots),
  trunk: byId(data.trunkSegments),
  branches: byId(data.projects),
  leaves: (data.stages || []).map((leaf) => leaf.id),
  apps: byId(data.connections, 'name'),
});

const changed = (original, items, field = 'title') => {
  const live = (items || []).filter((item) => !item.deletedAt);
  if (live.some((item) => !(item.id in original))) return true;
  return live.some((item) => original[item.id] !== (item[field] || ''));
};

/** Which parts of the tree the person has already made their own. */
export const guideProgress = (snap, state) => ({
  sun: Boolean(snap) && (state.purpose || '') !== snap.purpose,
  roots: Boolean(snap) && changed(snap.roots, state.roots),
  trunk: Boolean(snap) && changed(snap.trunk, state.trunkSegments),
  branch: Boolean(snap) && changed(snap.branches, state.projects),
});

/** The parts of the example nobody has touched, ready to be removed. */
export const leftoverExample = (snap, state) => {
  if (!snap) return { purpose: false, rootIds: [], trunkIds: [], branchIds: [], appIds: [], count: 0 };
  const untouched = (items, original, field = 'title') =>
    (items || []).filter((item) => item.id in original && original[item.id] === (item[field] || '')).map((item) => item.id);
  const exampleLeaves = new Set(snap.leaves);
  const stages = state.stages || [];
  const branchIds = untouched(state.projects, snap.branches).filter((id) =>
    stages.filter((leaf) => leaf.projectId === id && !leaf.deletedAt).every((leaf) => exampleLeaves.has(leaf.id))
  );
  const keptBranches = (state.projects || []).filter((p) => !branchIds.includes(p.id) && !p.deletedAt);
  const appIds = untouched(state.connections, snap.apps, 'name').filter((id) => !keptBranches.some((p) => p.appId === id));
  const out = {
    purpose: Boolean(snap.purpose) && (state.purpose || '') === snap.purpose,
    rootIds: untouched(state.roots, snap.roots),
    trunkIds: untouched(state.trunkSegments, snap.trunk),
    branchIds,
    appIds,
  };
  return { ...out, count: Number(out.purpose) + out.rootIds.length + out.trunkIds.length + out.branchIds.length + out.appIds.length };
};
