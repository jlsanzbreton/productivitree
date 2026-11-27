import React, { useContext, useEffect, useState } from 'react';
import Header from './components/Layout/Header';
import LivingTreeView, { GuideState } from './components/LivingTree/LivingTreeView';
import ArchiveView from './components/LivingTree/ArchiveView';
import TreeDataDialog from './components/LivingTree/TreeDataDialog';
import ConnectAppsWizard from './components/LivingTree/ConnectAppsWizard';
import { EXAMPLE_TREE } from './components/LivingTree/exampleTree';
import { parseActivityParams } from './utils/activityLink';
import { parseTreeJson } from './utils/treeJson';
import { snapshotExample } from './utils/exampleGuide';
import PassionTest from './components/PassionTest/PassionTest';
import PrivacyModal from './components/Privacy/PrivacyModal';
import ProjectListView from './components/ProjectList/ProjectListView';
import { AppContext, AppContextType } from './contexts/AppContext';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/700.css';
import './components/LivingTree/livingTree.css';

type TreeViewMode = 'tree' | 'list' | 'archive';
const VIEW_MODE_STORAGE_KEY = 'productivitree-view-mode';

const readStoredViewMode = (): TreeViewMode => {
  try {
    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return stored === 'list' || stored === 'archive' ? stored : 'tree';
  } catch (_error) {
    return 'tree';
  }
};

const GUIDE_KEY = 'productivitree-guide';
const readGuide = (): GuideState | null => {
  try {
    const raw = window.localStorage.getItem(GUIDE_KEY);
    return raw ? (JSON.parse(raw) as GuideState) : null;
  } catch (_error) {
    return null;
  }
};

const App: React.FC = () => {
  const {
    showPassionTest,
    setShowPassionTest,
    isOnboardingComplete,
    setIsOnboardingComplete,
    projects,
    currentUser,
    importTree,
    error,
    recordExternalActivity,
  } = useContext(AppContext) as AppContextType;

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [dataDialog, setDataDialog] = useState<{ text: string } | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ projectId: string; taskId?: string; nonce: number } | null>(null);
  const [viewMode, setViewMode] = useState<TreeViewMode>(readStoredViewMode);
  const [guide, setGuideState] = useState<GuideState | null>(readGuide);

  const setGuide = (next: GuideState | null) => {
    setGuideState(next);
    try {
      if (next) window.localStorage.setItem(GUIDE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(GUIDE_KEY);
    } catch (_error) {
      // Storage unavailable: the guide just won't resume after a reload.
    }
  };

  const changeViewMode = (mode: TreeViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch (_error) {
      // Storage unavailable: the choice just won't be remembered.
    }
  };

  // First visit: no forms. Plant an example tree and walk through it on the canvas.
  useEffect(() => {
    if (isOnboardingComplete) return;
    if (projects.length) {
      setIsOnboardingComplete(true);
      return;
    }
    const parsed = parseTreeJson(JSON.stringify(EXAMPLE_TREE), { userId: currentUser.id });
    if (!parsed.ok) {
      setIsOnboardingComplete(true);
      return;
    }
    importTree(parsed.data as Parameters<typeof importTree>[0], { quiet: true });
    setGuide({ step: 'welcome', snap: snapshotExample(parsed.data as Parameters<typeof snapshotExample>[0]) });
    changeViewMode('tree');
    // Runs whenever onboarding is (re)set, e.g. after deleting all data.
  }, [isOnboardingComplete]);

  // Activity links (?actividad=1&rama=…&tarea=…) sent by shortcuts or connected apps.
  useEffect(() => {
    const activity = parseActivityParams(window.location.search);
    if (!activity) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    if ('error' in activity) {
      setToast(activity.error || 'Enlace de actividad no válido.');
      return;
    }
    const result = recordExternalActivity(activity);
    setToast(result.message);
    if (result.ok && result.projectId) {
      changeViewMode('tree');
      setFocusRequest({ projectId: result.projectId, taskId: result.taskId, nonce: Date.now() });
    }
    // Runs once on load.
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showBranch = (projectId: string) => {
    changeViewMode('tree');
    setFocusRequest({ projectId, nonce: Date.now() });
  };

  return (
    <div className="pt-shell">
      <Header
        viewMode={viewMode}
        onViewMode={changeViewMode}
        onOpenSettings={() => setShowPrivacyModal(true)}
        onOpenGuide={() => {
          changeViewMode('tree');
          setGuide({ step: guide?.snap ? 'welcome' : 'sun', snap: guide?.snap || null });
        }}
      />
      <main className="pt-main">
        {error && (
          <div className="lt-msg err pt-error" role="alert">
            {error}
          </div>
        )}
        {viewMode === 'tree' && (
          <LivingTreeView
            onOpenArchive={() => changeViewMode('archive')}
            onOpenData={(text) => setDataDialog({ text: text || '' })}
            onOpenConnect={() => setShowConnect(true)}
            onOpenPassionTest={() => setShowPassionTest(true)}
            guide={guide}
            onGuide={setGuide}
            focusRequest={focusRequest}
          />
        )}
        {viewMode === 'list' && <ProjectListView onSelectProject={(project) => showBranch(project.id)} />}
        {viewMode === 'archive' && <ArchiveView onBack={() => changeViewMode('tree')} onShowBranch={showBranch} />}
      </main>

      {showPassionTest && (
        <div className="lt-dialog-back" onMouseDown={(e) => e.target === e.currentTarget && setShowPassionTest(false)}>
          <div className="lt-dialog wide lt-skin" role="dialog" aria-modal="true" aria-label="Test de pasiones">
            <button className="lt-x" onClick={() => setShowPassionTest(false)} aria-label="Cerrar">
              ×
            </button>
            <PassionTest onComplete={() => setShowPassionTest(false)} />
          </div>
        </div>
      )}
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
      <TreeDataDialog
        isOpen={Boolean(dataDialog)}
        initialText={dataDialog?.text || ''}
        skipConfirm={Boolean(guide?.step === 'welcome' && guide.snap)}
        onImported={() => setGuide(null)}
        onClose={() => setDataDialog(null)}
      />
      <ConnectAppsWizard isOpen={showConnect} onClose={() => setShowConnect(false)} />
      {toast && (
        <div className="lt-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
};

export default App;
