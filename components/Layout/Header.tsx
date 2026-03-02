
import React, { useContext } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { CogIcon, QuestionMarkCircleIcon } from '../Icons/HeroIcons';

const Header: React.FC<{ onOpenPrivacy: () => void }> = ({ onOpenPrivacy }) => {
  const { currentUser, treeHealth, setShowPassionTest, isOnboardingComplete } = useContext(AppContext) as AppContextType;

  return (
    <header className="bg-slate-950/45 backdrop-blur-xl text-white p-4 border-b border-cyan-200/10 shadow-[0_12px_32px_rgba(2,6,23,0.45)] flex justify-between items-center z-20">
      <div className="flex items-center">
        <img
          src="https://picsum.photos/seed/productivitree/40/40"
          alt="Productivitree Logo"
          className="h-10 w-10 mr-3 rounded-full border border-emerald-300/80 shadow-[0_0_18px_rgba(16,185,129,0.5)]"
        />
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400">
          Productivitree
        </h1>
      </div>
      <div className="flex items-center space-x-3 sm:space-x-4">
        {isOnboardingComplete && (
          <div className="flex items-center" title={`Tree Health: ${treeHealth}%`}>
            <span role="img" aria-label="Tree Health" className="text-xl sm:text-2xl drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]">
              💧
            </span>
            <span className="ml-1 text-sm sm:text-base font-semibold text-emerald-300">{treeHealth}%</span>
          </div>
        )}
        {isOnboardingComplete && currentUser?.passionTestCompleted && (
          <button
            onClick={() => setShowPassionTest(true)}
            className="p-2 rounded-full hover:bg-cyan-500/10 border border-transparent hover:border-cyan-200/30 transition-colors"
            title="Revisit Passion Test"
          >
            <QuestionMarkCircleIcon className="h-6 w-6 sm:h-7 sm:w-7 text-cyan-300" />
          </button>
        )}
        {isOnboardingComplete && (
          <button
            className="p-2 rounded-full hover:bg-fuchsia-500/10 border border-transparent hover:border-fuchsia-300/30 transition-colors"
            title="Privacy and Settings"
            onClick={onOpenPrivacy}
          >
            <CogIcon className="h-6 w-6 sm:h-7 sm:w-7 text-slate-200" />
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
