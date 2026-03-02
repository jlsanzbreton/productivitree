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
import { AppContext, AppContextType } from './contexts/AppContext';
import { backgroundThemes, goldenPalette, visualTokens } from './constants';
import { TreeNode } from './types';

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
          <div className="relative z-10 w-full h-full min-h-0">
            <TreeVisualizationCanvas treeData={treeData} onNodeClick={handleNodeClick} treeSpecies={treeSpecies} waterPulse={waterPulse} />
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
