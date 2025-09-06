
console.log('APP.TSX: Script start');
import React, { useState, useContext, useEffect, Suspense } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import TaskModal from './components/TaskModal/TaskModal';
const TreeVisualizationCanvas = React.lazy(() => import('./components/TreeVisualization/TreeVisualizationCanvas'));
const PassionTest = React.lazy(() => import('./components/PassionTest/PassionTest'));
const OnboardingFlow = React.lazy(() => import('./components/Onboarding/OnboardingFlow'));
import { AppContext, AppContextType } from './contexts/AppContext';
import { backgroundThemes } from './constants'; // Path is fine for root constants.ts
// LeafStatus import might not be needed if App.tsx doesn't directly use it.

// Define Page enum locally or import from types.ts if it's there
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
    currentTasks, // Used for handleTaskModalOpen
    treeData,
    showTaskModal,
    setShowTaskModal,
    editingTask,
    setEditingTask
  } = useContext(AppContext) as AppContextType;

  // Initialize currentPage based on isOnboardingComplete
  const [currentPage, setCurrentPage] = useState<Page>(() => 
    isOnboardingComplete ? Page.Tree : Page.Onboarding
  );

  useEffect(() => {
    if (!isOnboardingComplete) {
      setCurrentPage(Page.Onboarding); // Always show onboarding if not complete
    } else if (showPassionTest) { // Only show PassionTest page if onboarding IS complete AND showPassionTest is true
      setCurrentPage(Page.PassionTest);
    } else {
      setCurrentPage(Page.Tree); // Default to tree if onboarding complete and not showing passion test
    }
  }, [isOnboardingComplete, showPassionTest]);


  const currentThemeDetails = backgroundThemes[activeBackground as keyof typeof backgroundThemes] || backgroundThemes['enchanted_forest'];


  const handleTaskModalOpen = (taskId?: string) => {
    if (taskId) {
      const taskToEdit = currentTasks.find(t => t.id === taskId);
      setEditingTask(taskToEdit || null);
    } else {
      setEditingTask(null);
    }
    setShowTaskModal(true);
  };

  const handleTaskModalClose = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };


  return (
    <div 
      className="flex flex-col h-screen antialiased"
      style={{ background: currentThemeDetails.backgroundGradient }}
    >
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center p-4 overflow-hidden relative">
        {/* Conditional rendering for particles if they exist and are components */}
        {currentThemeDetails.particles && typeof currentThemeDetails.particles === 'function' && (
          <div className="absolute inset-0 pointer-events-none z-0">
            {React.createElement(currentThemeDetails.particles)}
          </div>
        )}
        
        {currentPage === Page.Onboarding && (
          <Suspense fallback={<div>Loading...</div>}>
            <OnboardingFlow onComplete={() => {
              // setIsOnboardingComplete(true) is handled within OnboardingFlow.
              // App's useEffect will then change currentPage to Page.Tree.
              // So, this onComplete can be empty or for logging.
              console.log("Onboarding complete callback in App.tsx");
            }} />
          </Suspense>
        )}

        {/* This PassionTest is for revisiting AFTER onboarding is complete */}
        {currentPage === Page.PassionTest && isOnboardingComplete && (
          <Suspense fallback={<div>Loading...</div>}>
            <PassionTest onComplete={() => {
              setShowPassionTest(false);
              // App's useEffect will naturally switch currentPage back to Page.Tree
            }} />
          </Suspense>
        )}

        {currentPage === Page.Tree && isOnboardingComplete && (
          <Suspense fallback={<div>Loading...</div>}>
            <TreeVisualizationCanvas treeData={treeData} onLeafClick={(nodeId: string) => handleTaskModalOpen(nodeId)} />
          </Suspense>
        )}

        {showTaskModal && (
          <TaskModal
            isOpen={showTaskModal}
            onClose={handleTaskModalClose}
            task={editingTask}
          />
        )}
      </main>
      {isOnboardingComplete && <Footer onAddTask={() => handleTaskModalOpen()} />}
    </div>
  );
};

export default App;
