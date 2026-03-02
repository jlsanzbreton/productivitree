import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { PlusCircleIcon, SparklesIcon } from '../Icons/HeroIcons';
import { TESTER_FEEDBACK_URL, backgroundThemes, treeSpeciesOptions } from '../../constants';

interface FooterProps {
  onWater: () => void;
  onAddRoot: () => void;
  onAddTrunk: () => void;
  onAddProject: () => void;
  onAddTask: () => void;
}

const Footer: React.FC<FooterProps> = ({ onWater, onAddRoot, onAddTrunk, onAddProject, onAddTask }) => {
  const { activeBackground, setActiveBackground, treeHealth, treeSpecies, setTreeSpecies } =
    useContext(AppContext) as AppContextType;
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const dialRef = useRef<HTMLDivElement | null>(null);

  const availableBackgrounds = Object.keys(backgroundThemes);

  const cycleVisualMode = () => {
    const currentBgIndex = availableBackgrounds.indexOf(activeBackground);
    const nextBg = availableBackgrounds[(currentBgIndex + 1) % availableBackgrounds.length];
    setActiveBackground(nextBg);

    const speciesIndex = treeSpeciesOptions.findIndex((species) => species.key === treeSpecies);
    const nextSpecies = treeSpeciesOptions[(speciesIndex + 1) % treeSpeciesOptions.length];
    setTreeSpecies(nextSpecies.key);
  };

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!dialRef.current) return;
      if (!dialRef.current.contains(event.target as Node)) {
        setIsSpeedDialOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSpeedDialOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const speedDialActions: Array<{ id: string; label: string; onClick: () => void }> = [
    { id: 'root', label: 'Añadir Propósito (Raíz)', onClick: onAddRoot },
    { id: 'trunk', label: 'Añadir Habilidad (Tronco)', onClick: onAddTrunk },
    { id: 'branch', label: 'Añadir Proyecto (Rama)', onClick: onAddProject },
    { id: 'leaf', label: 'Añadir Tarea (Hoja)', onClick: onAddTask },
  ];

  return (
    <footer className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-1rem)] sm:w-[min(94vw,720px)]">
      <div ref={dialRef} className="relative">
        <div
          className={`absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+0.7rem)] w-[min(92vw,420px)] rounded-2xl border border-yellow-600/30 bg-black/62 backdrop-blur-xl shadow-[0_16px_36px_rgba(0,0,0,0.58),0_0_22px_rgba(217,122,0,0.2)] p-2 transition-all duration-220 ${
            isSpeedDialOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {speedDialActions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  action.onClick();
                  setIsSpeedDialOpen(false);
                }}
                className="min-h-11 px-3 py-2 rounded-xl text-left text-[13px] sm:text-sm border border-yellow-700/30 hover:border-yellow-500/55 hover:bg-yellow-500/10 text-[#FEEA96] focus:outline-none focus:ring-2 focus:ring-yellow-500/60"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto rounded-2xl border border-yellow-600/30 bg-black/50 backdrop-blur-xl shadow-[0_18px_40px_rgba(0,0,0,0.6),0_0_26px_rgba(217,122,0,0.22)]">
          <div className="grid grid-cols-3 items-center px-2 py-2 sm:px-4 sm:py-3 gap-2">
          <button
            onClick={onWater}
            disabled={treeHealth >= 100}
            className="group min-h-11 min-w-[4.5rem] rounded-xl px-3 py-2 text-center transition-all duration-300 border border-transparent hover:border-yellow-500/50 hover:bg-yellow-500/10 focus:outline-none focus:ring-2 focus:ring-yellow-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Water Tree"
          >
            <div className="text-3xl leading-none drop-shadow-[0_0_12px_rgba(217,122,0,0.75)]">💧</div>
            <div className="mt-1 text-xs tracking-[0.16em] text-[#F9D967]">WATER</div>
          </button>

          <button
            onClick={() => setIsSpeedDialOpen((prev) => !prev)}
            className="justify-self-center h-14 w-14 sm:h-16 sm:w-16 rounded-full p-2 bg-gradient-to-br from-[#D97A00] via-[#F9D967] to-[#FEEA96] text-black shadow-[0_0_28px_rgba(217,122,0,0.5)] hover:shadow-[0_0_36px_rgba(254,234,150,0.7)] hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-300/65"
            title="Abrir acciones de crecimiento"
            aria-expanded={isSpeedDialOpen}
          >
            <PlusCircleIcon className={`h-10 w-10 sm:h-12 sm:w-12 mx-auto transition-transform duration-200 ${isSpeedDialOpen ? 'rotate-45' : ''}`} />
          </button>

          <button
            onClick={() => {
              setIsSpeedDialOpen(false);
              cycleVisualMode();
            }}
            className="group min-h-11 min-w-[4.5rem] rounded-xl px-3 py-2 text-center transition-all duration-300 border border-transparent hover:border-yellow-500/50 hover:bg-yellow-500/10 focus:outline-none focus:ring-2 focus:ring-yellow-500/60"
            title={`Theme & Species (Current: ${backgroundThemes[activeBackground]?.name || 'Unknown'} / ${treeSpecies})`}
          >
            <SparklesIcon className="h-8 w-8 mx-auto text-[#FEEA96] drop-shadow-[0_0_14px_rgba(217,122,0,0.68)]" />
            <div className="mt-1 text-xs tracking-[0.16em] text-[#F9D967]">THEME</div>
          </button>
        </div>
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
