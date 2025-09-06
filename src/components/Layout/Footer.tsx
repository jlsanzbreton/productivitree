
import React, { useContext } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { PlusCircleIcon, AdjustmentsHorizontalIcon, SunIcon, MoonIcon, SparklesIcon } from '../Icons/HeroIcons'; // Assuming hero icons
import { backgroundThemes } from '../../constants';


const Footer: React.FC<{ onAddTask: () => void }> = ({ onAddTask }) => {
  const { waterTree, activeBackground, setActiveBackground, treeHealth } = useContext(AppContext) as AppContextType;

  const availableBackgrounds = Object.keys(backgroundThemes);
  
  const cycleBackground = () => {
    const currentIndex = availableBackgrounds.indexOf(activeBackground);
    const nextIndex = (currentIndex + 1) % availableBackgrounds.length;
    setActiveBackground(availableBackgrounds[nextIndex]);
  };

  // Determine icon based on current background or a cycle logic
  let ThemeIcon = SparklesIcon; // Default
  if (activeBackground === 'enchanted_forest') ThemeIcon = MoonIcon;
  if (activeBackground === 'mountain_cliff') ThemeIcon = AdjustmentsHorizontalIcon;
  if (activeBackground === 'serene_dawn') ThemeIcon = SunIcon;


  return (
    <footer className="bg-gray-800/60 backdrop-blur-md p-3 shadow-top-lg z-20">
      <div className="max-w-4xl mx-auto flex justify-around items-center">
        <button
          onClick={waterTree}
          disabled={treeHealth >= 100}
          className="flex flex-col items-center text-center px-3 py-2 rounded-lg hover:bg-blue-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Water Tree"
        >
          <span role="img" aria-label="Watering Can" className="text-3xl">💧</span>
          <span className="text-xs mt-1 text-blue-300">Water</span>
        </button>

        <button
          onClick={onAddTask}
          className="flex flex-col items-center text-center p-2 rounded-full bg-green-500 hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-300 shadow-lg transform hover:scale-105"
          title="Add New Task/Leaf"
        >
          <PlusCircleIcon className="h-10 w-10 text-white" />
           {/* <span className="text-xs mt-1 text-white">Add Task</span> */}
        </button>

        <button
          onClick={cycleBackground}
          className="flex flex-col items-center text-center px-3 py-2 rounded-lg hover:bg-purple-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          title={`Change Theme (Current: ${backgroundThemes[activeBackground].name})`}
        >
          <ThemeIcon className="h-7 w-7 text-purple-300"/>
          <span className="text-xs mt-1 text-purple-300">Theme</span>
        </button>
      </div>
    </footer>
  );
};

export default Footer;
