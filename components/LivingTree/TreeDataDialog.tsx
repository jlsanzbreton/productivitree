import { createPortal } from 'react-dom';
import React, { useContext, useEffect, useRef, useState } from 'react';
import './livingTree.css';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { exportTreeJson, parseTreeJson } from '../../utils/treeJson';
import { EXAMPLE_TREE } from './exampleTree';
import { confirmAction, saveTextFile } from '../../services/desktop';

type Parsed = ReturnType<typeof parseTreeJson>;

const download = (name: string, text: string) => {
  saveTextFile(name, text).catch((error) => console.error('[Productivitree] No se pudo guardar', error));
};

/** Feed the whole tree from a simple JSON file, or take it out in the same format. */
const TreeDataDialog: React.FC<{ isOpen: boolean; onClose: () => void; initialText?: string; skipConfirm?: boolean; onImported?: () => void }> = ({
  isOpen,
  onClose,
  initialText = '',
  skipConfirm = false,
  onImported,
}) => {
  const { purpose, roots, trunkSegments, projects, currentTasks, achievements, connections, currentUser, importTree } =
    useContext(AppContext) as AppContextType;
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [done, setDone] = useState('');

  // onClose changes on every render of the parent: keep it out of the reset effect,
  // or the "Árbol importado" message is wiped right after importing.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    setText(initialText);
    setParsed(initialText.trim() ? parseTreeJson(initialText, { userId: currentUser.id }) : null);
    setDone('');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  const check = (raw: string) => {
    setText(raw);
    setDone('');
    setParsed(raw.trim() ? parseTreeJson(raw, { userId: currentUser.id }) : null);
  };

  const onFile = (file?: File) => {
    if (!file) return;
    file.text().then(check);
  };

  const exportNow = () => {
    const json = exportTreeJson({ purpose, roots, trunkSegments, projects, stages: currentTasks, achievements, connections });
    const stamp = new Date().toISOString().slice(0, 10);
    download(`productivitree-arbol-${stamp}.json`, json);
  };

  const apply = async () => {
    if (!parsed || !parsed.ok) return;
    const hasTree = projects.length > 0 && !skipConfirm;
    if (hasTree && !(await confirmAction('Esto reemplaza tu árbol actual (ramas, hojas, frutos, pasiones, experiencia y apps). ¿Seguro? Si dudas, expórtalo antes.'))) return;
    importTree(parsed.data as Parameters<typeof importTree>[0]);
    setDone(`Árbol importado: ${parsed.summary.branches} ramas, ${parsed.summary.leaves} hojas y ${parsed.summary.fruits} frutos.`);
    setParsed(null);
    setText('');
    onImported?.();
  };

  return createPortal(
    <div className="lt-dialog-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lt-dialog" role="dialog" aria-modal="true" aria-labelledby="lt-data-title">
        <button className="lt-x" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <h2 id="lt-data-title">Importar o exportar el árbol</h2>
        <p className="lt-sub">
          Un JSON sencillo con propósito, pasiones, experiencia, apps, ramas, hojas y frutos. Puedes escribirlo a mano, pedírselo a una IA o
          generarlo desde otra herramienta. Para guardar o restaurar todo (también los ajustes), usa la copia de seguridad de Privacidad y ajustes.
        </p>

        <h3>Exportar</h3>
        <div className="lt-acts" style={{ marginTop: 0 }}>
          <button className="lt-btn" onClick={exportNow}>
            Descargar mi árbol
          </button>
          <button className="lt-btn" onClick={() => download('productivitree-ejemplo.json', JSON.stringify(EXAMPLE_TREE, null, 2))}>
            Descargar un ejemplo
          </button>
        </div>

        <h3>Importar</h3>
        <label className="lt-field">
          Elige un archivo .json
          <input type="file" accept="application/json,.json" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <label className="lt-field">
          …o pega el JSON aquí
          <textarea value={text} spellCheck={false} placeholder='{ "purpose": "…", "branches": [ … ] }' onChange={(e) => check(e.target.value)} />
        </label>

        {parsed && !parsed.ok && (
          <div className="lt-msg err" role="alert">
            {parsed.errors.slice(0, 6).map((err) => (
              <div key={err}>{err}</div>
            ))}
          </div>
        )}
        {parsed && parsed.ok && (
          <div className="lt-msg">
            Listo para importar: {parsed.summary.branches} ramas, {parsed.summary.leaves} hojas, {parsed.summary.fruits} frutos, {parsed.summary.passions}{' '}
            pasiones, {parsed.summary.experience} áreas de experiencia y {parsed.summary.apps} apps.
            {parsed.warnings.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {parsed.warnings.slice(0, 5).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {done && (
          <div className="lt-msg" role="status">
            {done}
          </div>
        )}
        <div className="lt-acts">
          <button className="lt-btn" onClick={onClose}>
            Cerrar
          </button>
          <button className="lt-btn sprout" disabled={!parsed || !parsed.ok} onClick={apply}>
            Importar y reemplazar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TreeDataDialog;
