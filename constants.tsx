console.log('CONSTANTS.TSX: Script start');
// React import removed. FloatingLights and MistClouds imports removed.
import { LeafStatus } from './types'; // Changed path alias to relative path. TreeTheme, BackgroundTheme not imported here as types are inferred for consts.

// Colores para las hojas según estado (User's proposal)
export const leafColors = {
  [LeafStatus.Pending]: {
    gradient: 'from-teal-500 to-teal-600', // Tailwind classes
    shadow: 'shadow-teal-300',
    animation: ''
  },
  [LeafStatus.InProgress]: {
    gradient: 'from-amber-400 to-amber-500', 
    shadow: 'shadow-amber-300',
    animation: 'animate-pulse' // Tailwind animation
  },
  [LeafStatus.Urgent]: {
    gradient: 'from-red-500 to-red-600',
    shadow: 'shadow-red-300', 
    animation: 'animate-ping' // Tailwind animation
  },
  [LeafStatus.RecentActivity]: {
    gradient: 'from-lime-400 to-lime-500',
    shadow: 'shadow-lime-300',
    animation: 'animate-bounce' // Tailwind animation
  },
  [LeafStatus.Completed]: {
    gradient: 'from-gray-400 to-gray-500',
    shadow: 'shadow-gray-300',
    animation: ''
  }
};

// Colores para los frutos según tipo (User's proposal)
export const fruitColors = {
  personal_growth: 'text-green-500', // Tailwind class
  milestone: 'text-red-500',       // Tailwind class
  opportunity: 'text-amber-500'    // Tailwind class
};

// --- Tree Theme Constants ---
// My existing treeThemes, type TreeTheme is defined in types.ts and will be inferred.
export const treeThemes = {
  spring: { name: 'Spring', leafColors: { base: 'text-green-400', variant: 'text-pink-300' }, branchColor: 'text-yellow-700', skyColor: 'bg-blue-300' },
  summer: { name: 'Summer', leafColors: { base: 'text-green-600', variant: 'text-green-500' }, branchColor: 'text-yellow-800', skyColor: 'bg-sky-500' },
  autumn: { name: 'Autumn', leafColors: { base: 'text-orange-500', variant: 'text-red-500' }, branchColor: 'text-stone-700', skyColor: 'bg-orange-300' },
  winter: { name: 'Winter', leafColors: { base: 'text-transparent', variant: 'text-transparent' }, branchColor: 'text-gray-500', skyColor: 'bg-slate-400' },
};


// Temas de fondo (User's proposal with particles: null and my existing textColor)
// Type BackgroundTheme is defined in types.ts and will be inferred.
export const backgroundThemes = {
  enchanted_forest: {
    name: 'Enchanted Forest', // My addition for consistency
    backgroundGradient: 'linear-gradient(to bottom, #1e3a8a, #312e81, #1f2937)',
    particles: null, // Changed from component to null
    ambientSound: 'forest_mystical.mp3',
    weatherEffects: 'gentle_sparkles',
    textColor: 'text-blue-100', // My addition
  },
  mountain_cliff: {
    name: 'Mountain Cliff', // My addition for consistency
    backgroundGradient: 'linear-gradient(to bottom, #0f172a, #334155, #64748b)', 
    particles: null, // Changed from component to null
    ambientSound: 'mountain_wind.mp3',
    weatherEffects: 'subtle_fog',
    textColor: 'text-slate-200', // My addition
  },
  serene_dawn: { // My existing theme
    name: 'Serene Dawn',
    backgroundGradient: 'linear-gradient(to bottom, #fbc2eb, #a6c1ee)',
    particles: null, // Changed
    ambientSound: 'birds_chirping.mp3',
    weatherEffects: 'soft_glow',
    textColor: 'text-indigo-800',
  }
};

// Usuario por defecto (User's proposal)
export const DEFAULT_USER_ID = "default-user-123"; // User's value

// Configuración de Google Gemini AI
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash-preview-04-17"; // Corrected model name

// Datos iniciales del árbol (User's proposal, adapted to TreeNode and TaskData from types.ts)
// Explicit :TreeNode type annotation removed to prevent parsing error.
export const INITIAL_TREE_DATA = {
  id: "root", // User's value
  type: "rootNode", // Removed 'as const'
  position: { x: 0, y: 0 }, // User's value
  size: 10, // User's value
  color: "#654321", // User's value - actual color string
  data: { name: "My Productivitree" }, // User's value
  children: [
    {
      id: "project1", 
      parentId: "root", // Added parentId for consistency
      type: "branch", // Removed 'as const'
      position: { x: -100, y: 100 }, // User's value
      size: 8, // User's value
      color: "#8B4513", // User's value - actual color string
      data: { name: "Sample Project" }, // User's value
      children: [
        {
          id: "task1",
          parentId: "project1", // Added parentId for consistency
          type: "leaf", // Removed 'as const'
          position: { x: -150, y: 150 }, // User's value
          size: 6, // User's value
          color: "#22c55e", // User's value - actual color string (green)
          data: { // This data should align with TaskData or be a subset
            id: "task1", // From user's data example
            title: "Complete onboarding", // From user's data example
            description: "Finish the app setup process", // From user's data example
            status: LeafStatus.Pending, // Use LeafStatus enum
            priority: 1, // From user's data example
            projectId: "project1", // From user's data example
            createdAt: new Date().toISOString(), // Use ISO string for TaskData compatibility
            lastActivityAt: new Date().toISOString() // Use ISO string for TaskData compatibility
          },
          children: [] // User's value
        }
      ]
    }
  ]
};

// --- Onboarding Steps --- (My existing, seems fine)
export const ONBOARDING_STEPS_CONFIG = [
  { id: 'welcome', title: 'Welcome to Productivitree!', description: 'Let\'s get your productivity tree growing.' },
  { id: 'passion_test', title: 'Discover Your Passions', description: 'A quick test to find what truly motivates you. This will help shape your tree\'s roots.' },
  { id: 'define_roots', title: 'Define Your Roots', description: 'Based on your passions, establish 3-5 core values or motivations.' },
  { id: 'experience_mapping', title: 'Map Your Experience', description: 'Describe your formation and experience to build your tree\'s trunk with AI.' },
  { id: 'first_projects', title: 'Plant Your First Branches', description: 'Let\'s add 1-2 initial projects or goals you want to work on.' },
  { id: 'tree_customization', title: 'Customize Your View', description: 'Choose an initial theme and background for your Productivitree.' },
  { id: 'done', title: 'All Set!', description: 'Your Productivitree is ready to grow. Start adding tasks and watch it flourish!' },
];

// Gemini Model Names (already defined GEMINI_TEXT_MODEL, adding IMAGE model from my previous constants)
export const GEMINI_IMAGE_MODEL = "imagen-3.0-generate-002";

console.log('CONSTANTS.TSX: Script end');
