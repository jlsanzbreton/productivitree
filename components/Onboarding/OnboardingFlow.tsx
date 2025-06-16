
import React, { useState, useContext, useEffect } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import PassionTest from '../PassionTest/PassionTest';
import { Button } from '../UI/Button';
import { ONBOARDING_STEPS_CONFIG, backgroundThemes, treeThemes, DEFAULT_USER_ID } from '../../constants';
import { CheckCircleIcon, ChevronRightIcon } from '../Icons/HeroIcons';
import { RootData, TaskData, LeafStatus } from '../../types';


const OnboardingFlow: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { 
    setIsOnboardingComplete, 
    setShowPassionTest,
    showPassionTest,
    passionTestResult,
    currentUser,
    setCurrentUser,
    roots, setRoots, // roots is read here but setRoots is used
    activeBackground, setActiveBackground,
    activeTreeTheme, setActiveTreeTheme,
    currentTasks, setCurrentTasks
  } = useContext(AppContext) as AppContextType;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userRoots, setUserRoots] = useState<Array<{ title: string; description: string }>>([]);
  const [userProjects, setUserProjects] = useState<Array<{ title: string; description: string }>>([]);

  const steps = ONBOARDING_STEPS_CONFIG;

  useEffect(() => {
    const currentStepConfig = steps[currentStepIndex];

    if (currentStepConfig.id === 'passion_test') {
        // If we are on the passion test step:
        // - If there's no result from the current session/attempt and the test isn't already shown, show it.
        // - `PassionTest` component internally handles showing questions or results based on its own state and `passionTestResult` from context.
        // - Its `onComplete` prop will set `showPassionTest` to false, allowing `OnboardingFlow` to show the "completed" message.
        if (!passionTestResult && !showPassionTest) {
            setShowPassionTest(true); // Trigger the PassionTest display within OnboardingFlow
        }
         // If results ARE present AND showPassionTest is true (e.g. user submitted, still on results screen of PassionTest)
         // do nothing here, let PassionTest manage its display.
         // If results ARE present AND showPassionTest is false (PassionTest called its onComplete)
         // then OnboardingFlow will display the "completed" message.
    } else {
        // If we navigated away from the passion_test step, but showPassionTest is still true, ensure it's turned off.
        if (showPassionTest) {
            setShowPassionTest(false);
        }
    }

    if (currentStepConfig.id === 'define_roots' && passionTestResult && userRoots.length === 0) {
        // Populate roots suggestions if passion test is done and roots haven't been set yet.
        setUserRoots(passionTestResult.root_suggestions.map(rs => ({ title: rs.title, description: rs.description })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [currentStepIndex, passionTestResult, showPassionTest, setShowPassionTest, steps, userRoots.length]); // setUserRoots is stable, not needed in deps


  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const currentStepConfig = steps[currentStepIndex];

      // Ensure passion test modal is closed if navigating away from its step.
      // This is a safeguard; PassionTest's onComplete should already handle this.
      if (currentStepConfig.id === 'passion_test' && showPassionTest) {
        setShowPassionTest(false); 
      }

      if (currentStepConfig.id === 'define_roots') {
        const newRootsData: RootData[] = userRoots
          .filter(r => r.title.trim() !== '') // Ensure non-empty roots are saved
          .map((r, i) => ({
            id: `onboarding-root-${Date.now()}-${i}`,
            userId: currentUser?.id || DEFAULT_USER_ID,
            title: r.title,
            description: r.description,
            strengthLevel: 8, 
            createdAt: new Date().toISOString(),
        }));
        setRoots(newRootsData);
      }
      if (currentStepConfig.id === 'first_projects') {
        const newTasksData: TaskData[] = userProjects
          .filter(p => p.title.trim() !== '') // Ensure non-empty projects are saved
          .map((p, i) => ({
            id: `onboarding-task-${Date.now()}-${i}`, 
            title: p.title,
            description: p.description,
            status: LeafStatus.Pending,
            priority: 1,
            createdAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
        }));
        setCurrentTasks(prevTasks => [...prevTasks, ...newTasksData]);
      }
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Onboarding finished
      setIsOnboardingComplete(true);
      if (currentUser) { 
        setCurrentUser({...currentUser, backgroundSetting: activeBackground, treeTheme: activeTreeTheme });
      }
      onComplete(); // Notify App.tsx or parent component
    }
  };

  const handleRootChange = (index: number, field: 'title' | 'description', value: string) => {
    const updatedRoots = [...userRoots];
    updatedRoots[index] = { ...updatedRoots[index], [field]: value };
    setUserRoots(updatedRoots);
  };
  
  const addRootField = () => {
      if(userRoots.length < 5) setUserRoots([...userRoots, {title: '', description: ''}]);
  }
  const removeRootField = (index: number) => {
      if(userRoots.length > 0) setUserRoots(userRoots.filter((_, i) => i !== index));
  }

  const handleProjectChange = (index: number, field: 'title' | 'description', value: string) => {
    const updatedProjects = [...userProjects];
    updatedProjects[index] = { ...updatedProjects[index], [field]: value };
    setUserProjects(updatedProjects);
  };
  const addProjectField = () => {
      if(userProjects.length < 3) setUserProjects([...userProjects, {title: '', description: ''}]);
  }
  const removeProjectField = (index: number) => {
      if(userProjects.length > 0) setUserProjects(userProjects.filter((_, i) => i !== index));
  }
  
  useEffect(() => { 
    if(steps[currentStepIndex].id === 'first_projects' && userProjects.length === 0) {
        addProjectField(); // Initialize with one project field
    }
    if(steps[currentStepIndex].id === 'define_roots' && userRoots.length === 0 && !passionTestResult) {
        // If no passion test results to prefill, add a blank field.
        // If passionTestResult IS available, the other useEffect will populate it.
        addRootField();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex, steps, userProjects.length, userRoots.length, passionTestResult]);


  const currentStep = steps[currentStepIndex];

  return (
    <div className="p-4 sm:p-8 bg-gray-800 rounded-xl shadow-2xl text-white w-full max-w-2xl mx-auto max-h-[90vh] flex flex-col">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-center text-blue-400">{currentStep.title}</h2>
      <p className="text-sm text-gray-300 mb-6 text-center">{currentStep.description}</p>

      <div className="flex-grow overflow-y-auto pr-2 space-y-6">
        {currentStep.id === 'welcome' && (
          <div className="text-center">
            <img src="https://picsum.photos/seed/treeicon/150/150" alt="Productivitree Welcome" className="mx-auto rounded-full mb-4 border-4 border-green-500" />
            <p className="text-lg">Let's embark on a journey to visualize and boost your productivity!</p>
          </div>
        )}

        {/* PassionTest is rendered here, within OnboardingFlow's control */}
        {currentStep.id === 'passion_test' && showPassionTest && (
           <div className="h-[65vh] sm:h-[70vh]"> {/* Adjusted height for better fit */}
             <PassionTest onComplete={() => {
                setShowPassionTest(false); // This is key! Hides PassionTest view.
                // OnboardingFlow will then show "Passion Test Completed!" message below.
                // User then clicks "Continue" on OnboardingFlow to advance the step.
             }} />
           </div>
        )}
        {/* Message shown after PassionTest calls its onComplete (which sets showPassionTest to false) */}
        {currentStep.id === 'passion_test' && !showPassionTest && passionTestResult && (
            <div className="p-4 bg-gray-700 rounded-lg text-center">
                <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-2" />
                <p className="text-lg font-semibold">Passion Test Completed!</p>
                <p className="text-sm text-gray-300">Your insights are ready. Click "Continue" to define your tree's roots.</p>
            </div>
        )}
         {/* Message if user somehow lands here without results and test not shown (e.g. error) */}
        {currentStep.id === 'passion_test' && !showPassionTest && !passionTestResult && (
             <div className="p-4 bg-gray-700 rounded-lg text-center">
                <p className="text-lg font-semibold">Ready to discover your passions?</p>
                <Button onClick={() => setShowPassionTest(true)} variant="secondary" className="mt-2">
                    Start Passion Test
                </Button>
            </div>
        )}


        {currentStep.id === 'define_roots' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">Based on your passion test, here are some suggested roots. You can edit them or add your own (1-5 recommended).</p>
            {userRoots.map((root, index) => (
              <div key={index} className="p-3 bg-gray-700 rounded-md space-y-2">
                <input 
                  type="text" 
                  placeholder="Root Title (e.g., Continuous Learning)" 
                  value={root.title}
                  onChange={(e) => handleRootChange(index, 'title', e.target.value)}
                  className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md placeholder-gray-400" 
                />
                <textarea 
                  placeholder="Short description" 
                  value={root.description}
                  onChange={(e) => handleRootChange(index, 'description', e.target.value)}
                  rows={2}
                  className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md placeholder-gray-400" 
                />
                {userRoots.length > 1 && <Button size="sm" variant="danger" onClick={() => removeRootField(index)}>Remove</Button>}
              </div>
            ))}
            {userRoots.length < 5 && <Button onClick={addRootField} variant="secondary">Add Root</Button>}
             {userRoots.length === 0 && <p className="text-gray-400 text-center">Add at least one root to define your tree's foundation.</p>}
          </div>
        )}
        
        {currentStep.id === 'first_projects' && (
             <div className="space-y-4">
                <p className="text-sm text-gray-400">Define 1-3 initial projects or major goals. These will become the first main branches of your tree.</p>
                {userProjects.map((project, index) => (
                <div key={index} className="p-3 bg-gray-700 rounded-md space-y-2">
                    <input 
                    type="text" 
                    placeholder="Project Title (e.g., Launch New Website)" 
                    value={project.title}
                    onChange={(e) => handleProjectChange(index, 'title', e.target.value)}
                    className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md placeholder-gray-400" 
                    />
                    <textarea 
                    placeholder="Brief project description" 
                    value={project.description}
                    onChange={(e) => handleProjectChange(index, 'description', e.target.value)}
                    rows={2}
                    className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md placeholder-gray-400" 
                    />
                    {userProjects.length > 1 && <Button size="sm" variant="danger" onClick={() => removeProjectField(index)}>Remove</Button>}
                </div>
                ))}
                {userProjects.length < 3 && <Button onClick={addProjectField} variant="secondary">Add Project</Button>}
                {userProjects.length === 0 && <p className="text-gray-400 text-center">Add at least one project or goal.</p>}
            </div>
        )}

        {currentStep.id === 'tree_customization' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold mb-2 text-purple-300">Choose a Background Theme:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(backgroundThemes).map(([key, theme]) => (
                  <button 
                    key={key} 
                    onClick={() => setActiveBackground(key)}
                    className={`p-3 rounded-lg border-2 transition-all ${activeBackground === key ? 'border-purple-500 ring-2 ring-purple-500' : 'border-gray-600 hover:border-purple-400'}`}
                    style={{ background: theme.backgroundGradient }}
                  >
                    <span className={`font-semibold ${theme.textColor}`}>{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-2 text-green-300">Choose a Tree Season:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(treeThemes).map(([key, theme]) => (
                  <button 
                    key={key} 
                    onClick={() => setActiveTreeTheme(key)}
                    className={`p-3 rounded-lg border-2 transition-all ${activeTreeTheme === key ? 'border-green-500 ring-2 ring-green-500' : 'border-gray-600 hover:border-green-400'} bg-gray-700`}
                  >
                    <span className="font-semibold">{theme.name}</span>
                    <div className="flex mt-1 space-x-1 justify-center">
                        <div className={`w-4 h-4 rounded-full ${theme.leafColors.base.startsWith('text-transparent') ? 'border border-gray-500' : theme.leafColors.base.replace('text-', 'bg-')}`}></div>
                        <div className={`w-4 h-4 rounded-full ${theme.branchColor.replace('text-', 'bg-')}`}></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep.id === 'done' && (
           <div className="text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <p className="text-xl">You're all set to grow!</p>
            <p className="text-gray-300">Remember to water your tree and add tasks to see it flourish.</p>
          </div>
        )}
      </div>
      
      <div className="mt-8 pt-6 border-t border-gray-700">
        <Button 
            onClick={handleNext} 
            variant="primary" 
            className="w-full" 
            size="lg" 
            disabled={(currentStep.id === 'passion_test' && showPassionTest) || 
                      (currentStep.id === 'passion_test' && !passionTestResult && !showPassionTest) || // Disable if test not taken and not currently showing
                      (currentStep.id === 'define_roots' && userRoots.filter(r=>r.title.trim() !== '').length === 0) ||
                      (currentStep.id === 'first_projects' && userProjects.filter(p=>p.title.trim() !== '').length === 0)
                     }
        >
          {currentStepIndex === steps.length - 1 ? "Let's Grow!" : "Continue"}
          <ChevronRightIcon className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default OnboardingFlow;
