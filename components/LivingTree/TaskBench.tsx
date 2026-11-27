import React, { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { isFruit } from '../../utils/livingTreeModel';
import { continueUrl, isDone, leafState, openExternal, when } from './treeHelpers';

interface TaskBenchProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onSproutFruit: (projectId: string, taskId: string) => void;
  onOpenFruit: (projectId: string, fruitId: string) => void;
}

/** Workbench for one leaf: continue in its app, see what was done, take notes, pick its fruit. */
const TaskBench: React.FC<TaskBenchProps> = ({ taskId, open, onClose, onSproutFruit, onOpenFruit }) => {
  const { currentTasks, projects, connections, achievements, patchTask, logTaskWork, setTaskDone, archiveItem } =
    useContext(AppContext) as AppContextType;
  const task = currentTasks.find((item) => item.id === taskId) || null;
  const project = task ? projects.find((item) => item.id === task.projectId) || null : null;
  const [notes, setNotes] = useState(task?.notes || '');
  const [link, setLink] = useState(task?.link || '');
  const closeRef = useRef<HTMLButtonElement>(null);
  const show = Boolean(open && task && project);

  useEffect(() => {
    setNotes(task?.notes || '');
    setLink(task?.link || '');
    // Only reset the fields when another task is opened.
  }, [task?.id]);

  useEffect(() => {
    if (show) closeRef.current?.focus({ preventScroll: true });
  }, [show, taskId]);

  if (!task || !project) return createPortal(<section className="lt-bench" aria-hidden="true" />, document.body);

  const app = connections.find((c) => c.id === project.appId);
  const url = continueUrl(project, task, connections);
  const [state, color] = leafState(task);
  const fruits = achievements.filter((item) => isFruit(item) && item.fromTaskId === task.id);
  const activity = task.activity || [];

  return createPortal(
    <section className={`lt-bench${show ? ' open' : ''}`} aria-label={`Banco de trabajo: ${task.title}`} aria-hidden={!show}>
      <button ref={closeRef} className="lt-x" onClick={onClose} aria-label="Cerrar">
        ×
      </button>
      <p className="lt-crumb">Rama {project.title} · hoja</p>
      <h2>{task.title}</h2>
      <span className="lt-state">
        <i className="lt-dot" style={{ background: color }} />
        {state}
      </span>
      <p className="lt-last">
        Último avance {when(task.lastActivityAt)}
        {isDone(task) ? ' · terminada' : ''}
      </p>

      <button className="lt-cont" aria-disabled={!url} onClick={() => url && openExternal(url)}>
        {url ? `Continuar en ${app?.name || 'su enlace'}` : app ? `Continuar en ${app.name}` : 'Sin app conectada'}
        <small>
          {url
            ? `Abre «${task.title}» donde lo dejaste`
            : app
              ? `${app.name} aún no tiene enlace: añádelo en Conectar apps o pega abajo el del documento`
              : 'Conecta una app a esta rama o pega abajo el enlace del documento'}
        </small>
      </button>

      <h3>Lo último que hiciste</h3>
      {activity.length ? (
        <ol className="lt-tl">
          {activity.slice(0, 12).map((entry) => (
            <li key={entry.id} className={entry.source === 'Productivitree' ? 'man' : ''}>
              {entry.url ? (
                <button className="lt-link" onClick={() => openExternal(entry.url || '')}>
                  {entry.text}
                </button>
              ) : (
                entry.text
              )}
              <span className="src">
                {entry.source} · {when(entry.at)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="lt-plain">
          Aún no hay nada anotado. Usa «Trabajé en esto ahora» o un enlace de actividad desde tu app para que se vaya llenando solo.
        </p>
      )}

      <label className="lt-field">
        Apuntes de la tarea
        <textarea
          value={notes}
          placeholder="Siguiente paso, ideas, dudas…"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (task.notes || '') && patchTask(task.id, { notes })}
        />
      </label>
      <label className="lt-field">
        Enlace directo al documento (opcional)
        <input
          type="url"
          value={link}
          placeholder="https://…"
          onChange={(e) => setLink(e.target.value)}
          onBlur={() => link.trim() !== (task.link || '') && patchTask(task.id, { link: link.trim() })}
        />
      </label>

      <h3>Frutos de esta hoja</h3>
      {fruits.length ? (
        <ul className="lt-list">
          {fruits.map((fruit) => (
            <li key={fruit.id} className="lt-click" tabIndex={0} onClick={() => onOpenFruit(project.id, fruit.id)} onKeyDown={(e) => e.key === 'Enter' && onOpenFruit(project.id, fruit.id)}>
              <i className="lt-dot" style={{ background: fruit.harvested ? '#d34a35' : '#96be50' }} />
              <span className="nm">{fruit.title}</span>
              <span className="dd">{fruit.harvested ? 'cosechado' : 'madurando'}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="lt-plain">Cuando esta tarea dé un resultado (un texto publicado, un vídeo, una versión), recógelo como fruto.</p>
      )}

      <div className="lt-acts">
        <button className="lt-btn" onClick={() => logTaskWork(task.id)}>
          Trabajé en esto ahora
        </button>
        <button className="lt-btn" onClick={() => setTaskDone(task.id, !isDone(task))}>
          {isDone(task) ? 'Reabrir' : 'Marcar hecha'}
        </button>
        <button className="lt-btn sprout full" onClick={() => onSproutFruit(project.id, task.id)}>
          Brotar un fruto de esta hoja
        </button>
        <button
          className="lt-btn danger full"
          onClick={() => {
            archiveItem('leaf', task.id);
            onClose();
          }}
        >
          Enviar la hoja al archivo
        </button>
      </div>
    </section>,
    document.body
  );
};

export default TaskBench;
