import { createPortal } from 'react-dom';
import React, { useContext, useEffect, useState } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { describeWritersLensEdit } from '../../utils/sources';
import { SourceQuestion, WRITERS_LENS_APP } from './useAutoSources';

/**
 * "¿Estabas con…?" Asked the first time Writer's Lens shows writing in a project whose
 * branch is not known. With "Recuérdalo", next time it waters on its own.
 */
const SourceAskDialog: React.FC<{
  question: SourceQuestion | null;
  onClose: () => void;
  onDone: (result: { ok: boolean; message: string; projectId?: string; taskId?: string }) => void;
}> = ({ question, onClose, onDone }) => {
  const { projects, connections, recordExternalActivity, patchSourceState } = useContext(AppContext) as AppContextType;
  const [remember, setRemember] = useState(true);
  const [picked, setPicked] = useState('');

  const connection = question ? connections.find((c) => c.id === question.connectionId) : undefined;
  const branches = projects
    .filter((p) => !p.deletedAt && p.status !== 'completed')
    .sort((a, b) => Number(b.appId === question?.connectionId) - Number(a.appId === question?.connectionId));

  useEffect(() => {
    if (!question) return undefined;
    setRemember(true);
    setPicked(branches[0]?.id || '');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // Fresh for each question.
  }, [question]);

  if (!question || !connection) return null;
  const { edit } = question;

  const rememberAs = (branchId: string) => {
    if (!remember) return;
    patchSourceState(connection.id, { projectBranch: { ...(connection.sourceState?.projectBranch || {}), [edit.projectId]: branchId } });
  };

  const answer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked) return;
    rememberAs(picked);
    onDone(recordExternalActivity({ branch: picked, task: edit.projectName, app: WRITERS_LENS_APP, note: describeWritersLensEdit(edit) }));
  };

  const notAProject = () => {
    rememberAs('');
    onDone({ ok: true, message: remember ? `«${edit.projectName}» no regará ninguna rama.` : 'No se ha anotado.' });
  };

  return createPortal(
    <div className="lt-dialog-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="lt-dialog" role="dialog" aria-modal="true" aria-labelledby="lt-ask-title" onSubmit={answer}>
        <button type="button" className="lt-x" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <h2 id="lt-ask-title">¿Estabas con…?</h2>
        <p className="lt-sub">
          Has escrito en «{edit.projectName}» ({connection.name}). {describeWritersLensEdit(edit)}. ¿A qué rama pertenece?
        </p>
        <div className="lt-quick-list" role="radiogroup" aria-label="Ramas">
          {branches.map((p) => (
            <button
              type="button"
              key={p.id}
              role="radio"
              aria-checked={picked === p.id}
              className={`lt-quick-item${picked === p.id ? ' on' : ''}`}
              onClick={() => setPicked(p.id)}
            >
              {p.title}
            </button>
          ))}
        </div>
        <label className="lt-note" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Recuérdalo: la próxima vez riega sin preguntar
        </label>
        <div className="lt-acts">
          <button type="button" className="lt-btn" onClick={notAProject}>
            No es de ninguna rama
          </button>
          <button type="submit" className="lt-btn sprout" disabled={!picked}>
            Sí, anótalo
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default SourceAskDialog;
