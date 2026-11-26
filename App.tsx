import React, { useContext, useEffect, useState } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import TreeVisualizationCanvas from './components/TreeVisualization/TreeVisualizationCanvas';
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

type TreeViewMode = 'tree' | 'list';
const VIEW_MODE_STORAGE_KEY = 'productivitree-view-mode';

const readStoredViewMode = (): TreeViewMode => {
  try {
    return window.localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'list' ? 'list' : 'tree';
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
    treeSpecies,
    currentTasks,
    treeData,
    waterTree,
    showTaskModal,
    setShowTaskModal,
    editingTask,
    setEditingTask,
    error,
  } = useContext(AppContext) as AppContextType;

  const [currentPage, setCurrentPage] = useState<Page>(() => (isOnboardingComplete ? Page.Tree : Page.Onboarding));
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [selectedEntityNode, setSelectedEntityNode] = useState<TreeNode | null>(null);
  const [waterPulse, setWaterPulse] = useState(0);
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

  useEffect(() => {
    if (!isOnboardingComplete) {
      setCurrentPage(Page.Onboarding);
      return;
    }
    setCurrentPage(showPassionTest ? Page.PassionTest : Page.Tree);
  }, [isOnboardingComplete, showPassionTest]);

  const currentThemeDetails = backgroundThemes[activeBackground] || backgroundThemes.forest_glow;

  const handleNodeClick = (node: TreeNode) => {
    if (node.type === 'leaf') {
      const taskToEdit = currentTasks.find((task) => task.id === node.id);
      setEditingTask(taskToEdit || null);
      setShowTaskModal(true);
      return;
    }

    if (node.type === 'root' || node.type === 'trunk' || node.type === 'branch') {
      setSelectedEntityNode(node);
    }
  };

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
              {(['tree', 'list'] as TreeViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => changeViewMode(mode)}
                  aria-pressed={viewMode === mode}
                  className={`min-h-8 px-4 py-1 rounded-full text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500/60 ${
                    viewMode === mode ? 'bg-gradient-to-r from-[#D97A00] to-[#F9D967] text-black font-semibold' : 'text-[#FEEA96] hover:bg-yellow-500/10'
                  }`}
                >
                  {mode === 'tree' ? 'Árbol' : 'Lista'}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0">
              {viewMode === 'tree' ? (
                <TreeVisualizationCanvas treeData={treeData} onNodeClick={handleNodeClick} treeSpecies={treeSpecies} waterPulse={waterPulse} />
              ) : (
                <ProjectListView onSelectProject={handleProjectSelect} />
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
      </main>
      {isOnboardingComplete && (
        <Footer
          onWater={() => {
            waterTree();
            setWaterPulse((prev) => prev + 1);
          }}
          onAddRoot={() => setGrowthEntityType('root')}
          onAddTrunk={() => setGrowthEntityType('trunk')}
          onAddProject={() => setGrowthEntityType('branch')}
          onAddTask={() => {
            setGrowthEntityType(null);
            setEditingTask(null);
            setShowTaskModal(true);
          }}
        />
      )}
    </div>
  );
};

export default App;
