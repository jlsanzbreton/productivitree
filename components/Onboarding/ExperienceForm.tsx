//components/Onboarding/ExperienceForm.tsx
/* eslint-disable react/no-unescaped-entities */
/* Form to capture user experience and display the generated analysis. */
import React, { useState } from 'react';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';
import { ExperienceArea } from '../../types';
import { ArrowPathIcon, CheckCircleIcon, LightBulbIcon } from '../Icons/HeroIcons';

interface ExperienceFormProps {
  text: string;
  onChange: (value: string) => void;
  isAnalyzing: boolean;
  experienceAreas: ExperienceArea[];
}

const ExperienceForm: React.FC<ExperienceFormProps> = ({ text, onChange, isAnalyzing, experienceAreas }) => {
  const [showTips, setShowTips] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Cuéntanos sobre tu experiencia, estudios y conocimientos. La IA analizará tu texto para construir el tronco de tu árbol.
      </p>

      <textarea
        placeholder="Describe tu formación, experiencia laboral, habilidades, certificaciones, etc. Sé tan detallado como quieras..."
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md placeholder-gray-400"
        disabled={isAnalyzing}
      />

      <Button variant="secondary" size="sm" onClick={() => setShowTips(true)}>
        Tips
      </Button>
      <Modal isOpen={showTips} onClose={() => setShowTips(false)} title="Tips">
        <p className="text-sm text-gray-300">
          Menciona tecnologías, industrias, roles, educación formal, certificaciones y proyectos relevantes.
        </p>
      </Modal>

      {isAnalyzing && (
        <div className="p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
          <div className="flex items-center space-x-3">
            <ArrowPathIcon className="h-6 w-6 text-blue-400 animate-spin" />
            <div>
              <p className="text-blue-300 font-semibold">Analizando tu experiencia...</p>
              <p className="text-blue-200 text-sm">La IA está procesando tu texto para identificar áreas de experiencia y construir el tronco de tu árbol.</p>
            </div>
          </div>
          <div className="mt-3 w-full bg-blue-800 rounded-full h-2">
            <div className="bg-blue-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <p className="text-blue-300 text-xs mt-2">Esto puede tomar 10-30 segundos...</p>
        </div>
      )}

      {experienceAreas.length > 0 && !isAnalyzing && (
        <div className="p-4 bg-gradient-to-br from-green-800/40 to-blue-800/40 border border-green-500 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircleIcon className="h-6 w-6 text-green-400" />
            <p className="text-green-300 font-semibold">¡Análisis completado!</p>
          </div>
          <p className="text-sm text-gray-300 mb-3">Áreas de experiencia identificadas para tu tronco:</p>
          <div className="space-y-2">
            {experienceAreas.map((area, index) => (
              <div key={index} className="bg-gray-700/80 p-3 rounded-md border-l-4 border-green-400">
                <div className="flex items-center space-x-2 mb-1">
                  <LightBulbIcon className="h-4 w-4 text-yellow-400" />
                  <p className="font-semibold text-blue-300">{area.title}</p>
                  <span className="px-2 py-1 bg-green-600 text-green-100 rounded-full text-xs">
                    Nivel {area.experienceLevel}/10
                  </span>
                </div>
                <p className="text-xs text-gray-300 ml-6">{area.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 bg-blue-900/40 rounded-md">
            <p className="text-blue-200 text-xs">
              💡 Estas áreas formarán el tronco de tu árbol, conectando tus pasiones (raíces) con tus proyectos (ramas).
            </p>
          </div>
        </div>
      )}

      {text.trim() && experienceAreas.length === 0 && !isAnalyzing && (
        <div className="p-3 bg-yellow-900/30 border border-yellow-500 rounded-lg">
          <p className="text-yellow-300 text-sm">
            💡 <strong>Tip:</strong> Sé más específico para mejores resultados. Menciona tecnologías, industrias, roles, educación formal, certificaciones, proyectos previos, etc.
          </p>
        </div>
      )}
    </div>
  );
};

export default ExperienceForm;
