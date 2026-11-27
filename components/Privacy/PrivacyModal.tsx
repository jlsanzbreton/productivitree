import { createPortal } from 'react-dom';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { desktopDataLocation } from '../../services/desktop';
import '../LivingTree/livingTree.css';
import { AppContext, AppContextType, BackupSummary } from '../../contexts/AppContext';
import { TESTER_FEEDBACK_URL } from '../../constants';

/** Settings: privacy switches, a full backup and the two "start again" buttons. */
const PrivacyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const {
    consent,
    setAiReflectionConsent,
    privacySettings,
    setPrivacySettings,
    exportAllData,
    deleteAllData,
    downloadBackup,
    previewBackup,
    restoreFromBackup,
    lastBackupAt,
    storagePersisted,
  } = useContext(AppContext) as AppContextType;
  const [status, setStatus] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ text: string; summary: BackupSummary } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [dataFile, setDataFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-ES') : 'fecha desconocida');

  useEffect(() => {
    if (!isOpen) return undefined;
    setStatus(null);
    setBackupError(null);
    setPendingRestore(null);
    desktopDataLocation().then(setDataFile);
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

  const handleDownloadBackup = async () => {
    setBackupError(null);
    try {
      await downloadBackup();
      setStatus('Copia descargada. Guárdala en un sitio seguro, por ejemplo iCloud Drive.');
    } catch (_error) {
      setBackupError('No se pudo crear el archivo de copia.');
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setStatus(null);
    setBackupError(null);
    try {
      const text = await file.text();
      setPendingRestore({ text, summary: previewBackup(text) });
    } catch (error) {
      setPendingRestore(null);
      setBackupError(error instanceof Error ? error.message : 'No se pudo leer el archivo de copia.');
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setIsRestoring(true);
    try {
      await restoreFromBackup(pendingRestore.text);
    } catch (error) {
      setIsRestoring(false);
      setBackupError(error instanceof Error ? error.message : 'No se pudo restaurar la copia.');
    }
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

        <h3>Copias de seguridad</h3>
        <p className="lt-plain">Última copia: {lastBackupAt ? formatDate(lastBackupAt) : 'nunca'}</p>
        <p className="lt-note">
          {storagePersisted === true
            ? 'Tu navegador ha aceptado conservar estos datos.'
            : 'El navegador puede borrar estos datos (Safari, por ejemplo, tras 7 días sin abrir Productivitree). Añadir la app al Dock (Archivo > Añadir al Dock en Safari) y descargar copias de vez en cuando los mantiene a salvo.'}
        </p>
        <div className="lt-acts">
          <button className="lt-btn sprout" onClick={handleDownloadBackup}>
            Descargar una copia
          </button>
          <button className="lt-btn" onClick={() => fileInputRef.current?.click()}>
            Restaurar desde archivo
          </button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleFileSelected} />
        </div>
        {pendingRestore && (
          <div className="lt-msg err" role="alert">
            Copia del {formatDate(pendingRestore.summary.exportedAt)} con {pendingRestore.summary.projects} ramas, {pendingRestore.summary.stages} tareas y{' '}
            {pendingRestore.summary.roots} raíces. Restaurarla reemplaza todo lo que hay ahora en este navegador.
            <div className="lt-acts">
              <button className="lt-btn" onClick={() => setPendingRestore(null)} disabled={isRestoring}>
                Cancelar
              </button>
              <button className="lt-btn danger" onClick={handleConfirmRestore} disabled={isRestoring}>
                {isRestoring ? 'Restaurando…' : 'Reemplazar mis datos'}
              </button>
            </div>
          </div>
        )}
        {backupError && (
          <div className="lt-msg err" role="alert">
            {backupError}
          </div>
        )}

        <h3>Tus datos</h3>
        {dataFile && (
          <p className="lt-sub">
            En esta app de Mac tu árbol se guarda en un archivo de tu ordenador, que no sale de él: <code>{dataFile}</code>
          </p>
        )}
        <div className="lt-acts" style={{ marginTop: 0 }}>
          <button className="lt-btn full" onClick={copyBackup}>
            Copiar todos los datos al portapapeles
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
