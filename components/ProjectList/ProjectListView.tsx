import React, { useContext, useMemo, useState } from 'react';
import '../LivingTree/livingTree.css';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { ProjectBranch, ProjectBranchStatus } from '../../types';
import { PROJECT_STATUS_FILTERS, buildProjectSummaries, countByStatus } from '../../utils/projectSummary';

type StatusFilter = 'all' | ProjectBranchStatus;
type ProjectHealth = 'neglected' | 'needs_attention' | 'healthy' | 'empty';

interface ProjectSummary {
  project: ProjectBranch;
  totalStages: number;
  completedStages: number;
  attentionStages: number;
  progress: number;
  health: ProjectHealth;
  lastActivityAt: string | null;
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Todos',
  active: 'Activos',
  paused: 'Pausados',
  completed: 'Completados',
};

const STATUS_LABELS_ONE: Record<ProjectBranchStatus, string> = { active: 'Activa', paused: 'En pausa', completed: 'Cerrada' };

const HEALTH_INFO: Record<ProjectHealth, { label: string; dot: string }> = {
  healthy: { label: 'Al día', dot: '#5f9a3a' },
  needs_attention: { label: 'Necesita atención', dot: '#d6a21e' },
  neglected: { label: 'Descuidada', dot: '#b0703a' },
  empty: { label: 'Sin tareas', dot: '#a5a79a' },
};

const formatRelative = (iso: string | null): string => {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return '—';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'hace un momento';
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

interface ProjectListViewProps {
  onSelectProject: (project: ProjectBranch) => void;
}

const ProjectListView: React.FC<ProjectListViewProps> = ({ onSelectProject }) => {
  const { projects, currentTasks } = useContext(AppContext) as AppContextType;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const counts = useMemo(() => countByStatus(projects) as Record<StatusFilter, number>, [projects]);
  const summaries = useMemo(
    () => buildProjectSummaries(projects, currentTasks, statusFilter) as ProjectSummary[],
    [projects, currentTasks, statusFilter],
  );

  return (
    <div className="lt-archive lt-listview">
      <h2>Tus ramas</h2>
      <p className="lt-sub">Todos los proyectos de un vistazo. Haz clic en uno para verlo en el árbol.</p>
      <div className="lt-tabs" role="tablist" aria-label="Filtrar proyectos por estado">
        {(PROJECT_STATUS_FILTERS as StatusFilter[]).map((filter) => (
          <button key={filter} role="tab" aria-selected={filter === statusFilter} aria-pressed={filter === statusFilter} onClick={() => setStatusFilter(filter)}>
            {STATUS_LABELS[filter]} ({counts[filter]})
          </button>
        ))}
      </div>
      {summaries.length === 0 && (
        <p className="lt-plain">
          {projects.length === 0 ? 'Todavía no hay ramas. Brota la primera desde el árbol.' : `No hay proyectos ${STATUS_LABELS[statusFilter].toLowerCase()}.`}
        </p>
      )}
      <ul className="lt-cards">
        {summaries.map((summary) => {
          const { project } = summary;
          const health = HEALTH_INFO[summary.health];
          return (
            <li key={project.id}>
              <button className="lt-card" onClick={() => onSelectProject(project)}>
                <span className="lt-card-head">
                  <b>{project.title}</b>
                  <span className={`lt-chip ${project.status}`}>{STATUS_LABELS_ONE[project.status]}</span>
                </span>
                {project.description && <span className="lt-card-desc">{project.description}</span>}
                <span className="lt-bar" aria-hidden="true">
                  <i style={{ width: `${summary.progress}%` }} />
                </span>
                <span className="lt-card-meta">
                  <span>
                    {summary.completedStages}/{summary.totalStages} tareas
                  </span>
                  <span>
                    <i className="lt-dot" style={{ background: health.dot }} /> {health.label}
                    {summary.attentionStages > 0 && ` (${summary.attentionStages})`}
                  </span>
                  <span>Prioridad {project.priorityLevel}</span>
                  <span>Última actividad {formatRelative(summary.lastActivityAt)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ProjectListView;
