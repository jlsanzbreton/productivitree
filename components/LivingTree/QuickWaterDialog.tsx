import { createPortal } from 'react-dom';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { QUICK_LOG_SHORTCUT } from '../../services/desktop';

const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

export type QuickWaterResult = { ok: boolean; message: string; projectId?: string; taskId?: string };

/**
 * Manual watering in two seconds: pick the branch, optionally the leaf, Enter.
 * Opened by the global shortcut in the Mac app.
 */
const QuickWaterDialog: React.FC<{ isOpen: boolean; onClose: () => void; onDone: (result: QuickWaterResult) => void }> = ({
  isOpen,
  onClose,
  onDone,
}) => {
  const { projects, currentTasks, recordExternalActivity } = useContext(AppContext) as AppContextType;
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(0);
  const [task, setTask] = useState('');
  const [error, setError] = useState('');
  const queryRef = useRef<HTMLInputElement>(null);

  const branches = useMemo(() => {
    const lastTouch = (id: string) =>
      currentTasks
        .filter((t) => t.projectId === id)
        .reduce((latest, t) => (String(t.lastActivityAt || '') > latest ? String(t.lastActivityAt) : latest), '');
    return projects
      .filter((p) => !p.deletedAt && p.status !== 'completed')
      .sort((a, b) => lastTouch(b.id).localeCompare(lastTouch(a.id)));
  }, [projects, currentTasks]);

  const shown = useMemo(() => {
    const q = norm(query);
    return q ? branches.filter((p) => norm(p.title).includes(q)) : branches;
  }, [branches, query]);

  const branch = shown[Math.min(picked, shown.length - 1)];
  const openLeaves = branch
    ? currentTasks
        .filter((t) => t.projectId === branch.id && t.status !== 'completed')
        .sort((a, b) => String(b.lastActivityAt).localeCompare(String(a.lastActivityAt)))
    : [];

  useEffect(() => {
    if (!isOpen) return undefined;
    setQuery('');
    setPicked(0);
    setTask('');
    setError('');
    setTimeout(() => queryRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // Fresh each time it opens.
  }, [isOpen]);

  useEffect(() => setPicked(0), [query]);

  if (!isOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch) {
      setError('Elige una rama.');
      return;
    }
    const result = recordExternalActivity({ branch: branch.id, task: task.trim(), app: 'Riego manual' });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onDone(result);
  };

  const onQueryKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPicked((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPicked((i) => Math.max(i - 1, 0));
    }
  };

  return createPortal(
    <div className="lt-dialog-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="lt-dialog" role="dialog" aria-modal="true" aria-labelledby="lt-quick-title" onSubmit={submit}>
        <button type="button" className="lt-x" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <h2 id="lt-quick-title">¿En qué has trabajado?</h2>
        <p className="lt-sub">Riego manual: elige la rama, la hoja si quieres, y pulsa Intro. Atajo en cualquier app: {QUICK_LOG_SHORTCUT}.</p>
        <label className="lt-field">
          Rama
          <input
            ref={queryRef}
            value={query}
            placeholder="Escribe para buscar"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onQueryKey}
            aria-controls="lt-quick-branches"
          />
        </label>
        <div id="lt-quick-branches" className="lt-quick-list" role="listbox" aria-label="Ramas">
          {shown.length === 0 && <p className="lt-sub">Ninguna rama coincide.</p>}
          {shown.slice(0, 8).map((p, i) => (
            <button
              type="button"
              key={p.id}
              role="option"
              aria-selected={p.id === branch?.id}
              className={`lt-quick-item${p.id === branch?.id ? ' on' : ''}`}
              onClick={() => setPicked(i)}
            >
              {p.title}
            </button>
          ))}
        </div>
        <label className="lt-field">
          Hoja (opcional)
          <input
            value={task}
            list="lt-quick-leaves"
            maxLength={60}
            placeholder={openLeaves[0] ? `Si la dejas vacía: «${openLeaves[0].title}»` : 'Nombre de la tarea'}
            onChange={(e) => setTask(e.target.value)}
          />
          <datalist id="lt-quick-leaves">
            {openLeaves.map((t) => (
              <option key={t.id} value={t.title} />
            ))}
          </datalist>
        </label>
        {error && (
          <div className="lt-msg err" role="alert">
            {error}
          </div>
        )}
        <div className="lt-acts">
          <button type="button" className="lt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="lt-btn sprout">
            Regar
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default QuickWaterDialog;
