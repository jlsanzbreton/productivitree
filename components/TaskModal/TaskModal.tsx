
import React, { useState, useEffect, useContext } from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { TaskData, LeafStatus } from '../../types';
import { AppContext, AppContextType } from '../../contexts/AppContext';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: TaskData | null; // If editing, pass the task
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task }) => {
  const { addTask, updateTask, deleteTask, projects } = useContext(AppContext) as AppContextType;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number>(3); // Default priority 1-5
  const [status, setStatus] = useState<LeafStatus>(LeafStatus.Healthy);
  const [dueDate, setDueDate] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : ''); // Format for date input
      setProjectId(task.projectId);
    } else {
      // Reset for new task
      setTitle('');
      setDescription('');
      setPriority(3);
      setStatus(LeafStatus.Healthy);
      setDueDate('');
      setProjectId(projects[0]?.id || '');
    }
  }, [task, isOpen, projects]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Title is required."); // Simple validation
      return;
    }
    if (!projectId) {
      alert('Select a project branch before adding a stage.');
      return;
    }

    const taskDataPayload = {
      title,
      description,
      priority,
      status,
      projectId,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    };

    if (task) { // Editing existing task
      updateTask({ ...task, ...taskDataPayload });
    } else { // Adding new task
      addTask(taskDataPayload);
    }
    onClose();
  };
  
  const handleDelete = () => {
    if (task && window.confirm(`Are you sure you want to delete task: "${task.title}"?`)) {
      deleteTask(task.id);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'Add New Task'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-white"
            placeholder="e.g., Water the virtual plant"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-white"
            placeholder="Add more details about the task..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="project" className="block text-sm font-medium text-gray-300 mb-1">
              Project Branch
            </label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
            >
              {projects.length === 0 && <option value="">Create a project first</option>}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-1">
              Priority (1-Low, 5-High)
            </label>
            <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
            >
                {[1,2,3,4,5].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-1">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as LeafStatus)}
              className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
            >
              {Object.values(LeafStatus).map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300 mb-1">
                Due Date (Optional)
            </label>
            <input
                type="date"
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
            />
        </div>


        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-700">
          {task && (
             <Button type="button" variant="danger" onClick={handleDelete} className="w-full sm:w-auto">
                Delete Task
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="w-full sm:w-auto">
            {task ? 'Save Changes' : 'Add Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskModal;
