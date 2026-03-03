import React, { useContext } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton, ClerkLoading, ClerkLoaded } from '@clerk/clerk-react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { CogIcon, QuestionMarkCircleIcon } from '../Icons/HeroIcons';

const Header: React.FC<{ onOpenPrivacy: () => void }> = ({ onOpenPrivacy }) => {
  const { currentUser, treeHealth, setShowPassionTest, isOnboardingComplete } = useContext(AppContext) as AppContextType;
  const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  return (
    <header className="bg-black/45 backdrop-blur-xl text-amber-50 p-4 border-b border-yellow-700/30 shadow-[0_12px_32px_rgba(0,0,0,0.45)] flex justify-between items-center z-20">
      <div className="flex items-center">
        <img
          src="/golden-tree-icon.png"
          alt="Productivitree Logo"
          className="h-10 w-10 mr-3 rounded-full border border-yellow-500/70 shadow-[0_0_18px_rgba(217,122,0,0.48)]"
        />
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#D97A00] via-[#F9D967] to-[#FEEA96]">
          Productivitree
        </h1>
      </div>
      <div className="flex items-center space-x-3 sm:space-x-4">
        {isOnboardingComplete && (
          <div className="flex items-center" title={`Tree Health: ${treeHealth}%`}>
            <span role="img" aria-label="Tree Health" className="text-xl sm:text-2xl drop-shadow-[0_0_12px_rgba(217,122,0,0.72)]">
              💧
            </span>
            <span className="ml-1 text-sm sm:text-base font-semibold text-[#FEEA96]">{treeHealth}%</span>
          </div>
        )}
        {isOnboardingComplete && currentUser?.passionTestCompleted && (
          <button
            onClick={() => setShowPassionTest(true)}
            className="p-2 rounded-full hover:bg-yellow-500/10 border border-transparent hover:border-yellow-500/40 transition-colors"
            title="Revisit Passion Test"
          >
            <QuestionMarkCircleIcon className="h-6 w-6 sm:h-7 sm:w-7 text-[#F9D967]" />
          </button>
        )}
        {isOnboardingComplete && (
          <button
            className="p-2 rounded-full hover:bg-yellow-500/10 border border-transparent hover:border-yellow-500/40 transition-colors"
            title="Privacy and Settings"
            onClick={onOpenPrivacy}
          >
            <CogIcon className="h-6 w-6 sm:h-7 sm:w-7 text-amber-100" />
          </button>
        )}
        {clerkEnabled ? (
          <>
            <ClerkLoading>
              <div className="flex items-center justify-center px-4 py-2 rounded-xl border border-yellow-800/40 bg-black/40 text-[#FEEA96] text-sm font-semibold tracking-wide shadow-inner">
                <span className="animate-pulse">Cargando Auth...</span>
              </div>
            </ClerkLoading>
            <ClerkLoaded>
              <SignedOut>
                <SignInButton mode="modal">
                  <button
                    className="min-h-11 px-4 py-2 rounded-xl border border-yellow-600/40 bg-black/40 text-[#FEEA96] text-sm font-semibold tracking-wide shadow-[0_0_14px_rgba(217,122,0,0.25)] hover:bg-yellow-500/10 hover:border-yellow-500/60 focus:outline-none focus:ring-2 focus:ring-yellow-400/55"
                    title="Iniciar sesión"
                  >
                    Sign in
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <div className="rounded-full border border-yellow-600/40 bg-black/35 p-1 shadow-[0_0_16px_rgba(217,122,0,0.18)]">
                  <UserButton
                    appearance={{
                      variables: {
                        colorBackground: '#0a0a0a',
                        colorText: '#ffffff',
                        colorPrimary: '#d4af37',
                      },
                    }}
                  />
                </div>
              </SignedIn>
            </ClerkLoaded>
          </>
        ) : (
          <div className="flex items-center justify-center px-3 py-1.5 rounded-lg border border-red-900/60 bg-red-950/40 text-red-400/90 text-xs font-semibold tracking-wide shadow-inner" title="Clerk Key Not Found in Env">
            Auth OFF
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
