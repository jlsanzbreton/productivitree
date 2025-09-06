export interface User {
  id: string;
  email?: string; // Optional as per Supabase schema if auth is separate
  passionTestCompleted: boolean;
  treeTheme: string; // e.g., 'spring', 'summer'
  backgroundSetting: string; // e.g., 'enchanted_forest'
  treeHealth: number; // 0-100
  experienceAreas: ExperienceArea[]; // Nuevo: áreas de experiencia del usuario
  createdAt?: string; // User's proposal added this
}

// Nuevo: Interfaz para áreas de experiencia (tronco)
export interface ExperienceArea {
  id: string;
  userId: string;
  title: string; // "Tecnología", "Marketing", "Diseño", etc.
  description: string; // Descripción libre analizada por IA
  experienceLevel: number; // 1-10 (calculado por IA basado en descripción)
  credentials: string[]; // Extraído por IA de la descripción
  relatedRootIds: string[]; // Qué pasiones alimentan esta área
  relatedProjectIds: string[]; // Qué proyectos surgen de esta experiencia
  trunkSection: {
    thickness: number; // Calculado desde experienceLevel (1-10)
    textureDetail: 'basic' | 'medium' | 'detailed'; // Basado en experienceLevel
    position: number; // Altura relativa en el tronco (0-1)
    color: string; // Color basado en experiencia y salud
  };
  createdAt: string;
  updatedAt: string;
}

export interface RootData {
  id: string;
  userId: string;
  title: string;
  description: string;
  strengthLevel: number; // 1-10
  relatedExperienceIds: string[]; // Nuevo: áreas de experiencia relacionadas
  createdAt: string; // ISO date string
}

export interface ProjectData {
  id: string;
  userId: string;
  title: string;
  description: string;
  priorityLevel: number; // 1-5
  trunkThickness?: number; // Calculated or set
  originRootId?: string; // Nuevo: de qué raíz/pasión surge este proyecto
  originExperienceId?: string; // Nuevo: de qué área de experiencia surge
  // branchPosition removed as per user's ProjectData suggestion (implicitly by omission)
  status: 'active' | 'completed' | 'paused';
  createdAt: string; // ISO date string
  completedAt?: string; // ISO date string
}

export enum LeafStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Urgent = 'urgent',
  Completed = 'completed',
  RecentActivity = 'recent_activity' // Custom status for animation
}

export interface TaskData {
  id: string;
  projectId?: string; // Optional if a task can exist without a project initially
  title: string;
  description: string;
  status: LeafStatus;
  priority: number; // 1-5
  dueDate?: string; // ISO date string
  // leafPosition removed as per user's TaskData suggestion (implicitly by omission)
  lastActivityAt: string; // ISO date string. User's INITIAL_TREE_DATA example used 'lastActivity', ensure consistency.
  createdAt: string; // ISO date string
  completedAt?: string; // ISO date string
}

export interface AchievementData {
  id: string;
  projectId?: string;
  title: string;
  type: 'personal_growth' | 'milestone' | 'opportunity';
  fruitType: 'green_apple' | 'red_apple' | 'orange'; // Corresponds to type color
  // position removed as per user's AchievementData suggestion (implicitly by omission)
  createdAt: string; // ISO date string
}

// For D3 Visualization, adapted from user's proposal and existing structure
export interface TreeNode {
  id: string;
  parentId?: string | null;
  type: 'rootNode' | 'trunk' | 'branch' | 'leaf' | 'fruit'; // Keep existing, user proposal similar
  position?: { x: number; y: number; z?: number }; // Added from user proposal
  size?: number; // Added from user proposal (was on TreeNode before, ensuring it's optional)
  color?: string; // Added from user proposal (was on TreeNode before, ensuring it's optional)
  data?: { // More specific data based on type, accommodating new INITIAL_TREE_DATA and existing TaskData
    name?: string; // For root, branches
    // For leaves, aligning with TaskData but also INITIAL_TREE_DATA's specific leaf data structure
    id?: string;
    title?: string;
    description?: string;
    status?: LeafStatus;
    priority?: number;
    projectId?: string;
    createdAt?: string | Date; // INITIAL_TREE_DATA used Date objects
    lastActivityAt?: string | Date; // INITIAL_TREE_DATA used Date objects
  } | TaskData | ProjectData | RootData | AchievementData | any; // Keep flexible 'any' for now if needed
  children?: TreeNode[];
  // D3 specific properties, will be augmented by d3.hierarchy
  x?: number; 
  y?: number;
  depth?: number; 
  x0?: number;
  y0?: number;
}

// For TreeNode in the prompt (more generic, combining with D3 needs) - This was old, removing if not strictly necessary.
// export interface ProductivitreeNode {
//   id: string;
//   type: 'root' | 'trunk' | 'branch' | 'leaf' | 'fruit';
//   position: { x: number; y: number; z?: number };
//   size: number;
//   color: string;
//   animation?: AnimationState;
//   metadata?: any;
// }

// export interface AnimationState {
//   type: 'sway' | 'growth' | 'fall' | 'breathe' | 'particles';
//   active: boolean;
//   duration?: number;
// }

export interface PassionTestResult {
  passion_categories: string[]; // User proposal uses snake_case
  root_suggestions: Array<{ title: string; description: string; strength: number }>;
  personalized_insights: string;
}

export interface OnboardingStep { // This was in my types.ts, keeping for OnboardingFlow
  id: string;
  title: string;
  description: string;
  isCompleted: boolean; // This was not in my original OnboardingStep, but useful
}

// Moved from constants.tsx previously, ensuring they are here.
export interface TreeTheme {
  name: string;
  leafColors: {
    base: string;
    variant: string;
  };
  branchColor: string;
  skyColor: string;
}

export interface BackgroundTheme {
  name:string;
  backgroundGradient: string;
  particles?: React.FC | null; // Allow null as per user's constants.ts change
  ambientSound?: string;
  weatherEffects?: string;
  textColor: string; // Added as per my existing constants.ts
}
