import React, { useContext, useEffect, useState } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import TreeVisualizationCanvas from './components/TreeVisualization/TreeVisualizationCanvas';
import PassionTest from './components/PassionTest/PassionTest';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import TaskModal from './components/TaskModal/TaskModal';
import EntityModal from './components/EntityModal/EntityModal';
import PrivacyModal from './components/Privacy/PrivacyModal';
import { AppContext, AppContextType } from './contexts/AppContext';
import { backgroundThemes, visualTokens } from './constants';
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
      style={{ background: currentThemeDetails.backgroundGradient, fontFamily: '"Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif' }}
    >
      <Header onOpenPrivacy={() => setShowPrivacyModal(true)} />
      <main className="flex-grow flex flex-col items-center justify-center p-4 pb-28 sm:pb-32 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-80">
          <div
            className="w-full h-full"
            style={{
              background:
                'radial-gradient(circle at 8% 14%, rgba(56, 229, 169, 0.2), transparent 32%), radial-gradient(circle at 78% 8%, rgba(75, 163, 255, 0.16), transparent 36%), radial-gradient(circle at 54% 88%, rgba(162, 72, 255, 0.1), transparent 38%)',
            }}
          />
        </div>
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div
            className="w-full h-full"
            style={{
              background:
                'linear-gradient(110deg, rgba(15, 23, 42, 0.92) 0%, rgba(2, 6, 23, 0.78) 40%, rgba(8, 47, 73, 0.58) 100%)',
            }}
          />
        </div>
        {error && (
          <div
            className="absolute top-2 right-2 z-30 text-xs rounded-md px-3 py-2 border shadow-[0_0_20px_rgba(249,115,22,0.25)]"
            style={{ background: visualTokens.panelSurface, borderColor: '#f97316', color: visualTokens.panelText }}
          >
            {error}
          </div>
        )}

        {currentPage === Page.Onboarding && <OnboardingFlow onComplete={() => setCurrentPage(Page.Tree)} />}

        {currentPage === Page.PassionTest && isOnboardingComplete && (
          <PassionTest onComplete={() => setShowPassionTest(false)} />
        )}

        {currentPage === Page.Tree && isOnboardingComplete && (
          <TreeVisualizationCanvas treeData={treeData} onNodeClick={handleNodeClick} treeSpecies={treeSpecies} waterPulse={waterPulse} />
        )}

        {showTaskModal && <TaskModal isOpen={showTaskModal} onClose={handleTaskModalClose} task={editingTask} />}

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
          onAddTask={() => {
            setEditingTask(null);
            setShowTaskModal(true);
          }}
        />
      )}
    </div>
  );
};

export default App;
