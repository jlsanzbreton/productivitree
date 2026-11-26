import React, { useContext, useEffect, useState } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import LivingTreeView from './components/LivingTree/LivingTreeView';
import ArchiveView from './components/LivingTree/ArchiveView';
import TreeDataDialog from './components/LivingTree/TreeDataDialog';
import ConnectAppsWizard from './components/LivingTree/ConnectAppsWizard';
import { SproutTarget } from './components/LivingTree/SproutDialog';
import { parseActivityParams } from './utils/activityLink';
import PassionTest from './components/PassionTest/PassionTest';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import TaskModal from './components/TaskModal/TaskModal';
import EntityModal from './components/EntityModal/EntityModal';
import GrowthEntityModal, { GrowthEntityType } from './components/Growth/GrowthEntityModal';
import PrivacyModal from './components/Privacy/PrivacyModal';
import ProjectListView from './components/ProjectList/ProjectListView';
import { AppContext, AppContextType } from './contexts/AppContext';
import { backgroundThemes, goldenPalette, visualTokens } from './constants';
import { ProjectBranch, TreeNode } from './types';

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

enum Page {
  Tree,
  PassionTest,
  Onboarding,
}

const App: React.FC = () => {
  const {
    showPassionTest,
    setShowPassionTest,
    isOnboardingComplete,
    activeBackground,
    waterTree,
    showTaskModal,
    setShowTaskModal,
    editingTask,
    setEditingTask,
    error,
    recordExternalActivity,
  } = useContext(AppContext) as AppContextType;

  const [currentPage, setCurrentPage] = useState<Page>(() => (isOnboardingComplete ? Page.Tree : Page.Onboarding));
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [selectedEntityNode, setSelectedEntityNode] = useState<TreeNode | null>(null);
  const [showDataDialog, setShowDataDialog] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ projectId: string; taskId?: string; nonce: number } | null>(null);
  const [sproutRequest, setSproutRequest] = useState<{ target: SproutTarget; nonce: number } | null>(null);
  const [growthEntityType, setGrowthEntityType] = useState<GrowthEntityType | null>(null);
  const [viewMode, setViewMode] = useState<TreeViewMode>(readStoredViewMode);

  const changeViewMode = (mode: TreeViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch (_error) {
      // Storage unavailable: the choice just won't be remembered.
    }
  };

  const handleProjectSelect = (project: ProjectBranch) => {
    setSelectedEntityNode({ id: project.id, parentId: 'trunk-hub', type: 'branch', data: project, children: [] });
  };

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

  const sproutFromFooter = (target: SproutTarget) => {
    changeViewMode('tree');
    setSproutRequest({ target, nonce: Date.now() });
  };

  useEffect(() => {
    if (!isOnboardingComplete) {
      setCurrentPage(Page.Onboarding);
      return;
    }
    setCurrentPage(showPassionTest ? Page.PassionTest : Page.Tree);
  }, [isOnboardingComplete, showPassionTest]);

  const currentThemeDetails = backgroundThemes[activeBackground] || backgroundThemes.forest_glow;

  const handleTaskModalClose = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  return (
    <div
      className="flex flex-col h-screen antialiased text-slate-100"
      style={{
        background: currentThemeDetails.backgroundGradient,
        fontFamily: '"Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif',
        color: '#FCEFC6',
      }}
    >
      <Header onOpenPrivacy={() => setShowPrivacyModal(true)} />
      <main
        className={`flex-grow flex flex-col p-3 sm:p-4 pb-36 sm:pb-32 overflow-hidden relative ${
          currentPage === Page.Tree ? 'items-stretch justify-stretch' : 'items-center justify-center'
        }`}
      >
        <div className="absolute inset-0 pointer-events-none opacity-80">
          <div
            className="w-full h-full"
            style={{
              background:
                'radial-gradient(circle at 12% 12%, rgba(217,122,0,0.2), transparent 34%), radial-gradient(circle at 84% 8%, rgba(254,234,150,0.12), transparent 38%), radial-gradient(circle at 52% 88%, rgba(184,132,42,0.12), transparent 42%)',
            }}
          />
        </div>
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div
            className="w-full h-full"
            style={{
              background:
                'linear-gradient(112deg, rgba(18,18,20,0.92) 0%, rgba(11,12,14,0.84) 42%, rgba(8,8,9,0.7) 100%)',
            }}
          />
        </div>
        {error && (
          <div
            className="absolute top-2 right-2 z-30 text-xs rounded-md px-3 py-2 border shadow-[0_0_20px_rgba(217,122,0,0.26)]"
            style={{ background: visualTokens.panelSurface, borderColor: goldenPalette.mediumGold, color: visualTokens.panelText }}
          >
            {error}
          </div>
        )}

        {currentPage === Page.Onboarding && <OnboardingFlow onComplete={() => setCurrentPage(Page.Tree)} />}

        {currentPage === Page.PassionTest && isOnboardingComplete && (
          <PassionTest onComplete={() => setShowPassionTest(false)} />
        )}

        {currentPage === Page.Tree && isOnboardingComplete && (
          <div className="relative z-10 w-full h-full min-h-0 flex flex-col gap-3">
            <div
              role="group"
              aria-label="Cambiar vista"
              className="self-center inline-flex rounded-full border border-yellow-700/40 bg-black/45 backdrop-blur-xl p-1"
            >
              {(['tree', 'list', 'archive'] as TreeViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => changeViewMode(mode)}
                  aria-pressed={viewMode === mode}
                  className={`min-h-8 px-4 py-1 rounded-full text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500/60 ${
                    viewMode === mode ? 'bg-gradient-to-r from-[#D97A00] to-[#F9D967] text-black font-semibold' : 'text-[#FEEA96] hover:bg-yellow-500/10'
                  }`}
                >
                  {mode === 'tree' ? 'Árbol' : mode === 'list' ? 'Lista' : 'Archivo'}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0">
              {viewMode === 'tree' && (
                <LivingTreeView
                  onEditBranch={handleProjectSelect}
                  onOpenArchive={() => changeViewMode('archive')}
                  onOpenData={() => setShowDataDialog(true)}
                  onOpenConnect={() => setShowConnect(true)}
                  focusRequest={focusRequest}
                  sproutRequest={sproutRequest}
                />
              )}
              {viewMode === 'list' && <ProjectListView onSelectProject={handleProjectSelect} />}
              {viewMode === 'archive' && (
                <ArchiveView
                  onBack={() => changeViewMode('tree')}
                  onShowBranch={(projectId) => {
                    changeViewMode('tree');
                    setFocusRequest({ projectId, nonce: Date.now() });
                  }}
                />
              )}
            </div>
          </div>
        )}

        {showTaskModal && <TaskModal isOpen={showTaskModal} onClose={handleTaskModalClose} task={editingTask} />}
        <GrowthEntityModal
          isOpen={Boolean(growthEntityType)}
          entityType={growthEntityType}
          onClose={() => setGrowthEntityType(null)}
        />

        {selectedEntityNode && (
          <EntityModal isOpen={Boolean(selectedEntityNode)} node={selectedEntityNode} onClose={() => setSelectedEntityNode(null)} />
        )}

        <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
        <TreeDataDialog isOpen={showDataDialog} onClose={() => setShowDataDialog(false)} />
        <ConnectAppsWizard isOpen={showConnect} onClose={() => setShowConnect(false)} />
        {toast && (
          <div className="lt-toast" role="status">
            {toast}
          </div>
        )}
      </main>
      {isOnboardingComplete && (
        <Footer
          onWater={() => waterTree()}
          onAddRoot={() => setGrowthEntityType('root')}
          onAddTrunk={() => setGrowthEntityType('trunk')}
          onAddProject={() => sproutFromFooter({ kind: 'branch' })}
          onAddTask={() => sproutFromFooter({ kind: 'leaf', projectId: '' })}
        />
      )}
    </div>
  );
};

export default App;
