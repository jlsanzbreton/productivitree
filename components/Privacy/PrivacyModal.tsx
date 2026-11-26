import React, { useContext, useRef, useState } from 'react';
import { AppContext, AppContextType, BackupSummary } from '../../contexts/AppContext';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { TESTER_FEEDBACK_URL } from '../../constants';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  const {
    consent,
    setAiReflectionConsent,
    privacySettings,
    setPrivacySettings,
    exportAllData,
    downloadBackup,
    previewBackup,
    restoreFromBackup,
    lastBackupAt,
    storagePersisted,
    resetDemoData,
    deleteAllData,
  } = useContext(AppContext) as AppContextType;
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ text: string; summary: BackupSummary } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : 'unknown date');

  const handleDownloadBackup = async () => {
    setBackupError(null);
    try {
      await downloadBackup();
      setBackupStatus('Backup downloaded. Keep the file somewhere safe, such as iCloud Drive.');
    } catch (_error) {
      setBackupError('Could not create the backup file.');
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBackupStatus(null);
    setBackupError(null);
    try {
      const text = await file.text();
      setPendingRestore({ text, summary: previewBackup(text) });
    } catch (error) {
      setPendingRestore(null);
      setBackupError(error instanceof Error ? error.message : 'Could not read the backup file.');
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setIsRestoring(true);
    try {
      await restoreFromBackup(pendingRestore.text);
    } catch (error) {
      setIsRestoring(false);
      setBackupError(error instanceof Error ? error.message : 'Could not restore the backup.');
    }
  };

  const handleExport = async () => {
    const exportText = exportAllData();
    await navigator.clipboard.writeText(exportText);
    setCopyStatus('Data copied to clipboard.');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Privacy and Safety Controls">
      <div className="space-y-5 text-sm">
        <p className="text-amber-100/85">
          Productivitree is configured for privacy-first local mode. Your core data is stored in your browser unless you explicitly
          choose AI reflection.
        </p>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={consent.aiReflectionConsent}
            onChange={(event) => setAiReflectionConsent(event.target.checked)}
          />
          <span>Allow sending passion-test answers to server-side AI analysis.</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={privacySettings.localOnlyMode}
            onChange={(event) =>
              setPrivacySettings((prev) => ({
                ...prev,
                localOnlyMode: event.target.checked,
              }))
            }
          />
          <span>Force local-only mode (recommended).</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={privacySettings.analyticsEnabled}
            onChange={(event) =>
              setPrivacySettings((prev) => ({
                ...prev,
                analyticsEnabled: event.target.checked,
              }))
            }
            disabled={privacySettings.localOnlyMode}
          />
          <span>Enable analytics (disabled while local-only mode is active).</span>
        </label>
        <section className="space-y-3 rounded-lg border border-yellow-700/30 bg-black/30 p-3">
          <h3 className="text-base font-semibold text-[#FEEA96]">Backups</h3>
          <p className="text-amber-100/80">
            Last backup: {lastBackupAt ? formatDate(lastBackupAt) : 'never'}
          </p>
          {storagePersisted === true ? (
            <p className="text-amber-100/70">Your browser has agreed to keep this data stored.</p>
          ) : (
            <p className="text-amber-200/90">
              Your browser may delete this data, for example Safari after 7 days without opening Productivitree. Adding the
              app to the Dock (File &gt; Add to Dock in Safari) and downloading backups regularly keeps it safe.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleDownloadBackup}>Download Backup</Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Restore from File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>
          {pendingRestore && (
            <div className="space-y-2 rounded-md border border-red-500/40 bg-red-950/30 p-3">
              <p>
                Backup from {formatDate(pendingRestore.summary.exportedAt)} with {pendingRestore.summary.projects} projects,{' '}
                {pendingRestore.summary.stages} stages and {pendingRestore.summary.roots} roots. Restoring replaces all the data
                currently in this browser.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" onClick={handleConfirmRestore} isLoading={isRestoring}>
                  Replace My Data
                </Button>
                <Button variant="secondary" onClick={() => setPendingRestore(null)} disabled={isRestoring}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {backupStatus && <p className="text-[#FEEA96]">{backupStatus}</p>}
          {backupError && <p className="text-red-300">{backupError}</p>}
        </section>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExport}>Copy Export JSON</Button>
          <Button variant="secondary" onClick={resetDemoData}>
            Reset Demo Data
          </Button>
          <Button variant="danger" onClick={deleteAllData}>
            Delete All Data
          </Button>
        </div>
        {copyStatus && <p className="text-[#FEEA96]">{copyStatus}</p>}
        <a href={TESTER_FEEDBACK_URL} target="_blank" rel="noreferrer" className="text-[#F9D967] underline decoration-[#D97A00] hover:text-[#FEEA96]">
          Send Beta Feedback
        </a>
      </div>
    </Modal>
  );
};

export default PrivacyModal;
