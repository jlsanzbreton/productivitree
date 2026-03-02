import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { ProjectBranchStatus } from '../../types';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';

export type GrowthEntityType = 'root' | 'trunk' | 'branch';

interface GrowthEntityModalProps {
  isOpen: boolean;
  entityType: GrowthEntityType | null;
  onClose: () => void;
}

const GrowthEntityModal: React.FC<GrowthEntityModalProps> = ({ isOpen, entityType, onClose }) => {
  const { addCoreRoot, addProjectBranch, addTrunkSegment } = useContext(AppContext) as AppContextType;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [strengthLevel, setStrengthLevel] = useState(8);
  const [proficiencyLevel, setProficiencyLevel] = useState(7);
  const [yearsOfExperience, setYearsOfExperience] = useState(2);
  const [priorityLevel, setPriorityLevel] = useState(3);
  const [status, setStatus] = useState<ProjectBranchStatus>('active');

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setDescription('');
    setStrengthLevel(8);
    setProficiencyLevel(7);
    setYearsOfExperience(2);
    setPriorityLevel(3);
    setStatus('active');
  }, [isOpen, entityType]);

  const titleByType = useMemo(() => {
    if (entityType === 'root') return 'Añadir Propósito (Raíz)';
    if (entityType === 'trunk') return 'Añadir Habilidad (Tronco)';
    if (entityType === 'branch') return 'Añadir Proyecto (Rama)';
    return 'Añadir Entidad';
  }, [entityType]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!entityType || !title.trim()) return;

    if (entityType === 'root') {
      addCoreRoot({
        title: title.trim(),
        description: description.trim(),
        strengthLevel,
      });
      onClose();
      return;
    }

    if (entityType === 'trunk') {
      addTrunkSegment({
        title: title.trim(),
        description: description.trim(),
        proficiencyLevel,
        yearsOfExperience,
      });
      onClose();
      return;
    }

    addProjectBranch({
      title: title.trim(),
      description: description.trim(),
      priorityLevel,
      status,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen && Boolean(entityType)} onClose={onClose} title={titleByType} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm text-amber-100/90">
          Título
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="mt-1 w-full p-2 rounded-md bg-[#1A1C1F] border border-yellow-700/30 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-[#FCEFC6]"
            placeholder="Escribe un nombre claro"
          />
        </label>

        <label className="block text-sm text-amber-100/90">
          Descripción
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="mt-1 w-full p-2 rounded-md bg-[#1A1C1F] border border-yellow-700/30 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-[#FCEFC6]"
            placeholder="Contexto u objetivo"
          />
        </label>

        {entityType === 'root' && (
          <label className="block text-sm text-amber-100/90">
            Fuerza de propósito (1-10)
            <input
              type="number"
              min={1}
              max={10}
              value={strengthLevel}
              onChange={(event) => setStrengthLevel(Number(event.target.value))}
              className="mt-1 w-full p-2 rounded-md bg-[#1A1C1F] border border-yellow-700/30 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-[#FCEFC6]"
            />
          </label>
        )}

        {entityType === 'trunk' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm text-amber-100/90">
              Proficiencia (1-10)
              <input
                type="number"
                min={1}
                max={10}
                value={proficiencyLevel}
                onChange={(event) => setProficiencyLevel(Number(event.target.value))}
                className="mt-1 w-full p-2 rounded-md bg-[#1A1C1F] border border-yellow-700/30 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-[#FCEFC6]"
              />
            </label>
            <label className="block text-sm text-amber-100/90">
              Años de experiencia
              <input
                type="number"
                min={0}
                max={60}
                value={yearsOfExperience}
                onChange={(event) => setYearsOfExperience(Number(event.target.value))}
                className="mt-1 w-full p-2 rounded-md bg-[#1A1C1F] border border-yellow-700/30 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-[#FCEFC6]"
              />
            </label>
          </div>
        )}

        {entityType === 'branch' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm text-amber-100/90">
              Prioridad (1-5)
              <input
                type="number"
                min={1}
                max={5}
                value={priorityLevel}
                onChange={(event) => setPriorityLevel(Number(event.target.value))}
                className="mt-1 w-full p-2 rounded-md bg-[#1A1C1F] border border-yellow-700/30 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-[#FCEFC6]"
              />
            </label>
            <label className="block text-sm text-amber-100/90">
              Estado
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ProjectBranchStatus)}
                className="mt-1 w-full p-2 rounded-md bg-[#1A1C1F] border border-yellow-700/30 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-[#FCEFC6]"
              >
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
                <option value="completed">Completado</option>
              </select>
            </label>
          </div>
        )}

        <div className="pt-3 border-t border-yellow-700/25 flex flex-col sm:flex-row justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" className="w-full sm:w-auto">
            Crear
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default GrowthEntityModal;
