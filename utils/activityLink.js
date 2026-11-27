// "Activity links": opening Productivitree with ?actividad=1&rama=…&tarea=… records
// that you worked on that task. An Apple Shortcut (with a keyboard shortcut) or any
// app that can open a URL can send them, so the tree fills itself while you work.

export const ACTIVITY_PARAM = 'actividad';
const MAX_ACTIVITY = 50;

export const norm = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Reads an activity link from a query string. Returns null when there is none. */
export const parseActivityParams = (search) => {
  const params = new URLSearchParams(search || '');
  if (!params.has(ACTIVITY_PARAM)) return null;
  const branch = (params.get('rama') || '').trim();
  if (!branch) return { error: 'El enlace de actividad no dice en qué rama trabajaste (falta "rama").' };
  return {
    branch,
    task: (params.get('tarea') || '').trim(),
    app: (params.get('app') || '').trim(),
    note: (params.get('nota') || '').trim(),
    url: (params.get('url') || '').trim(),
  };
};

/** Activity links for the Mac app: productivitree://actividad?rama=…&tarea=… */
export const DESKTOP_ACTIVITY_ORIGIN = 'productivitree://actividad';

/**
 * Turns a productivitree:// link into the query string parseActivityParams reads.
 * Returns null for links of other schemes or that do not carry an activity.
 */
export const activitySearchFromUrl = (url) => {
  const text = String(url || '').trim();
  const match = /^productivitree:\/\/([^/?#]*)\/?(\?[^#]*)?/i.exec(text);
  if (!match) return null;
  const params = new URLSearchParams(match[2] || '');
  if (match[1].toLowerCase() === ACTIVITY_PARAM && !params.has(ACTIVITY_PARAM)) params.set(ACTIVITY_PARAM, '1');
  if (!params.has(ACTIVITY_PARAM)) return null;
  return `?${params.toString()}`;
};

/** Builds the activity link for a given app origin; placeholders stay for shortcuts to fill. */
export const buildActivityLink = (origin, { branch = '{rama}', task = '{tarea}', app = '', note } = {}) => {
  const params = new URLSearchParams();
  params.set(ACTIVITY_PARAM, '1');
  params.set('rama', branch);
  if (task) params.set('tarea', task);
  if (app) params.set('app', app);
  if (note) params.set('nota', note);
  return `${origin.replace(/\/$/, '')}/?${params.toString().replace(/%7B/gi, '{').replace(/%7D/gi, '}')}`;
};

/** Fills {rama}, {tarea} and {etiqueta} in an app's URL template. */
export const fillUrlTemplate = (template, { branch = '', task = '' } = {}) => {
  if (!template) return '';
  const tag = norm(branch).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return template
    .replace(/\{rama\}/g, encodeURIComponent(branch))
    .replace(/\{tarea\}/g, encodeURIComponent(task))
    .replace(/\{etiqueta\}/g, encodeURIComponent(tag));
};

/** Only http(s) and app URL schemes are opened; javascript: and data: never are. */
export const isSafeOpenUrl = (url) => {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(String(url || '').trim());
  if (!match) return false;
  const scheme = match[1].toLowerCase();
  return !['javascript', 'data', 'vbscript', 'file', 'blob'].includes(scheme);
};

/**
 * Applies an activity to projects/stages. Finds the branch by id or name and the task
 * by id or name; creates the task when the branch exists but the task does not.
 * @returns {{ok: boolean, error?: string, stages?: object[], projectId?: string, taskId?: string, created?: boolean, message?: string}}
 */
export const applyActivity = ({ projects, stages, userId, now = new Date(), newId }, activity) => {
  const project =
    projects.find((item) => item.id === activity.branch) ||
    projects.find((item) => norm(item.title) === norm(activity.branch));
  if (!project) return { ok: false, error: `No encuentro la rama "${activity.branch}".` };

  const stamp = now.toISOString();
  const entry = {
    id: newId('act'),
    at: stamp,
    source: activity.app || 'Enlace de actividad',
    text: activity.note || (activity.task ? `Trabajaste en «${activity.task}»` : `Trabajaste en ${project.title}`),
    ...(activity.url ? { url: activity.url } : {}),
  };

  const own = stages.filter((item) => item.projectId === project.id);
  let target = activity.task
    ? own.find((item) => item.id === activity.task) || own.find((item) => norm(item.title) === norm(activity.task))
    : own
        .filter((item) => item.status !== 'completed')
        .sort((a, b) => String(b.lastActivityAt).localeCompare(String(a.lastActivityAt)))[0];

  if (!target && !activity.task) {
    return { ok: false, error: `La rama "${project.title}" no tiene tareas abiertas: indica "tarea" en el enlace.` };
  }

  if (!target) {
    target = {
      id: newId('stage'),
      userId,
      projectId: project.id,
      title: activity.task,
      description: '',
      status: 'in_progress',
      priority: 3,
      createdAt: stamp,
      lastActivityAt: stamp,
      activity: [entry],
    };
    return {
      ok: true,
      created: true,
      projectId: project.id,
      taskId: target.id,
      stages: [...stages, target],
      message: `Nueva hoja «${target.title}» en ${project.title}.`,
    };
  }

  const updated = {
    ...target,
    lastActivityAt: stamp,
    status: target.status === 'completed' ? 'completed' : 'in_progress',
    activity: [entry, ...(target.activity || [])].slice(0, MAX_ACTIVITY),
  };
  return {
    ok: true,
    created: false,
    projectId: project.id,
    taskId: target.id,
    stages: stages.map((item) => (item.id === target.id ? updated : item)),
    message: `Anotado: «${target.title}» en ${project.title}.`,
  };
};

export const addActivityEntry = (stage, entry) => ({
  ...stage,
  activity: [entry, ...(stage.activity || [])].slice(0, MAX_ACTIVITY),
});
