import React, { useContext } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { PlusCircleIcon, SparklesIcon } from '../Icons/HeroIcons';
import { TESTER_FEEDBACK_URL, backgroundThemes, treeSpeciesOptions } from '../../constants';

const Footer: React.FC<{ onAddTask: () => void; onWater: () => void }> = ({ onAddTask, onWater }) => {
  const { activeBackground, setActiveBackground, treeHealth, treeSpecies, setTreeSpecies } =
    useContext(AppContext) as AppContextType;

  const availableBackgrounds = Object.keys(backgroundThemes);

  const cycleVisualMode = () => {
    const currentBgIndex = availableBackgrounds.indexOf(activeBackground);
    const nextBg = availableBackgrounds[(currentBgIndex + 1) % availableBackgrounds.length];
    setActiveBackground(nextBg);

    const speciesIndex = treeSpeciesOptions.findIndex((species) => species.key === treeSpecies);
    const nextSpecies = treeSpeciesOptions[(speciesIndex + 1) % treeSpeciesOptions.length];
    setTreeSpecies(nextSpecies.key);
  };

  return (
    <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(94vw,720px)]">
      <div className="mx-auto rounded-2xl border border-yellow-600/30 bg-black/50 backdrop-blur-xl shadow-[0_18px_40px_rgba(0,0,0,0.6),0_0_26px_rgba(217,122,0,0.22)]">
        <div className="grid grid-cols-3 items-center px-3 py-2 sm:px-4 sm:py-3 gap-2">
          <button
            onClick={onWater}
            disabled={treeHealth >= 100}
            className="group rounded-xl px-3 py-2 text-center transition-all duration-300 border border-transparent hover:border-yellow-500/50 hover:bg-yellow-500/10 focus:outline-none focus:ring-2 focus:ring-yellow-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Water Tree"
          >
            <div className="text-3xl leading-none drop-shadow-[0_0_12px_rgba(217,122,0,0.75)]">💧</div>
            <div className="mt-1 text-xs tracking-[0.16em] text-[#F9D967]">WATER</div>
          </button>

          <button
            onClick={onAddTask}
            className="justify-self-center rounded-full p-2 bg-gradient-to-br from-[#D97A00] via-[#F9D967] to-[#FEEA96] text-black shadow-[0_0_28px_rgba(217,122,0,0.5)] hover:shadow-[0_0_36px_rgba(254,234,150,0.7)] hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-300/65"
            title="Add New Stage"
          >
            <PlusCircleIcon className="h-12 w-12" />
          </button>

          <button
            onClick={cycleVisualMode}
            className="group rounded-xl px-3 py-2 text-center transition-all duration-300 border border-transparent hover:border-yellow-500/50 hover:bg-yellow-500/10 focus:outline-none focus:ring-2 focus:ring-yellow-500/60"
            title={`Theme & Species (Current: ${backgroundThemes[activeBackground]?.name || 'Unknown'} / ${treeSpecies})`}
          >
            <SparklesIcon className="h-8 w-8 mx-auto text-[#FEEA96] drop-shadow-[0_0_14px_rgba(217,122,0,0.68)]" />
            <div className="mt-1 text-xs tracking-[0.16em] text-[#F9D967]">THEME</div>
          </button>
        </div>
      </div>
      <div className="mt-2 text-center">
        <a
          href={TESTER_FEEDBACK_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] tracking-[0.14em] text-[#F9D967]/90 underline decoration-[#D97A00]/70 hover:text-[#FEEA96]"
          title="Send Beta Feedback"
        >
          FEEDBACK
        </a>
      </div>
    </footer>
  );
};

export default Footer;
