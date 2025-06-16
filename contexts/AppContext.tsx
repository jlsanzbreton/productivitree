

console.log('APPCONTEXT.TSX: Script start');
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User, RootData, ProjectData, TaskData, AchievementData, TreeNode, LeafStatus, PassionTestResult } from '../types';
// Ensure all necessary constants are imported, especially GEMINI_TEXT_MODEL for runPassionTest
import { DEFAULT_USER_ID, INITIAL_TREE_DATA, backgroundThemes, GEMINI_TEXT_MODEL, leafColors } from '../constants'; 
import { GoogleGenAI } from '@google/genai'; // Ensure this import is present

export interface AppContextType {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  roots: RootData[];
  setRoots: React.Dispatch<React.SetStateAction<RootData[]>>;
  projects: ProjectData[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectData[]>>;
  currentTasks: TaskData[];
  setCurrentTasks: React.Dispatch<React.SetStateAction<TaskData[]>>;
  achievements: AchievementData[];
  setAchievements: React.Dispatch<React.SetStateAction<AchievementData[]>>;
  treeData: TreeNode;
  setTreeData: React.Dispatch<React.SetStateAction<TreeNode>>;
  activeBackground: string;
  setActiveBackground: React.Dispatch<React.SetStateAction<string>>;
  activeTreeTheme: string;
  setActiveTreeTheme: React.Dispatch<React.SetStateAction<string>>;
  treeHealth: number;
  setTreeHealth: React.Dispatch<React.SetStateAction<number>>;
  waterTree: () => void;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  showPassionTest: boolean;
  setShowPassionTest: React.Dispatch<React.SetStateAction<boolean>>;
  passionTestResult: PassionTestResult | null;
  setPassionTestResult: React.Dispatch<React.SetStateAction<PassionTestResult | null>>;
  runPassionTest: (userInputs: string[]) => Promise<void>;
  isOnboardingComplete: boolean;
  setIsOnboardingComplete: React.Dispatch<React.SetStateAction<boolean>>;
  addTask: (task: Omit<TaskData, 'id' | 'createdAt' | 'lastActivityAt'>) => void;
  updateTask: (task: TaskData) => void;
  deleteTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  showTaskModal: boolean;
  setShowTaskModal: React.Dispatch<React.SetStateAction<boolean>>;
  editingTask: TaskData | null;
  setEditingTask: React.Dispatch<React.SetStateAction<TaskData | null>>;
  ai: GoogleGenAI | null; // Reinstate AI client
}

export const AppContext = createContext<AppContextType | null>(null);

const defaultUser: User = {
  id: DEFAULT_USER_ID, // From user's constants.ts
  passionTestCompleted: false,
  treeTheme: 'spring',
  backgroundSetting: 'enchanted_forest', // Default, user's proposal also used this
  treeHealth: 75,
};

// Using user's proposed initialTasks, ensuring consistency with LeafStatus
const initialTasks: TaskData[] = [
    { 
      id: 'task1', 
      title: 'Review project proposal', 
      description: 'Go over the new proposal docs.', 
      status: LeafStatus.Pending, 
      priority: 1, 
      createdAt: new Date().toISOString(), 
      lastActivityAt: new Date().toISOString() 
    },
    { 
      id: 'task2', 
      title: 'Develop feature X', 
      description: 'Implement the core logic for feature X.', 
      status: LeafStatus.InProgress, 
      priority: 2, 
      createdAt: new Date().toISOString(), 
      lastActivityAt: new Date().toISOString() 
    },
    { 
      id: 'task3', 
      title: 'Fix critical bug #123', 
      description: 'Urgent bug in production.', 
      status: LeafStatus.Urgent, 
      priority: 3, 
      createdAt: new Date().toISOString(), 
      lastActivityAt: new Date().toISOString() 
    },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('APPCONTEXT.TSX: AppProvider component start');
  
  // State initializations from user's proposal (robust localStorage parsing)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('productivitree-user');
      return savedUser ? JSON.parse(savedUser) : defaultUser;
    } catch (error) {
      console.error("Failed to parse user from localStorage:", error);
      localStorage.removeItem('productivitree-user');
      return defaultUser;
    }
  });

  const [roots, setRoots] = useState<RootData[]>(() => {
    try {
      const savedRoots = localStorage.getItem('productivitree-roots');
      return savedRoots ? JSON.parse(savedRoots) : [];
    } catch (error) {
      console.error("Failed to parse roots from localStorage:", error);
      localStorage.removeItem('productivitree-roots');
      return [];
    }
  });

  const [projects, setProjects] = useState<ProjectData[]>([]); // User proposal also started with empty projects
  
  const [currentTasks, setCurrentTasks] = useState<TaskData[]>(() => {
    try {
      const savedTasks = localStorage.getItem('productivitree-tasks');
      return savedTasks ? JSON.parse(savedTasks) : initialTasks;
    } catch (error) {
      console.error("Failed to parse tasks from localStorage:", error);
      localStorage.removeItem('productivitree-tasks');
      return initialTasks;
    }
  });

  const [achievements, setAchievements] = useState<AchievementData[]>([]); // User proposal also started empty
  const [treeData, setTreeData] = useState<TreeNode>(INITIAL_TREE_DATA); // Use new INITIAL_TREE_DATA
  
  const [activeBackground, setActiveBackground] = useState<string>(() => {
    try {
      const savedBg = localStorage.getItem('productivitree-background');
      return savedBg ? savedBg : (currentUser?.backgroundSetting || 'enchanted_forest');
    } catch (error) {
      console.error("Failed to read activeBackground from localStorage:", error);
      localStorage.removeItem('productivitree-background');
      return currentUser?.backgroundSetting || 'enchanted_forest';
    }
  });

  const [activeTreeTheme, setActiveTreeTheme] = useState<string>(() => {
    try {
      const savedTheme = localStorage.getItem('productivitree-treeTheme');
      return savedTheme ? savedTheme : (currentUser?.treeTheme || 'spring');
    } catch (error) {
      console.error("Failed to read activeTreeTheme from localStorage:", error);
      localStorage.removeItem('productivitree-treeTheme');
      return currentUser?.treeTheme || 'spring';
    }
  });
  
  const [treeHealth, setTreeHealth] = useState<number>(() => {
    try {
      const savedHealth = localStorage.getItem('productivitree-health');
      return savedHealth ? parseInt(savedHealth, 10) : (currentUser?.treeHealth || 75);
    } catch (error) {
      console.error("Failed to parse treeHealth from localStorage:", error);
      localStorage.removeItem('productivitree-health');
      return currentUser?.treeHealth || 75;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassionTest, setShowPassionTest] = useState<boolean>(false);
  const [passionTestResult, setPassionTestResult] = useState<PassionTestResult | null>(null);
  
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('productivitree-onboardingComplete');
      return saved === 'true';
    } catch (error) {
      console.error("Failed to read onboardingComplete from localStorage:", error);
      localStorage.removeItem('productivitree-onboardingComplete');
      return false;
    }
  });

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskData | null>(null);
  const [ai, setAi] = useState<GoogleGenAI | null>(null); // Reinstate AI client state

  // Reinstate Gemini API initialization
  useEffect(() => {
    console.log('APPCONTEXT.TSX: API Key useEffect runs');
    let apiKeyFromEnv: string | undefined = undefined;
    
    if (
      typeof process !== 'undefined' &&
      process.env &&
      typeof process.env.API_KEY === 'string' &&
      process.env.API_KEY.trim() !== ''
    ) {
      apiKeyFromEnv = process.env.API_KEY;
      console.log('APPCONTEXT.TSX: API_KEY found in process.env');
    } else {
      console.warn('APPCONTEXT.TSX: API_KEY not found or invalid in process.env. Gemini features will be disabled.');
    }

    if (apiKeyFromEnv) {
      try {
        setAi(new GoogleGenAI({ apiKey: apiKeyFromEnv }));
        console.log('APPCONTEXT.TSX: GoogleGenAI initialized successfully.');
      } catch (e: any) {
        console.error("APPCONTEXT.TSX: Error initializing GoogleGenAI:", e);
        setError(`Failed to initialize Gemini API: ${e.message}. Ensure API_KEY is valid.`);
        setAi(null);
      }
    } else {
      setAi(null);
    }
  }, []); // Runs once on mount


  // Persist state to localStorage (largely from user's proposal, review dependencies)
  useEffect(() => {
    if(currentUser) {
        try { localStorage.setItem('productivitree-user', JSON.stringify(currentUser)); }
        catch (e) { console.error("Failed to save user to localStorage", e); }
    }
  }, [currentUser]);

  useEffect(() => {
    try { localStorage.setItem('productivitree-roots', JSON.stringify(roots)); }
    catch (e) { console.error("Failed to save roots to localStorage", e); }
  }, [roots]);

  useEffect(() => {
    try { localStorage.setItem('productivitree-tasks', JSON.stringify(currentTasks)); }
    catch (e) { console.error("Failed to save tasks to localStorage", e); }
  }, [currentTasks]);
  
  // Revised useEffects for activeBackground and activeTreeTheme to avoid potential loops
  useEffect(() => {
    try { localStorage.setItem('productivitree-background', activeBackground); }
    catch (e) { console.error("Failed to save activeBackground to localStorage", e); }
    setCurrentUser(prev => prev ? ({...prev, backgroundSetting: activeBackground}) : null);
  }, [activeBackground, setCurrentUser]); // Removed currentUser from deps

  useEffect(() => {
    try { localStorage.setItem('productivitree-treeTheme', activeTreeTheme); }
    catch (e) { console.error("Failed to save activeTreeTheme to localStorage", e); }
    setCurrentUser(prev => prev ? ({...prev, treeTheme: activeTreeTheme}) : null);
  }, [activeTreeTheme, setCurrentUser]); // Removed currentUser from deps


  useEffect(() => {
    try { localStorage.setItem('productivitree-health', treeHealth.toString()); }
    catch (e) { console.error("Failed to save treeHealth to localStorage", e); }
  }, [treeHealth]);

  useEffect(() => {
    try { localStorage.setItem('productivitree-onboardingComplete', String(isOnboardingComplete)); }
    catch (e) { console.error("Failed to save onboardingComplete to localStorage", e); }
  }, [isOnboardingComplete]);

  const waterTree = useCallback(() => {
    setTreeHealth(prev => Math.min(100, prev + 10));
  }, []);

  // Reinstate real runPassionTest
  const runPassionTest = useCallback(async (userInputs: string[]) => {
    if (!ai) {
      setError("Gemini API is not initialized. Please ensure the API key is correctly set up.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const prompt = `
      You are an expert personal development coach.
      A user has provided the following answers to questions about their passions, flow activities, values, desired contributions, intrinsic motivations, and transformative experiences:
      ${userInputs.map((input, index) => `Q${index+1} Answer: ${input}`).join('\n')}

      Based on these answers, please identify:
      1.  Up to 5 main "passion_categories" (e.g., "Creative Expression", "Problem Solving", "Community Building").
      2.  Generate 3 "root_suggestions" for their Productivitree. Each root should have a "title" (short, e.g., "Lifelong Learning"), a "description" (1-2 sentences), and a "strength" score (1-10, based on emphasis in answers).
      3.  Provide a short "personalized_insights" paragraph (2-3 sentences) offering encouragement or a reflection based on their answers.

      Return the response strictly as a JSON object with the following structure:
      {
        "passion_categories": ["string", ...],
        "root_suggestions": [
          { "title": "string", "description": "string", "strength": number },
          ...
        ],
        "personalized_insights": "string"
      }
    `;

    let jsonStr = ""; 

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL, 
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      jsonStr = response.text; 
      console.log("[AppContext runPassionTest] Raw response text from Gemini API:", jsonStr);

      // 1. Remove Byte Order Mark (BOM)
      if (jsonStr.charCodeAt(0) === 0xFEFF) {
        jsonStr = jsonStr.substring(1);
        console.log("[AppContext runPassionTest] After BOM removal:", jsonStr);
      }
      
      // 2. Trim whitespace
      jsonStr = jsonStr.trim();
      console.log("[AppContext runPassionTest] After trim():", jsonStr);

      // 3. Remove Markdown fences if present
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
        console.log("[AppContext runPassionTest] After fence removal:", jsonStr);
      } else {
        console.log("[AppContext runPassionTest] No fences found or regex did not match for fence removal.");
      }
      
      // 4. Advanced Cleaning: Remove non-JSON characters that might be breaking the structure.
      // This regex attempts to keep valid JSON characters and structure,
      // while removing unexpected characters, especially those like "い..." appearing incorrectly.
      // It allows:
      // - Standard JSON structural characters: {}, [], :, "
      // - Quoted strings (including escaped quotes and unicode within strings)
      // - Numbers (including decimals and exponents)
      // - Boolean values (true, false)
      // - Null values
      // - Whitespace within strings or between tokens
      // - Commas
      // This is a more aggressive cleaning step.
      // It will try to remove any characters that are not part of a valid JSON structure,
      // focusing on characters that might appear erroneously between valid tokens.
      
      // First, try to remove characters that are clearly not part of JSON, especially if they are non-ASCII and not in a string.
      // This targets the specific "い..." issue.
      // The regex looks for a closing quote of a string, followed by any non-ASCII characters (like い), and then a comma or closing bracket.
      // It replaces this with just the closing quote and the comma/bracket, effectively removing the junk characters.
      jsonStr = jsonStr.replace(/(")([^"\u0000-\u007F]+)([,\]}])/g, '$1$3');
      console.log("[AppContext runPassionTest] After specific non-ASCII removal between string and comma/bracket:", jsonStr);

      // 5. Attempt to fix common JSON issues like trailing commas before a ']' or '}'
      jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
      console.log("[AppContext runPassionTest] After trailing comma fix:", jsonStr);
      
      const result = JSON.parse(jsonStr) as PassionTestResult; 
      setPassionTestResult(result);
      setCurrentUser(prev => prev ? ({ ...prev, passionTestCompleted: true }) : null);

      if (result.root_suggestions) { 
        const newRoots: RootData[] = result.root_suggestions.map((rs, index) => ({
            id: `root-${Date.now()}-${index}`,
            userId: currentUser?.id || DEFAULT_USER_ID,
            title: rs.title,
            description: rs.description,
            strengthLevel: rs.strength,
            createdAt: new Date().toISOString(),
        }));
        setRoots(newRoots);
      }

    } catch (e: any) {
      console.error("Error running passion test:", e.message, e); 
      console.error("[AppContext runPassionTest] Problematic JSON string that caused parse error:", jsonStr);
      setError(`Failed to get passion insights: ${e.message}. The AI may have returned a response that could not be processed as valid JSON. Please check the console for the problematic JSON string. (Partial: ${jsonStr.substring(0,250)}...)`);
      setPassionTestResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [ai, currentUser?.id, setCurrentUser, setRoots, setPassionTestResult, setError, setIsLoading]);
  
  const addTask = useCallback((taskData: Omit<TaskData, 'id' | 'createdAt' | 'lastActivityAt'>) => {
    const newTask: TaskData = {
      ...taskData,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    };
    setCurrentTasks(prevTasks => [...prevTasks, newTask]);
  }, []);

  const updateTask = useCallback((updatedTask: TaskData) => {
    setCurrentTasks(prevTasks => 
      prevTasks.map(task => task.id === updatedTask.id ? {...updatedTask, lastActivityAt: new Date().toISOString()} : task)
    );
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setCurrentTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  }, []);
  
  const completeTask = useCallback((taskId: string) => {
    setCurrentTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
        ? { ...task, status: LeafStatus.Completed, completedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() } 
        : task
      )
    );
    setTreeHealth(prev => Math.min(100, prev + 5));
    setAchievements(prev => [...prev, {
      id: `ach-${Date.now()}`,
      title: 'Task Completed!',
      type: 'milestone',
      fruitType: 'green_apple',
      createdAt: new Date().toISOString(),
    }]);
  }, []);

   useEffect(() => {
    const newRootNode: TreeNode = { 
      id: "rootNodeTree", 
      type: 'rootNode',
      data: { name: currentUser?.treeTheme ? `${currentUser.treeTheme} Productivitree` : "My Productivitree" },
      children: [],
    };

    const projectNodes: TreeNode[] = projects.map(p => ({
      id: p.id,
      parentId: newRootNode.id,
      type: 'branch',
      data: p, 
      children: currentTasks
        .filter(t => t.projectId === p.id)
        .map(t => ({
          id: t.id,
          parentId: p.id,
          type: 'leaf',
          data: t, 
        }))
    }));
    
    const unassignedTasks = currentTasks.filter(t => !t.projectId);
    if (unassignedTasks.length > 0) {
        const unassignedBranch: TreeNode = {
            id: "unassigned-branch",
            parentId: newRootNode.id,
            type: "branch",
            data: { name: "General Tasks"}, 
            children: unassignedTasks.map(t => ({
                id: t.id,
                parentId: "unassigned-branch",
                type: 'leaf',
                data: t, 
            }))
        };
        projectNodes.push(unassignedBranch);
    }

    newRootNode.children = projectNodes;
    
    achievements.forEach(ach => {
        const targetNodeId = ach.projectId || (projectNodes.length > 0 ? projectNodes[0].id : newRootNode.id);
        
        const findAndAddFruit = (nodes: TreeNode[] | undefined): boolean => {
            if (!nodes) return false;
            for (let node of nodes) {
                if (node.id === targetNodeId) {
                    if (!node.children) node.children = [];
                    node.children.push({
                        id: ach.id,
                        parentId: targetNodeId,
                        type: 'fruit',
                        data: ach, 
                    });
                    return true;
                }
                if (findAndAddFruit(node.children)) return true;
            }
            return false;
        }
        findAndAddFruit(newRootNode.children);
    });
    
    setTreeData(newRootNode); 
  }, [currentTasks, projects, achievements, currentUser?.treeTheme, roots]); 


  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      roots, setRoots,
      projects, setProjects,
      currentTasks, setCurrentTasks,
      achievements, setAchievements,
      treeData, setTreeData,
      activeBackground, setActiveBackground,
      activeTreeTheme, setActiveTreeTheme,
      treeHealth, setTreeHealth,
      waterTree,
      isLoading, setIsLoading,
      error, setError,
      showPassionTest, setShowPassionTest,
      passionTestResult, setPassionTestResult,
      runPassionTest,
      isOnboardingComplete, setIsOnboardingComplete,
      addTask, updateTask, deleteTask, completeTask,
      showTaskModal, setShowTaskModal,
      editingTask, setEditingTask,
      ai
    }}>
      {children}
    </AppContext.Provider>
  );
};
