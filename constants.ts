
import React from 'react';
import { LeafStatus, TreeNode } from './types';

// --- Global Tree Palette and Textures ---
export const TREE_PALETTE = {
  trunk: {
    base: '#8B4513',
    gradient: ['#8B4513', '#A0522D'],
  },
  leaves: {
    base: '#22c55e',
    gradient: ['#86efac', '#16a34a'],
  },
};

export const TREE_SIZES = {
  leaf: {
    small: 4,
    medium: 8,
    large: 12,
  },
  trunk: {
    width: 20,
  },
};

// Small embedded SVG textures for trunk and leaves
export const TREE_TEXTURES = {
  trunk:
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyMCcgaGVpZ2h0PScyMCc+PHJlY3Qgd2lkdGg9JzIwJyBoZWlnaHQ9JzIwJyBmaWxsPScjOEI0NTEzJy8+PHBhdGggZD0nTTUgMHYyME0xMCAwdjIwTTE1IDB2MjAnIHN0cm9rZT0nI0EwNTIyRCcgc3Ryb2tlLXdpZHRoPScyJy8+PC9zdmc+',
  leaf:
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyMCcgaGVpZ2h0PScyMCc+PGNpcmNsZSBjeD0nMTAnIGN5PScxMCcgcj0nMTAnIGZpbGw9JyMyMmM1NWUnLz48cGF0aCBkPSdNMTAgMEwxMCAyME0wIDEwTDIwIDEwJyBzdHJva2U9JyMxNmEzNGEnIHN0cm9rZS13aWR0aD0nMScvPjwvc3ZnPg==',
};

// --- Leaf Style Constants ---
export const leafColors: Record<LeafStatus, { gradient: string; shadow: string; animation?: string }> = {
  [LeafStatus.Pending]: {
    gradient: 'bg-gradient-to-br from-teal-500 to-teal-700', // #10b981, #059669
    shadow: 'shadow-[0_2px_4px_rgba(16,185,129,0.3)]',
  },
  [LeafStatus.InProgress]: {
    gradient: 'bg-gradient-to-br from-amber-500 to-amber-600', // #f59e0b, #d97706
    shadow: 'shadow-md',
    animation: 'animate-pulse', // Tailwind pulse
  },
  [LeafStatus.Urgent]: {
    gradient: 'bg-gradient-to-br from-red-500 to-red-700', // #ef4444, #dc2626
    shadow: 'shadow-lg shadow-red-500/50',
    animation: 'animate-urgentPulse', // Custom pulse in index.html
  },
  [LeafStatus.Completed]: {
    gradient: 'bg-gradient-to-br from-gray-400 to-gray-600',
    shadow: 'shadow-sm',
  },
  [LeafStatus.RecentActivity]: { // For actively swaying leaves
    gradient: 'bg-gradient-to-br from-lime-400 to-lime-600',
    shadow: 'shadow-md',
    animation: 'animate-gentleSway', // Custom sway in index.html
  },
};

// --- Fruit Style Constants ---
export const fruitColors: Record<'personal_growth' | 'milestone' | 'opportunity', string> = {
  personal_growth: 'text-green-500', // #10b981 (Verde)
  milestone: 'text-red-500',       // #ef4444 (Rojo)
  opportunity: 'text-amber-500',   // #f97316 (Naranja)
};


// --- Tree Theme Constants ---
export interface TreeTheme {
  name: string;
  leafColors: {
    base: string; // e.g. green for spring/summer, orange/red for autumn
    variant: string;
  };
  branchColor: string;
  skyColor: string;
  // Add more properties like flower colors for spring, snow effect for winter etc.
}

export const treeThemes: Record<string, TreeTheme> = {
  spring: { name: 'Spring', leafColors: { base: 'text-green-400', variant: 'text-pink-300' }, branchColor: 'text-yellow-700', skyColor: 'bg-blue-300' },
  summer: { name: 'Summer', leafColors: { base: 'text-green-600', variant: 'text-green-500' }, branchColor: 'text-yellow-800', skyColor: 'bg-sky-500' },
  autumn: { name: 'Autumn', leafColors: { base: 'text-orange-500', variant: 'text-red-500' }, branchColor: 'text-stone-700', skyColor: 'bg-orange-300' },
  winter: { name: 'Winter', leafColors: { base: 'text-transparent', variant: 'text-transparent' }, branchColor: 'text-gray-500', skyColor: 'bg-slate-400' }, // Bare branches
};

// --- Background Themes ---

