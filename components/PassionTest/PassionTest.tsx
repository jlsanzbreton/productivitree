
import React, { useState, useContext, useEffect } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { Button } from '../UI/Button'; // Assuming a Button component
import { ArrowPathIcon, CheckCircleIcon, LightBulbIcon } from '../Icons/HeroIcons';

const passionTestQuestions = [
  "Describe an activity during which you lose track of time (flow state). What makes it engaging?",
  "What are 2-3 core values that guide your decisions and actions in life?",
  "If you could contribute to the world in one significant way, what would it be and why?",
  "What kind of activities or subjects do you explore out of sheer curiosity, without external rewards?",
  "Recall a transformative experience that deeply impacted your perspective. What did you learn about yourself or the world?",
  "What problems in your community or the world do you feel most compelled to solve?",
  "If you had unlimited resources and time, what skills would you master or what knowledge would you pursue?",
  "What topics can you talk about enthusiastically for hours?",
  "Describe a time you felt a strong sense of purpose. What were you doing?",
  "What kind of positive feedback do you most appreciate receiving from others, and for what qualities or actions?"
];

const PassionTest: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const { 
    runPassionTest, 
    isLoading, 
    error, 
    passionTestResult, 
    setPassionTestResult, 
    currentUser, 
    setCurrentUser,
    setRoots, // To update roots based on suggestions
    setShowPassionTest
  } = useContext(AppContext) as AppContextType;

  const [answers, setAnswers] = useState<string[]>(Array(passionTestQuestions.length).fill(''));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // If test was already completed and results exist, show results directly
    if (currentUser?.passionTestCompleted && passionTestResult) {
      setIsSubmitted(true);
    }
  }, [currentUser, passionTestResult]);

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < passionTestQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    // Check if all questions are answered (optional, can allow partial submission)
    // if (answers.some(ans => ans.trim() === '')) {
    //   alert("Please answer all questions before submitting.");
    //   return;
    // }
    await runPassionTest(answers.map(a => a.trim() === '' ? 'Not answered' : a));
    setIsSubmitted(true);
    if (currentUser) {
      setCurrentUser({ ...currentUser, passionTestCompleted: true });
    }
  };

  const handleRetakeTest = () => {
    setAnswers(Array(passionTestQuestions.length).fill(''));
    setCurrentQuestionIndex(0);
    setIsSubmitted(false);
    setPassionTestResult(null);
     if (currentUser) {
      setCurrentUser({ ...currentUser, passionTestCompleted: false });
    }
  };
  
  const handleDone = () => {
    setShowPassionTest(false); // Close the passion test view
    if(onComplete) onComplete(); // Notify parent if needed (e.g., in onboarding)
  }


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-lg shadow-xl text-white h-full max-h-[80vh] w-full max-w-2xl overflow-y-auto">
        <ArrowPathIcon className="h-12 w-12 text-blue-400 animate-spin mb-4" />
        <p className="text-xl">Analyzing your passions... This might take a moment.</p>
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

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-blue-300 mb-2">Identified Passion Categories:</h3>
          {passionTestResult.passion_categories.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 pl-4">
              {passionTestResult.passion_categories.map((category, i) => (
                <li key={i} className="text-gray-200">{category}</li>
              ))}
            </ul>
          ) : <p className="text-gray-400">No distinct categories identified based on your answers. Try to be more elaborate next time!</p>}
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-purple-300 mb-2">Suggested Roots for Your Tree:</h3>
          {passionTestResult.root_suggestions.length > 0 ? (
            <div className="space-y-3">
              {passionTestResult.root_suggestions.map((root, i) => (
                <div key={i} className="p-3 bg-gray-700 rounded-md shadow">
                  <p className="font-bold text-purple-200">{root.title} (Strength: {root.strength}/10)</p>
                  <p className="text-sm text-gray-300">{root.description}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400">No specific root suggestions generated. Your answers might need more depth.</p>}
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold text-yellow-300 mb-2 flex items-center">
            <LightBulbIcon className="h-6 w-6 mr-2"/> Personalized Insights:
          </h3>
          <p className="text-gray-200 italic bg-gray-700 p-3 rounded-md">{passionTestResult.personalized_insights || "No specific insights generated."}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <Button onClick={handleDone} variant="primary" className="w-full sm:w-auto">
             Done & Grow!
            </Button>
            <Button onClick={handleRetakeTest} variant="secondary" className="w-full sm:w-auto">
                Retake Test
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-800 rounded-lg shadow-xl text-white h-full max-h-[90vh] sm:max-h-[80vh] w-full max-w-2xl flex flex-col overflow-hidden">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-center text-blue-300">Discover Your Passions</h2>
      <p className="text-sm text-gray-400 mb-6 text-center">Answer these questions to help us understand what drives you. Your answers will shape the roots of your Productivitree.</p>
      
      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
        <div className="mb-1 p-3 bg-gray-700 rounded-md">
            <label htmlFor={`question-${currentQuestionIndex}`} className="block text-md font-medium text-gray-200 mb-2">
            Question {currentQuestionIndex + 1} of {passionTestQuestions.length}
            </label>
            <p className="text-gray-300 mb-2">{passionTestQuestions[currentQuestionIndex]}</p>
            <textarea
            id={`question-${currentQuestionIndex}`}
            value={answers[currentQuestionIndex]}
            onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
            rows={5}
            className="w-full p-2.5 bg-gray-600 border border-gray-500 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-white"
            placeholder="Your thoughts..."
            />
        </div>
      </div>

      {error && <p className="text-red-400 mt-2 text-sm text-center">{error}</p>}

      <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
        <Button onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0} variant="secondary" className="w-full sm:w-auto">
          Previous
        </Button>
        {currentQuestionIndex < passionTestQuestions.length - 1 ? (
          <Button onClick={handleNextQuestion} variant="primary" className="w-full sm:w-auto">
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isLoading} variant="primary" className="w-full sm:w-auto">
            {isLoading ? 'Submitting...' : 'Submit & See Insights'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PassionTest;
