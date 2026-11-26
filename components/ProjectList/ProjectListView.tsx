import React, { useContext, useMemo, useState } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { goldenPalette, visualTokens } from '../../constants';
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

const STATUS_CHIP: Record<ProjectBranchStatus, { label: string; className: string }> = {
  active: { label: 'Activo', className: 'border-yellow-400/60 text-[#FEEA96] bg-yellow-500/10' },
  paused: { label: 'Pausado', className: 'border-slate-400/50 text-slate-200 bg-slate-500/10' },
  completed: { label: 'Completado', className: 'border-emerald-400/50 text-emerald-200 bg-emerald-500/10' },
};

const HEALTH_INFO: Record<ProjectHealth, { label: string; dot: string }> = {
  healthy: { label: 'Al día', dot: '#FEEA96' },
  needs_attention: { label: 'Necesita atención', dot: '#E6A218' },
  neglected: { label: 'Descuidado', dot: '#A59765' },
  empty: { label: 'Sin tareas', dot: '#55534C' },
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
    <div className="h-full min-h-0 flex flex-col gap-3 max-w-3xl mx-auto w-full">
      <div role="tablist" aria-label="Filtrar proyectos por estado" className="flex flex-wrap gap-2">
        {(PROJECT_STATUS_FILTERS as StatusFilter[]).map((filter) => {
          const selected = filter === statusFilter;
          return (
            <button
              key={filter}
              role="tab"
              aria-selected={selected}
              onClick={() => setStatusFilter(filter)}
              className={`min-h-9 px-3 py-1.5 rounded-full text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500/60 ${
                selected
                  ? 'bg-gradient-to-r from-[#D97A00] to-[#F9D967] text-black border-transparent font-semibold'
                  : 'border-yellow-700/40 text-[#FEEA96] hover:bg-yellow-500/10'
              }`}
            >
              {STATUS_LABELS[filter]} <span className={selected ? 'opacity-70' : 'opacity-60'}>({counts[filter]})</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
        {summaries.length === 0 && (
          <div
            className="rounded-xl border px-4 py-6 text-center text-sm"
            style={{ background: visualTokens.panelSurface, borderColor: visualTokens.panelBorder, color: visualTokens.panelText }}
          >
            {projects.length === 0
              ? 'Todavía no tienes proyectos. Añade una rama con el botón +.'
              : `No hay proyectos ${STATUS_LABELS[statusFilter].toLowerCase()}.`}
          </div>
        )}

        {summaries.map((summary) => {
          const { project } = summary;
          const chip = STATUS_CHIP[project.status] || STATUS_CHIP.active;
          const health = HEALTH_INFO[summary.health];
          return (
            <button
              key={project.id}
              onClick={() => onSelectProject(project)}
              className="w-full text-left rounded-xl border px-4 py-3 transition-colors hover:border-yellow-500/60 focus:outline-none focus:ring-2 focus:ring-yellow-500/60"
              style={{ background: visualTokens.panelSurface, borderColor: visualTokens.panelBorder, color: visualTokens.panelText }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[#FEEA96] truncate">{project.title}</div>
                  {project.description && <div className="text-xs opacity-75 line-clamp-2 mt-0.5">{project.description}</div>}
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${chip.className}`}>{chip.label}</span>
              </div>

              <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${summary.progress}%`,
                    background: `linear-gradient(90deg, ${goldenPalette.mediumGold}, ${goldenPalette.brightGold})`,
                  }}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-85">
                <span>
                  {summary.completedStages}/{summary.totalStages} tareas · {summary.progress}%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: health.dot }} />
                  {health.label}
                  {summary.attentionStages > 0 && ` (${summary.attentionStages})`}
                </span>
                <span>Prioridad {project.priorityLevel}</span>
                <span>Última actividad {formatRelative(summary.lastActivityAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectListView;
