import { createPortal } from 'react-dom';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';

/** What is being sprouted, and from where. One dialog for every new element of the tree. */
export type SproutTarget =
  | { kind: 'branch'; fromFruitId?: string }
  | { kind: 'leaf'; projectId: string }
  | { kind: 'fruit'; projectId: string; fromTaskId?: string };

export type SproutResult = { kind: 'branch' | 'leaf' | 'fruit'; id: string; projectId: string };

const COPY = {
  branch: { title: 'Brotar una rama', sub: 'Una rama es un proyecto. Crecerá en el árbol con su propia forma.', name: 'Nombre del proyecto', placeholder: 'Por ejemplo: Novela corta' },
  leaf: { title: 'Brotar una hoja', sub: 'Una hoja es una tarea concreta de esta rama.', name: 'Nombre de la tarea', placeholder: 'Por ejemplo: Corregir el capítulo 3' },
  fruit: { title: 'Brotar un fruto', sub: 'Un fruto es un producto final: algo que se publica, se entrega o se usa.', name: 'Nombre del producto', placeholder: 'Por ejemplo: Relato publicado' },
};

const SproutDialog: React.FC<{ target: SproutTarget | null; onClose: () => void; onDone: (result: SproutResult) => void }> = ({
  target,
  onClose,
  onDone,
}) => {
  const { projects, currentTasks, achievements, connections, roots, sproutBranch, sproutLeaf, sproutFruit } =
    useContext(AppContext) as AppContextType;
  const [name, setName] = useState('');
  const [priority, setPriority] = useState(3);
  const [appId, setAppId] = useState('');
  const [rootId, setRootId] = useState('');
  const [link, setLink] = useState('');
  const [harvested, setHarvested] = useState(false);
  const [pickedProject, setPickedProject] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const fromFruit = target?.kind === 'branch' && target.fromFruitId ? achievements.find((a) => a.id === target.fromFruitId) : undefined;
  const fromFruitProject = fromFruit ? projects.find((p) => p.id === fromFruit.projectId) : undefined;
  const askProject = Boolean(target && target.kind !== 'branch' && !target.projectId);
  const projectId = target && target.kind !== 'branch' ? target.projectId || pickedProject : '';
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const fromTask = target?.kind === 'fruit' && target.fromTaskId ? currentTasks.find((t) => t.id === target.fromTaskId) : undefined;

  useEffect(() => {
    if (!target) return;
    setName(fromFruit ? `${fromFruit.title}: siguiente` : '');
    setPriority(3);
    setAppId(fromFruitProject?.appId || '');
    setRootId(fromFruitProject?.rootId || '');
    setLink('');
    setHarvested(false);
    setPickedProject(projects.find((p) => p.status !== 'completed')?.id || '');
    setTimeout(() => inputRef.current?.focus(), 30);
    // Reset only when a new sprout starts.
  }, [target]);

  useEffect(() => {
    if (!target) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  if (!target) return null;
  const copy = COPY[target.kind];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = name.trim();
    if (!title) {
      inputRef.current?.focus();
      return;
    }
    if (target.kind === 'branch') {
      const id = sproutBranch({ title, priorityLevel: priority, appId: appId || undefined, rootId: rootId || undefined, sproutedFrom: fromFruit?.title });
      onDone({ kind: 'branch', id, projectId: id });
    } else if (!projectId) {
      return;
    } else if (target.kind === 'leaf') {
      const id = sproutLeaf(projectId, { title, link: link.trim() || undefined });
      onDone({ kind: 'leaf', id, projectId });
    } else {
      const id = sproutFruit(projectId, { title, fromTaskId: target.fromTaskId, harvested, link: link.trim() || undefined });
      onDone({ kind: 'fruit', id, projectId });
    }
  };

  return createPortal(
    <div className="lt-dialog-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="lt-dialog" role="dialog" aria-modal="true" aria-labelledby="lt-sprout-title" onSubmit={submit}>
        <button type="button" className="lt-x" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <h2 id="lt-sprout-title">{copy.title}</h2>
        <p className="lt-sub">
          {copy.sub}
          {project && !askProject ? ` Rama: ${project.title}.` : ''}
          {fromTask ? ` Sale de la hoja «${fromTask.title}».` : ''}
          {fromFruit ? ` Brota del fruto «${fromFruit.title}».` : ''}
        </p>
        <label className="lt-field">
          {copy.name}
          <input ref={inputRef} value={name} maxLength={60} placeholder={copy.placeholder} onChange={(e) => setName(e.target.value)} required />
        </label>

        {askProject && (
          <label className="lt-field">
            Rama
            <select value={pickedProject} onChange={(e) => setPickedProject(e.target.value)} required>
              {projects
                .filter((p) => p.status !== 'completed')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
            </select>
          </label>
        )}
        {askProject && !projects.some((p) => p.status !== 'completed') && <div className="lt-msg err">Primero brota una rama.</div>}

        {target.kind === 'branch' && (
          <>
            <label className="lt-field">
              Prioridad (el grosor de la rama)
              <select value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
                <option value={1}>1 · muy fina</option>
                <option value={2}>2</option>
                <option value={3}>3 · normal</option>
                <option value={4}>4</option>
                <option value={5}>5 · la más gruesa</option>
              </select>
            </label>
            <label className="lt-field">
              App donde trabajas en ella
              <select value={appId} onChange={(e) => setAppId(e.target.value)}>
                <option value="">Ninguna por ahora</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {roots.length > 0 && (
              <label className="lt-field">
                Pasión que la alimenta
                <select value={rootId} onChange={(e) => setRootId(e.target.value)}>
                  <option value="">Ninguna en concreto</option>
                  {roots.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}

        {target.kind !== 'branch' && (
          <label className="lt-field">
            {target.kind === 'fruit' ? 'Enlace al resultado (opcional)' : 'Enlace al documento (opcional)'}
            <input type="url" value={link} placeholder="https://…" onChange={(e) => setLink(e.target.value)} />
          </label>
        )}
        {target.kind === 'fruit' && (
          <div className="lt-checks">
            <label>
              <input type="checkbox" checked={harvested} onChange={(e) => setHarvested(e.target.checked)} />
              Ya está listo: cosechado
            </label>
          </div>
        )}

        <div className="lt-acts">
          <button type="button" className="lt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="lt-btn sprout">
            Brotar
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default SproutDialog;
