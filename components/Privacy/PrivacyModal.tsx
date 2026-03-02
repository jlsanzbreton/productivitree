import React, { useContext, useState } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { TESTER_FEEDBACK_URL } from '../../constants';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  const { consent, setAiReflectionConsent, privacySettings, setPrivacySettings, exportAllData, resetDemoData, deleteAllData } =
    useContext(AppContext) as AppContextType;
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleExport = async () => {
    const exportText = exportAllData();
    await navigator.clipboard.writeText(exportText);
    setCopyStatus('Data copied to clipboard.');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Privacy and Safety Controls">
      <div className="space-y-5 text-sm">
        <p className="text-gray-300">
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
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExport}>Copy Export JSON</Button>
          <Button variant="secondary" onClick={resetDemoData}>
            Reset Demo Data
          </Button>
          <Button variant="danger" onClick={deleteAllData}>
            Delete All Data
          </Button>
        </div>
        {copyStatus && <p className="text-emerald-300">{copyStatus}</p>}
        <a href={TESTER_FEEDBACK_URL} target="_blank" rel="noreferrer" className="text-sky-300 underline">
          Send Beta Feedback
        </a>
      </div>
    </Modal>
  );
};

export default PrivacyModal;
