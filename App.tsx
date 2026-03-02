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
    currentTasks,
    treeData,
    showTaskModal,
    setShowTaskModal,
    editingTask,
    setEditingTask,
    error,
  } = useContext(AppContext) as AppContextType;

  const [currentPage, setCurrentPage] = useState<Page>(() => (isOnboardingComplete ? Page.Tree : Page.Onboarding));
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [selectedEntityNode, setSelectedEntityNode] = useState<TreeNode | null>(null);

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
    <div className="flex flex-col h-screen antialiased" style={{ background: currentThemeDetails.backgroundGradient }}>
      <Header onOpenPrivacy={() => setShowPrivacyModal(true)} />
      <main className="flex-grow flex flex-col items-center justify-center p-4 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <div
            className="w-full h-full"
            style={{
              background:
                'radial-gradient(circle at 12% 16%, rgba(139, 220, 166, 0.18), transparent 30%), radial-gradient(circle at 82% 20%, rgba(99, 179, 237, 0.12), transparent 36%)',
            }}
          />
        </div>
        {error && (
          <div
            className="absolute top-2 right-2 z-30 text-xs rounded-md px-3 py-2 border"
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
          <TreeVisualizationCanvas treeData={treeData} onNodeClick={handleNodeClick} />
        )}

        {showTaskModal && <TaskModal isOpen={showTaskModal} onClose={handleTaskModalClose} task={editingTask} />}

        {selectedEntityNode && (
          <EntityModal isOpen={Boolean(selectedEntityNode)} node={selectedEntityNode} onClose={() => setSelectedEntityNode(null)} />
        )}

        <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
      </main>
      {isOnboardingComplete && (
        <Footer
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
