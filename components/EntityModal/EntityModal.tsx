import React, { useContext, useEffect, useState } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { ProjectBranchStatus, TreeNode } from '../../types';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';

interface EntityModalProps {
  isOpen: boolean;
  node: TreeNode | null;
  onClose: () => void;
}

const EntityModal: React.FC<EntityModalProps> = ({ isOpen, node, onClose }) => {
  const {
    updateCoreRoot,
    deleteCoreRoot,
    updateTrunkSegment,
    deleteTrunkSegment,
    updateProjectBranch,
    deleteProjectBranch,
  } = useContext(AppContext) as AppContextType;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [strengthLevel, setStrengthLevel] = useState(7);
  const [proficiencyLevel, setProficiencyLevel] = useState(7);
  const [yearsOfExperience, setYearsOfExperience] = useState(2);
  const [priorityLevel, setPriorityLevel] = useState(3);
  const [status, setStatus] = useState<ProjectBranchStatus>('active');

  useEffect(() => {
    if (!node) return;
    const payload = (node.data || {}) as Record<string, unknown>;
    setTitle(String(payload.title || ''));
    setDescription(String(payload.description || ''));
    setStrengthLevel(Number(payload.strengthLevel || 7));
    setProficiencyLevel(Number(payload.proficiencyLevel || 7));
    setYearsOfExperience(Number(payload.yearsOfExperience || 2));
    setPriorityLevel(Number(payload.priorityLevel || 3));
    setStatus((payload.status as ProjectBranchStatus) || 'active');
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    const base = (node.data || {}) as Record<string, unknown>;

    if (node.type === 'root') {
      updateCoreRoot({
        userId: String(base.userId || ''),
        createdAt: String(base.createdAt || new Date().toISOString()),
        id: node.id,
        title,
        description,
        strengthLevel,
      });
      onClose();
      return;
    }

    if (node.type === 'trunk') {
      updateTrunkSegment({
        userId: String(base.userId || ''),
        createdAt: String(base.createdAt || new Date().toISOString()),
        id: node.id,
        title,
        description,
        proficiencyLevel,
        yearsOfExperience,
      });
      onClose();
      return;
    }

    if (node.type === 'branch') {
      updateProjectBranch({
        userId: String(base.userId || ''),
        createdAt: String(base.createdAt || new Date().toISOString()),
        updatedAt: String(base.updatedAt || new Date().toISOString()),
        id: node.id,
        title,
        description,
        priorityLevel,
        status,
      });
      onClose();
    }
  };

  const handleDelete = () => {
    if (node.type === 'root') deleteCoreRoot(node.id);
    if (node.type === 'trunk') deleteTrunkSegment(node.id);
    if (node.type === 'branch') deleteProjectBranch(node.id);
    onClose();
  };

  const titleByType =
    node.type === 'root' ? 'Edit Core Root' : node.type === 'trunk' ? 'Edit Trunk Segment' : 'Edit Project Branch';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titleByType}>
      <div className="space-y-4">
        <label className="block text-sm text-gray-300">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full p-2 rounded-md bg-gray-700 border border-gray-600"
          />
        </label>
        <label className="block text-sm text-gray-300">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="mt-1 w-full p-2 rounded-md bg-gray-700 border border-gray-600"
          />
        </label>
        {node.type === 'root' && (
          <label className="block text-sm text-gray-300">
            Strength (1-10)
            <input
              type="number"
              min={1}
              max={10}
              value={strengthLevel}
              onChange={(event) => setStrengthLevel(Number(event.target.value))}
              className="mt-1 w-full p-2 rounded-md bg-gray-700 border border-gray-600"
            />
          </label>
        )}
        {node.type === 'trunk' && (
          <>
            <label className="block text-sm text-gray-300">
              Proficiency (1-10)
              <input
                type="number"
                min={1}
                max={10}
                value={proficiencyLevel}
                onChange={(event) => setProficiencyLevel(Number(event.target.value))}
                className="mt-1 w-full p-2 rounded-md bg-gray-700 border border-gray-600"
              />
            </label>
            <label className="block text-sm text-gray-300">
              Years of experience
              <input
                type="number"
                min={0}
                max={60}
                value={yearsOfExperience}
                onChange={(event) => setYearsOfExperience(Number(event.target.value))}
                className="mt-1 w-full p-2 rounded-md bg-gray-700 border border-gray-600"
              />
            </label>
          </>
        )}
        {node.type === 'branch' && (
          <>
            <label className="block text-sm text-gray-300">
              Priority (1-5)
              <input
                type="number"
                min={1}
                max={5}
                value={priorityLevel}
                onChange={(event) => setPriorityLevel(Number(event.target.value))}
                className="mt-1 w-full p-2 rounded-md bg-gray-700 border border-gray-600"
              />
            </label>
            <label className="block text-sm text-gray-300">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ProjectBranchStatus)}
                className="mt-1 w-full p-2 rounded-md bg-gray-700 border border-gray-600"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
};

export default EntityModal;
