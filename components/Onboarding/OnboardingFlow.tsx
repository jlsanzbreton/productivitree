import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { ONBOARDING_STEPS_CONFIG, backgroundThemes, treeSpeciesOptions, treeThemes } from '../../constants';
import PassionTest from '../PassionTest/PassionTest';
import { Button } from '../UI/Button';
import { CheckCircleIcon, ChevronRightIcon } from '../Icons/HeroIcons';
import { LeafStatus } from '../../types';

type RootInput = { title: string; description: string; strengthLevel: number };
type TrunkInput = { title: string; description: string; proficiencyLevel: number; yearsOfExperience: number };
type ProjectInput = { title: string; description: string; priorityLevel: number };

const OnboardingFlow: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const {
    setIsOnboardingComplete,
    setShowPassionTest,
    showPassionTest,
    passionTestResult,
    addCoreRoot,
    addTrunkSegment,
    addProjectBranch,
    addTask,
    markPassionStepCompleted,
    activeBackground,
    setActiveBackground,
    activeTreeTheme,
    setActiveTreeTheme,
    treeSpecies,
    setTreeSpecies,
  } = useContext(AppContext) as AppContextType;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasAutoOpenedPassion, setHasAutoOpenedPassion] = useState(false);
  const [roots, setRoots] = useState<RootInput[]>([{ title: '', description: '', strengthLevel: 8 }]);
  const [trunk, setTrunk] = useState<TrunkInput[]>([
    { title: '', description: '', proficiencyLevel: 7, yearsOfExperience: 2 },
  ]);
  const [projects, setProjects] = useState<ProjectInput[]>([{ title: '', description: '', priorityLevel: 3 }]);

  const currentStep = ONBOARDING_STEPS_CONFIG[currentStepIndex];
  const hasValidRoots = useMemo(() => roots.some((root) => root.title.trim()), [roots]);
  const hasValidTrunk = useMemo(() => trunk.some((segment) => segment.title.trim()), [trunk]);
  const hasValidProjects = useMemo(() => projects.some((project) => project.title.trim()), [projects]);

  useEffect(() => {
    if (currentStep.id === 'passion_test' && !hasAutoOpenedPassion && !showPassionTest && !passionTestResult) {
      setShowPassionTest(true);
      setHasAutoOpenedPassion(true);
    }
    if (currentStep.id !== 'passion_test' && showPassionTest) {
      setShowPassionTest(false);
    }
    if (currentStep.id !== 'passion_test') {
      setHasAutoOpenedPassion(false);
    }
  }, [currentStep.id, hasAutoOpenedPassion, passionTestResult, setShowPassionTest, showPassionTest]);

  useEffect(() => {
    if (currentStep.id === 'define_roots' && passionTestResult?.root_suggestions?.length) {
      setRoots((prev) => {
        if (prev.some((entry) => entry.title.trim())) return prev;
        return passionTestResult.root_suggestions.map((suggestion) => ({
          title: suggestion.title,
          description: suggestion.description,
          strengthLevel: suggestion.strength,
        }));
      });
    }
  }, [currentStep.id, passionTestResult]);

  const persistCurrentStep = () => {
    if (currentStep.id === 'define_roots') {
      roots.filter((root) => root.title.trim()).forEach((root) => addCoreRoot(root));
    }
    if (currentStep.id === 'trunk_setup') {
      trunk.filter((segment) => segment.title.trim()).forEach((segment) => addTrunkSegment(segment));
    }
    if (currentStep.id === 'first_projects') {
      projects
        .filter((project) => project.title.trim())
        .forEach((project) => {
          const projectId = addProjectBranch({
            title: project.title,
            description: project.description,
            priorityLevel: project.priorityLevel,
            status: 'active',
          });
          addTask({
            projectId,
            title: `${project.title} - First Stage`,
            description: 'Define the first concrete step for this branch.',
            priority: 2,
            status: LeafStatus.Healthy,
          });
        });
    }
  };

  const goNext = () => {
    if (currentStep.id === 'passion_test') {
      markPassionStepCompleted();
      setShowPassionTest(false);
    }
    if (currentStepIndex < ONBOARDING_STEPS_CONFIG.length - 1) {
      persistCurrentStep();
      setCurrentStepIndex((prev) => prev + 1);
      return;
    }
    setIsOnboardingComplete(true);
    setShowPassionTest(false);
    onComplete();
  };

  const isContinueDisabled =
    (currentStep.id === 'define_roots' && !hasValidRoots) ||
    (currentStep.id === 'trunk_setup' && !hasValidTrunk) ||
    (currentStep.id === 'first_projects' && !hasValidProjects);

  return (
    <div className="p-4 sm:p-8 bg-gray-900/90 border border-emerald-600/30 rounded-xl shadow-2xl text-white w-full max-w-3xl mx-auto max-h-[92vh] flex flex-col">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-center text-emerald-300">{currentStep.title}</h2>
      <p className="text-sm text-gray-300 mb-6 text-center">{currentStep.description}</p>

      <div className="flex-grow overflow-y-auto pr-2 space-y-6">
        {currentStep.id === 'welcome' && (
          <div className="text-center space-y-3">
            <p className="text-lg">Roots are your purpose. Trunk is your capability. Branches are your projects. Leaves are your stages.</p>
            <p className="text-gray-400">Balanced focus mode avoids pressure loops while keeping attention visible.</p>
          </div>
        )}

        {currentStep.id === 'passion_test' && showPassionTest && (
          <div className="h-[70vh]">
            <PassionTest onComplete={() => setShowPassionTest(false)} />
          </div>
        )}

        {currentStep.id === 'passion_test' && (
          <div className="p-3 rounded-md border border-sky-500/40 bg-sky-900/20 text-sm text-sky-100">
            Paso opcional: puedes continuar sin análisis de IA. Tus respuestas quedan guardadas localmente para reintentar manualmente.
          </div>
        )}

        {currentStep.id === 'passion_test' && !showPassionTest && passionTestResult && (
          <div className="p-4 bg-gray-800 rounded-lg border border-emerald-500/30 text-center">
            <CheckCircleIcon className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold">Reflection complete.</p>
            <p className="text-sm text-gray-300">Insights are ready and root suggestions were prepared.</p>
          </div>
        )}

        {currentStep.id === 'define_roots' && (
          <div className="space-y-3">
            {roots.map((root, index) => (
              <div key={`root-${index}`} className="bg-gray-800 p-3 rounded-md space-y-2">
                <input
                  placeholder="Core value or purpose"
                  value={root.title}
                  onChange={(event) =>
                    setRoots((prev) =>
                      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, title: event.target.value } : item))
                    )
                  }
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600"
                />
                <textarea
                  placeholder="Why this root matters"
                  value={root.description}
                  onChange={(event) =>
                    setRoots((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, description: event.target.value } : item
                      )
                    )
                  }
                  rows={2}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600"
                />
              </div>
            ))}
            {roots.length < 5 && (
              <Button variant="secondary" onClick={() => setRoots((prev) => [...prev, { title: '', description: '', strengthLevel: 8 }])}>
                Add Root
              </Button>
            )}
          </div>
        )}

        {currentStep.id === 'trunk_setup' && (
          <div className="space-y-3">
            {trunk.map((segment, index) => (
              <div key={`trunk-${index}`} className="bg-gray-800 p-3 rounded-md space-y-2">
                <input
                  placeholder="Skill or expertise"
                  value={segment.title}
                  onChange={(event) =>
                    setTrunk((prev) =>
                      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, title: event.target.value } : item))
                    )
                  }
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600"
                />
                <textarea
                  placeholder="Context or education behind this capability"
                  value={segment.description}
                  onChange={(event) =>
                    setTrunk((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, description: event.target.value } : item
                      )
                    )
                  }
                  rows={2}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600"
                />
              </div>
            ))}
            {trunk.length < 5 && (
              <Button
                variant="secondary"
                onClick={() =>
                  setTrunk((prev) => [...prev, { title: '', description: '', proficiencyLevel: 7, yearsOfExperience: 2 }])
                }
              >
                Add Trunk Segment
              </Button>
            )}
          </div>
        )}

        {currentStep.id === 'first_projects' && (
          <div className="space-y-3">
            {projects.map((project, index) => (
              <div key={`project-${index}`} className="bg-gray-800 p-3 rounded-md space-y-2">
                <input
                  placeholder="Project branch title"
                  value={project.title}
                  onChange={(event) =>
                    setProjects((prev) =>
                      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, title: event.target.value } : item))
                    )
                  }
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600"
                />
                <textarea
                  placeholder="Outcome or scope"
                  value={project.description}
                  onChange={(event) =>
                    setProjects((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, description: event.target.value } : item
                      )
                    )
                  }
                  rows={2}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600"
                />
              </div>
            ))}
            {projects.length < 4 && (
              <Button
                variant="secondary"
                onClick={() => setProjects((prev) => [...prev, { title: '', description: '', priorityLevel: 3 }])}
              >
                Add Branch
              </Button>
            )}
          </div>
        )}

        {currentStep.id === 'tree_customization' && (
          <div className="space-y-5">
            <div>
              <h4 className="font-semibold mb-2 text-emerald-300">Backgrounds</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(backgroundThemes).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => setActiveBackground(key)}
                    className={`p-3 rounded-lg border ${
                      activeBackground === key ? 'border-emerald-400' : 'border-gray-700'
                    }`}
                    style={{ background: theme.backgroundGradient }}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-emerald-300">Tree Style</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(treeThemes).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTreeTheme(key)}
                    className={`p-3 rounded-lg border ${
                      activeTreeTheme === key ? 'border-emerald-400' : 'border-gray-700'
                    } bg-gray-800`}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-emerald-300">Tree Species</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {treeSpeciesOptions.map((species) => (
                  <button
                    key={species.key}
                    onClick={() => setTreeSpecies(species.key)}
                    className={`p-3 rounded-lg border text-left ${
                      treeSpecies === species.key ? 'border-cyan-400 shadow-[0_0_24px_rgba(56,189,248,0.25)]' : 'border-gray-700'
                    } bg-gray-800`}
                  >
                    <div className="font-semibold text-cyan-100">{species.name}</div>
                    <div className="text-xs text-gray-300 mt-1">{species.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep.id === 'done' && (
          <div className="text-center space-y-2">
            <CheckCircleIcon className="h-16 w-16 text-emerald-400 mx-auto" />
            <p>Your tree is configured. Keep stages active so leaves stay vibrant.</p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-700">
        <Button onClick={goNext} variant="primary" className="w-full" size="lg" disabled={isContinueDisabled}>
          {currentStepIndex === ONBOARDING_STEPS_CONFIG.length - 1 ? 'Open Tree' : 'Continue'}
          <ChevronRightIcon className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default OnboardingFlow;
