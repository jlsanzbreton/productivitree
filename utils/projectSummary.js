// Pure helpers for the project list view. Kept framework-free so they can be unit tested with node:test.

export const PROJECT_STATUS_FILTERS = ['all', 'active', 'paused', 'completed'];

const ATTENTION_STATUSES = new Set(['needs_attention', 'neglected']);

const latestIso = (values) =>
  values.filter(Boolean).reduce((latest, value) => {
    if (!latest) return value;
    return new Date(value).getTime() > new Date(latest).getTime() ? value : latest;
  }, null);

/**
 * Summarise one project with its stages (leaves).
 * health: 'neglected' | 'needs_attention' | 'healthy' | 'empty'
 *   — the worst state among its unfinished stages, so the list flags projects that need care.
 */
export const summarizeProject = (project, stages) => {
  const own = stages.filter((stage) => stage.projectId === project.id);
  const completed = own.filter((stage) => stage.status === 'completed').length;
  const open = own.filter((stage) => stage.status !== 'completed');
  const attention = open.filter((stage) => ATTENTION_STATUSES.has(stage.status)).length;

  let health = 'empty';
  if (own.length > 0) {
    if (open.some((stage) => stage.status === 'neglected')) health = 'neglected';
    else if (open.some((stage) => stage.status === 'needs_attention')) health = 'needs_attention';
    else health = 'healthy';
  }

  return {
    project,
    totalStages: own.length,
    completedStages: completed,
    attentionStages: attention,
    progress: own.length === 0 ? 0 : Math.round((completed / own.length) * 100),
    health,
    lastActivityAt: latestIso([project.updatedAt, ...own.map((stage) => stage.lastActivityAt)]),
  };
};

export const countByStatus = (projects) =>
  projects.reduce(
    (acc, project) => {
      acc.all += 1;
      if (project.status in acc) acc[project.status] += 1;
      return acc;
    },
    { all: 0, active: 0, paused: 0, completed: 0 },
  );

/**
 * Filter by status and sort: higher priority first, then most recent activity, then title.
 */
export const buildProjectSummaries = (projects, stages, statusFilter = 'all') =>
  projects
    .filter((project) => statusFilter === 'all' || project.status === statusFilter)
    .map((project) => summarizeProject(project, stages))
    .sort((a, b) => {
      const priorityDiff = (b.project.priorityLevel || 0) - (a.project.priorityLevel || 0);
      if (priorityDiff !== 0) return priorityDiff;
      const timeDiff = new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.project.title.localeCompare(b.project.title);
    });
