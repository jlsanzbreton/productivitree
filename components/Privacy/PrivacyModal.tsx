import { createPortal } from 'react-dom';
import React, { useContext, useEffect, useState } from 'react';
import '../LivingTree/livingTree.css';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { TESTER_FEEDBACK_URL } from '../../constants';

/** Settings: privacy switches, a full backup and the two "start again" buttons. */
const PrivacyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { consent, setAiReflectionConsent, privacySettings, setPrivacySettings, exportAllData, deleteAllData } = useContext(AppContext) as AppContextType;
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    setStatus(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyBackup = () => {
    navigator.clipboard?.writeText(exportAllData()).then(
      () => setStatus('Copia de seguridad copiada al portapapeles. Pégala en un archivo para guardarla.'),
      () => setStatus('No se pudo copiar. Prueba otra vez.')
    );
  };

  return createPortal(
    <div className="lt-dialog-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lt-dialog" role="dialog" aria-modal="true" aria-labelledby="pt-settings-title">
        <button className="lt-x" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <h2 id="pt-settings-title">Ajustes</h2>
        <p className="lt-sub">Tu árbol se guarda solo en este navegador. Nada sale de aquí salvo que tú lo permitas.</p>

        <h3>Privacidad</h3>
        <div className="lt-checks">
          <label>
            <input type="checkbox" checked={consent.aiReflectionConsent} onChange={(e) => setAiReflectionConsent(e.target.checked)} />
            Permitir enviar las respuestas del test de pasiones a la IA para analizarlas
          </label>
          <label>
            <input
              type="checkbox"
              checked={privacySettings.localOnlyMode}
              onChange={(e) => setPrivacySettings((prev) => ({ ...prev, localOnlyMode: e.target.checked }))}
            />
            Solo en local (recomendado)
          </label>
          <label>
            <input
              type="checkbox"
              checked={privacySettings.analyticsEnabled}
              disabled={privacySettings.localOnlyMode}
              onChange={(e) => setPrivacySettings((prev) => ({ ...prev, analyticsEnabled: e.target.checked }))}
            />
            Estadísticas de uso (desactivadas en modo local)
          </label>
        </div>

        <h3>Tus datos</h3>
        <div className="lt-acts" style={{ marginTop: 0 }}>
          <button className="lt-btn full" onClick={copyBackup}>
            Copiar una copia de seguridad completa
          </button>
          <button
            className="lt-btn danger full"
            onClick={() => {
              if (!window.confirm('Esto borra tu árbol y todos tus datos de este navegador, y vuelve a empezar con el árbol de ejemplo. ¿Seguro?')) return;
              deleteAllData();
              onClose();
            }}
          >
            Borrar todo y empezar de cero
          </button>
        </div>
        {status && (
          <div className="lt-msg" role="status">
            {status}
          </div>
        )}

        <h3>Comentarios</h3>
        <p className="lt-plain">
          <a className="lt-link" href={TESTER_FEEDBACK_URL} target="_blank" rel="noreferrer">
            Enviar comentarios sobre la beta
          </a>
        </p>
      </div>
    </div>,
    document.body
  );
};

export default PrivacyModal;
