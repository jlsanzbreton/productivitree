
import React, { useContext } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { CogIcon, UserCircleIcon, QuestionMarkCircleIcon } from '../Icons/HeroIcons'; // Assuming you have these

const Header: React.FC = () => {
  const { currentUser, treeHealth, setShowPassionTest, isOnboardingComplete } = useContext(AppContext) as AppContextType;

  return (
    <header className="bg-gray-800/50 backdrop-blur-md text-white p-4 shadow-lg flex justify-between items-center z-20">
      <div className="flex items-center">
        <img src="https://picsum.photos/seed/productivitree/40/40" alt="Productivitree Logo" className="h-10 w-10 mr-3 rounded-full border-2 border-green-500" />
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
          Productivitree
        </h1>
      </div>
      <div className="flex items-center space-x-3 sm:space-x-4">
        {isOnboardingComplete && (
          <div className="flex items-center" title={`Tree Health: ${treeHealth}%`}>
            <span role="img" aria-label="Tree Health" className="text-xl sm:text-2xl">💧</span>
            <span className="ml-1 text-sm sm:text-base font-semibold text-green-400">{treeHealth}%</span>
          </div>
        )}
        {isOnboardingComplete && currentUser?.passionTestCompleted && (
           <button 
            onClick={() => setShowPassionTest(true)} 
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            title="Revisit Passion Test"
          >
            <QuestionMarkCircleIcon className="h-6 w-6 sm:h-7 sm:w-7 text-blue-400" />
          </button>
        )}
        {/* Placeholder for Settings and User Profile */}
        {isOnboardingComplete && (
          <>
            <button className="p-2 rounded-full hover:bg-gray-700 transition-colors" title="Settings">
              <CogIcon className="h-6 w-6 sm:h-7 sm:w-7 text-gray-400" />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-700 transition-colors" title="User Profile">
              <UserCircleIcon className="h-6 w-6 sm:h-7 sm:w-7 text-gray-400" />
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
