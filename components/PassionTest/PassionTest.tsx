import React, { useContext, useEffect, useState } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { Button } from '../UI/Button';
import { ArrowPathIcon, CheckCircleIcon, LightBulbIcon } from '../Icons/HeroIcons';

const passionTestQuestions = [
  'Describe an activity during which you lose track of time (flow state). What makes it engaging?',
  'What are 2-3 core values that guide your decisions and actions in life?',
  'If you could contribute to the world in one significant way, what would it be and why?',
  'What kind of activities or subjects do you explore out of sheer curiosity, without external rewards?',
  'Recall a transformative experience that deeply impacted your perspective. What did you learn about yourself or the world?',
  'What problems in your community or the world do you feel most compelled to solve?',
  'If you had unlimited resources and time, what skills would you master or what knowledge would you pursue?',
  'What topics can you talk about enthusiastically for hours?',
  'Describe a time you felt a strong sense of purpose. What were you doing?',
  'What kind of positive feedback do you most appreciate receiving from others, and for what qualities or actions?',
];

const PassionTest: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const {
    runPassionTest,
    savePassionDraft,
    loadLocalPassionDraft,
    isLoading,
    error,
    passionTestResult,
    setPassionTestResult,
    consent,
    setAiReflectionConsent,
    setShowPassionTest,
    markPassionStepCompleted,
    passionDraftStatus,
  } = useContext(AppContext) as AppContextType;

  const [answers, setAnswers] = useState<string[]>(Array(passionTestQuestions.length).fill(''));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadLocalPassionDraft().then((draft) => {
      if (!mounted || !draft) return;
      const normalized = Array(passionTestQuestions.length)
        .fill('')
        .map((_, index) => draft.answers[index] || '');
      setAnswers(normalized);
      setLocalMessage('Borrador local cargado. Puedes editar y reintentar cuando quieras.');
    });
    return () => {
      mounted = false;
    };
  }, [loadLocalPassionDraft]);

  useEffect(() => {
    if (passionTestResult) {
      setIsSubmitted(true);
    }
  }, [passionTestResult]);

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers((prev) => prev.map((answer, answerIndex) => (answerIndex === index ? value : answer)));
  };

  const handleSaveLocal = async () => {
    await savePassionDraft(answers);
    setLocalMessage('Borrador guardado localmente.');
  };

  const handleAnalyzeNow = async () => {
    const response = await runPassionTest(answers);
    if (response.status === 'succeeded') {
      setIsSubmitted(true);
      setLocalMessage('Análisis completado.');
      return;
    }
    setIsSubmitted(false);
    setLocalMessage(response.error || 'No se pudo analizar ahora. Tu borrador sigue guardado localmente.');
  };

  const handleRetakeTest = async () => {
    setAnswers(Array(passionTestQuestions.length).fill(''));
    setCurrentQuestionIndex(0);
    setIsSubmitted(false);
    setPassionTestResult(null);
    await savePassionDraft(Array(passionTestQuestions.length).fill(''));
    setLocalMessage('Borrador reiniciado.');
  };

  const handleDone = () => {
    markPassionStepCompleted();
    setShowPassionTest(false);
    if (onComplete) onComplete();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-lg shadow-xl text-white h-full max-h-[80vh] w-full max-w-2xl overflow-y-auto">
        <ArrowPathIcon className="h-12 w-12 text-blue-400 animate-spin mb-4" />
        <p className="text-xl">Analyzing your reflections...</p>
      </div>
    );
  }

  if (isSubmitted && passionTestResult) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg shadow-xl text-white h-full max-h-[80vh] w-full max-w-2xl overflow-y-auto">
        <div className="flex items-center mb-6">
          <CheckCircleIcon className="h-10 w-10 text-green-400 mr-3" />
          <h2 className="text-3xl font-bold text-green-400">Passion Insights</h2>
        </div>

        {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md mb-4">{error}</p>}
        {localMessage && <p className="text-sky-300 bg-sky-900/40 p-3 rounded-md mb-4">{localMessage}</p>}

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-blue-300 mb-2">Identified Categories</h3>
          {passionTestResult.passion_categories.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 pl-4">
              {passionTestResult.passion_categories.map((category, index) => (
                <li key={index} className="text-gray-200">
                  {category}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No categories generated yet.</p>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-purple-300 mb-2">Suggested Roots</h3>
          {passionTestResult.root_suggestions.length > 0 ? (
            <div className="space-y-3">
              {passionTestResult.root_suggestions.map((root, index) => (
                <div key={index} className="p-3 bg-gray-700 rounded-md shadow">
                  <p className="font-bold text-purple-200">
                    {root.title} (Strength: {root.strength}/10)
                  </p>
                  <p className="text-sm text-gray-300">{root.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No root suggestions generated.</p>
          )}
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold text-yellow-300 mb-2 flex items-center">
            <LightBulbIcon className="h-6 w-6 mr-2" /> Personalized Insights
          </h3>
          <p className="text-gray-200 italic bg-gray-700 p-3 rounded-md">
            {passionTestResult.personalized_insights || 'No specific insights generated.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleDone} variant="primary" className="w-full sm:w-auto">
            Cerrar y continuar
          </Button>
          <Button onClick={handleRetakeTest} variant="secondary" className="w-full sm:w-auto">
            Reset respuestas
          </Button>
          <Button onClick={handleSaveLocal} variant="ghost" className="w-full sm:w-auto">
            Guardar localmente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-800 rounded-lg shadow-xl text-white h-full max-h-[90vh] sm:max-h-[80vh] w-full max-w-2xl flex flex-col overflow-hidden">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-center text-blue-300">Discover Your Passions</h2>
      <p className="text-sm text-gray-400 mb-4 text-center">
        Modo offline-first: puedes guardar el borrador local y seguir sin análisis IA.
      </p>

      <label className="flex items-start gap-2 text-xs text-gray-300 bg-gray-700/70 p-3 rounded-md">
        <input
          type="checkbox"
          checked={consent.aiReflectionConsent}
          onChange={(event) => setAiReflectionConsent(event.target.checked)}
          className="mt-0.5"
        />
        <span>I consent to server-side AI processing for passion insights.</span>
      </label>

      {localMessage && <p className="text-sky-300 mt-2 text-sm">{localMessage}</p>}
      {passionDraftStatus.lastAttemptStatus && (
        <p className="text-xs text-gray-400 mt-1">Último estado: {passionDraftStatus.lastAttemptStatus}</p>
      )}

      <div className="flex-grow overflow-y-auto pr-2 space-y-4 mt-4">
        <div className="mb-1 p-3 bg-gray-700 rounded-md">
          <label htmlFor={`question-${currentQuestionIndex}`} className="block text-md font-medium text-gray-200 mb-2">
            Question {currentQuestionIndex + 1} of {passionTestQuestions.length}
          </label>
          <p className="text-gray-300 mb-2">{passionTestQuestions[currentQuestionIndex]}</p>
          <textarea
            id={`question-${currentQuestionIndex}`}
            value={answers[currentQuestionIndex]}
            onChange={(event) => handleAnswerChange(currentQuestionIndex, event.target.value)}
            rows={5}
            className="w-full p-2.5 bg-gray-600 border border-gray-500 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-white"
            placeholder="Your thoughts..."
          />
        </div>
      </div>

      {error && <p className="text-red-400 mt-2 text-sm text-center">{error}</p>}

      <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <Button onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))} disabled={currentQuestionIndex === 0} variant="secondary" className="w-full sm:w-auto">
            Previous
          </Button>
          {currentQuestionIndex < passionTestQuestions.length - 1 ? (
            <Button onClick={() => setCurrentQuestionIndex((prev) => Math.min(passionTestQuestions.length - 1, prev + 1))} variant="primary" className="w-full sm:w-auto">
              Next
            </Button>
          ) : (
            <Button onClick={handleAnalyzeNow} disabled={isLoading || !consent.aiReflectionConsent} variant="primary" className="w-full sm:w-auto">
              Analizar ahora
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleSaveLocal} variant="ghost" className="w-full sm:w-auto">
            Guardar localmente
          </Button>
          <Button onClick={handleDone} variant="secondary" className="w-full sm:w-auto">
            Cerrar y continuar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PassionTest;