const FloatingLights: React.FC = () => (
  React.createElement('div', { className: "absolute inset-0 overflow-hidden pointer-events-none" },
    Array.from({ length: 20 }).map((_, i) => (
      React.createElement('div', {
        key: i,
        className: "absolute rounded-full bg-yellow-200/30 animate-pulse",
        style: {
          width: `${Math.random() * 5 + 2}px`,
          height: `${Math.random() * 5 + 2}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDuration: `${Math.random() * 3 + 2}s`,
          animationDelay: `${Math.random() * 2}s`,
        }
      })
    ))
  )
);

const MistClouds: React.FC = () => (
  React.createElement('div', { className: "absolute inset-0 overflow-hidden opacity-30 pointer-events-none" },
    Array.from({ length: 5 }).map((_, i) => (
      React.createElement('div', {
        key: i,
        className: "absolute bg-slate-400/20 rounded-full filter blur-lg animate-pulse",
        style: {
          width: `${Math.random() * 300 + 150}px`,
          height: `${Math.random() * 100 + 50}px`,
          left: `${Math.random() * 100 - 25}%`,
          top: `${Math.random() * 70 + 15}%`,
          transform: `translateX(${Math.random() * 100 - 50}px) translateY(${Math.random() * 60 - 30}px)`,
          animationName: 'subtleDrift',
          animationDuration: `${Math.random() * 40 + 30}s`,
          animationDelay: `${Math.random() * 5}s`,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'linear'
        }
      })
    ))
  )
);


export interface BackgroundTheme {
  name: string;
  backgroundGradient: string;
  particles?: React.FC;
  ambientSound?: string; // path to mp3
  weatherEffects?: string; // e.g. 'gentle_sparkles', 'subtle_fog' (descriptive)
  textColor: string;
}

export const backgroundThemes: Record<string, BackgroundTheme> = {
  enchanted_forest: {
    name: 'Enchanted Forest',
    backgroundGradient: 'linear-gradient(to bottom, #1e3a8a, #312e81, #1f2937)',
    particles: FloatingLights,
    ambientSound: 'forest_mystical.mp3',
    weatherEffects: 'gentle_sparkles',
    textColor: 'text-blue-100',
  },
  mountain_cliff: {
    name: 'Mountain Cliff',
    backgroundGradient: 'linear-gradient(to bottom, #0f172a, #334155, #64748b)',
    particles: MistClouds,
    ambientSound: 'mountain_wind.mp3',
    weatherEffects: 'subtle_fog',
    textColor: 'text-slate-200',
  },
  serene_dawn: {
    name: 'Serene Dawn',
    backgroundGradient: 'linear-gradient(to bottom, #fbc2eb, #a6c1ee)',
    ambientSound: 'birds_chirping.mp3',
    weatherEffects: 'soft_glow',
    textColor: 'text-indigo-800',
  }
};

export const DEFAULT_USER_ID = "default-user";

export const INITIAL_TREE_DATA: TreeNode = {
  id: "root0",
  type: 'rootNode',
  data: { name: "My Productivitree" },
  children: [
    {
      id: "project1",
      type: "branch",
      parentId: "root0",
      data: { name: "First Project" },
      children: [
        { id: "task1", parentId: "project1", type: "leaf", data: { name: "Initial Task", status: LeafStatus.Pending, priority: 1 } as any },
      ]
    }
  ]
};


// --- Onboarding Steps ---
export const ONBOARDING_STEPS_CONFIG = [
  { id: 'welcome', title: 'Welcome to Productivitree!', description: 'Let\'s get your productivity tree growing.' },
  { id: 'passion_test', title: 'Discover Your Passions', description: 'A quick test to find what truly motivates you. This will help shape your tree\'s roots.' },
  { id: 'define_roots', title: 'Define Your Roots', description: 'Based on your passions, establish 3-5 core values or motivations.' },
  { id: 'experience_mapping', title: 'Map Your Experience', description: 'Describe your formation and experience to build your tree\'s trunk with AI.' },
  { id: 'first_projects', title: 'Plant Your First Branches', description: 'Let\'s add 1-2 initial projects or goals you want to work on.' },
  { id: 'tree_customization', title: 'Customize Your View', description: 'Choose an initial theme and background for your Productivitree.' },
  { id: 'done', title: 'All Set!', description: 'Your Productivitree is ready to grow. Start adding tasks and watch it flourish!' },
];


// Gemini Model Names
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash-preview-04-17";
export const GEMINI_IMAGE_MODEL = "imagen-3.0-generate-002";

// API Key handling and warnings are managed in AppContext.tsx.
