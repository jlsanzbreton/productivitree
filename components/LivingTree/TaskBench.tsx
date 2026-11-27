import React, { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { isFruit, twigParent } from '../../utils/livingTreeModel';
import { confirmAction } from '../../services/desktop';
import { continueUrl, isDone, leafState, openExternal, when } from './treeHelpers';

interface TaskBenchProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onSproutFruit: (projectId: string, taskId: string) => void;
  onOpenFruit: (projectId: string, fruitId: string) => void;
  onOpenTask: (taskId: string) => void;
  onPromoted: (branchId: string) => void;
}

/** Workbench for one leaf: continue in its app, see what was done, take notes, pick its fruit. */
const TaskBench: React.FC<TaskBenchProps> = ({ taskId, open, onClose, onSproutFruit, onOpenFruit, onOpenTask, onPromoted }) => {
  const { currentTasks, projects, connections, achievements, patchTask, logTaskWork, setTaskDone, archiveItem, sproutLeaf, promoteTwig, setTaskParent } =
    useContext(AppContext) as AppContextType;
  const [kidTitle, setKidTitle] = useState('');
  const task = currentTasks.find((item) => item.id === taskId) || null;
  const project = task ? projects.find((item) => item.id === task.projectId) || null : null;
  const [notes, setNotes] = useState(task?.notes || '');
  const [link, setLink] = useState(task?.link || '');
  const closeRef = useRef<HTMLButtonElement>(null);
  const show = Boolean(open && task && project);

  useEffect(() => {
    setNotes(task?.notes || '');
    setLink(task?.link || '');
    setKidTitle('');
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
  const branchLeaves = currentTasks.filter((item) => item.projectId === project.id && !item.deletedAt);
  const parentId = twigParent(task, branchLeaves);
  const parent = parentId ? branchLeaves.find((item) => item.id === parentId) : undefined;
  const kids = parent ? [] : branchLeaves.filter((item) => twigParent(item, branchLeaves) === task.id);
  const plainLeaves = branchLeaves.filter((item) => !twigParent(item, branchLeaves) && item.id !== task.id).length;
  // Leaves of the branch that can join this twig: plain leaves without twig of their own.
  const movable = parent
    ? []
    : branchLeaves.filter(
        (item) => item.id !== task.id && !twigParent(item, branchLeaves) && !branchLeaves.some((other) => twigParent(other, branchLeaves) === item.id)
      );
  // Big enough to stand on its own: as many leaves as the rest of the branch, or at least four.
  const bigTwig = kids.length >= 4 || (kids.length >= 2 && kids.length >= plainLeaves);

  const addKid = (e: React.FormEvent) => {
    e.preventDefault();
    const title = kidTitle.trim();
    if (!title) return;
    sproutLeaf(project.id, { title, parentTaskId: task.id });
    setKidTitle('');
  };

  const promote = async () => {
    const ok = await confirmAction(
      `«${task.title}» pasará a ser una rama propia, saliendo del tronco junto a «${project.title}». ` +
        `Sus ${kids.length} hoja${kids.length === 1 ? '' : 's'} y sus frutos se van con ella. ¿Seguimos?`
    );
    if (!ok) return;
    const id = promoteTwig(task.id);
    if (id) onPromoted(id);
  };

  return createPortal(
    <section className={`lt-bench${show ? ' open' : ''}`} aria-label={`Banco de trabajo: ${task.title}`} aria-hidden={!show}>
      <button ref={closeRef} className="lt-x" onClick={onClose} aria-label="Cerrar">
        ×
      </button>
      <p className="lt-crumb">
        Rama {project.title}
        {parent ? (
          <>
            {' · ramita '}
            <button className="lt-link" onClick={() => onOpenTask(parent.id)}>
              {parent.title}
            </button>
          </>
        ) : null}
        {kids.length ? ' · ramita' : ' · hoja'}
        {parent ? (
          <>
            {' · '}
            <button className="lt-link" onClick={() => setTaskParent(task.id, null)}>
              sacar de la ramita
            </button>
          </>
        ) : null}
      </p>
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

      {!parent && (
        <>
          <h3>{kids.length ? 'Hojas de esta ramita' : 'Hacerla crecer'}</h3>
          {kids.length ? (
            <ul className="lt-list">
              {kids.map((kid) => {
                const [, kidColor] = leafState(kid);
                return (
                  <li key={kid.id} className={`lt-click${isDone(kid) ? ' done' : ''}`} tabIndex={0} onClick={() => onOpenTask(kid.id)} onKeyDown={(e) => e.key === 'Enter' && onOpenTask(kid.id)}>
                    <i className="lt-dot" style={{ background: kidColor }} />
                    <span className="nm">{kid.title}</span>
                    <span className="dd">{isDone(kid) ? 'hecha' : when(kid.lastActivityAt)}</span>
                    <button
                      className="lt-link"
                      title="Devolver a la rama"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskParent(kid.id, null);
                      }}
                    >
                      Sacar
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="lt-plain">Si esta tarea se divide en varias, dale hojas propias: crecerá como una ramita. Si se hace grande, podrás convertirla en rama.</p>
          )}
          <form className="lt-inline" onSubmit={addKid} style={{ display: 'flex', gap: 8 }}>
            <input
              className="lt-input"
              value={kidTitle}
              maxLength={80}
              placeholder={kids.length ? 'Otra hoja para la ramita' : 'Primera hoja de la ramita'}
              aria-label="Nueva hoja de la ramita"
              onChange={(e) => setKidTitle(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="lt-btn" type="submit" disabled={!kidTitle.trim()}>
              Añadir
            </button>
          </form>
          {movable.length > 0 && (
            <>
              <p className="lt-note">O trae hojas que ya tienes en {project.title} (siguen regándose igual, también desde Writer’s Lens):</p>
              <ul className="lt-list">
                {movable.map((leaf) => (
                  <li
                    key={leaf.id}
                    className="lt-click"
                    tabIndex={0}
                    onClick={() => setTaskParent(leaf.id, task.id)}
                    onKeyDown={(e) => e.key === 'Enter' && setTaskParent(leaf.id, task.id)}
                  >
                    <span className="nm">+ {leaf.title}</span>
                    <span className="dd">a la ramita</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {kids.length > 0 && (
            <>
              {bigTwig && <p className="lt-note">Esta ramita ya crece tanto como la rama: quizá merece ser un proyecto propio.</p>}
              <div className="lt-acts">
                <button className={`lt-btn full${bigTwig ? ' sprout' : ''}`} onClick={promote}>
                  Convertir la ramita en rama
                </button>
              </div>
            </>
          )}
        </>
      )}

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
