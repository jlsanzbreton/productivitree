import { AppConnection, ProjectBranch, ProjectStageLeaf } from '../../types';
import { fillUrlTemplate, isSafeOpenUrl } from '../../utils/activityLink';

export const DAY_MS = 24 * 60 * 60 * 1000;

export const daysSince = (iso?: string, now = Date.now()) => {
  const t = new Date(iso || 0).getTime();
  return Number.isFinite(t) && t > 0 ? Math.max(0, (now - t) / DAY_MS) : 99;
};

export const ago = (d: number) => (d < 1 ? 'hoy' : d < 2 ? 'ayer' : `hace ${Math.round(d)} días`);

export const when = (iso?: string) => {
  const d = daysSince(iso);
  if (d < 1 / 24) return 'ahora mismo';
  if (d < 1) return `hace ${Math.max(1, Math.round(d * 24))} h`;
  if (d < 2) return 'ayer';
  if (d < 30) return `hace ${Math.round(d)} días`;
  return new Date(iso || 0).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const isDone = (task: ProjectStageLeaf) => task.status === 'completed';

export const leafState = (task: ProjectStageLeaf): [string, string] => {
  if (isDone(task)) return ['Hecha', '#3f5f34'];
  const d = daysSince(task.lastActivityAt);
  return d < 2 ? ['Nueva', '#8cd04f'] : d < 4 ? ['Sana', '#4f9437'] : d < 10 ? ['Pide atención', '#d2b444'] : ['Olvidada', '#9a6432'];
};

export const branchState = (project: ProjectBranch, tasks: ProjectStageLeaf[]): [string, string] => {
  if (project.status === 'paused') return ['En pausa', '#8d949a'];
  if (project.status === 'completed') return ['Cerrada', '#3f5f34'];
  const open = tasks.filter((t) => !isDone(t));
  const d = Math.min(99, ...open.map((t) => daysSince(t.lastActivityAt)));
  return d < 2 ? ['Activa, con brotes', '#8cd04f'] : d < 4 ? ['Sana', '#4f9437'] : d < 10 ? ['Pide atención', '#d2b444'] : ['Abandonada', '#9a6432'];
};

/** URL that "Continuar en …" opens for a task: its own link first, then the branch app's template. */
export const continueUrl = (project: ProjectBranch, task: ProjectStageLeaf | null, connections: AppConnection[]) => {
  if (task?.link && isSafeOpenUrl(task.link)) return task.link;
  const app = connections.find((c) => c.id === project.appId);
  if (!app || !app.openUrl) return '';
  const url = fillUrlTemplate(app.openUrl, { branch: project.title, task: task?.title || '' });
  return isSafeOpenUrl(url) ? url : '';
};

export const openExternal = (url: string) => {
  if (!url || !isSafeOpenUrl(url)) return;
  if (/^https?:/i.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
  else window.location.href = url; // app schemes such as bear:// open the app
};
