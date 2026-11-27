import React, { useEffect, useRef } from 'react';
import type { GuideHint } from './livingTreeEngine';

export type GuideStepId = 'welcome' | 'sun' | 'roots' | 'trunk' | 'branch' | 'leaf' | 'end';
export const GUIDE_STEPS: GuideStepId[] = ['welcome', 'sun', 'roots', 'trunk', 'branch', 'leaf', 'end'];

const COPY: Record<GuideStepId, { title: string; body: string; hint?: GuideHint }> = {
  welcome: {
    title: 'Este es un árbol de ejemplo',
    body: 'Así se ve Productivitree con unos cuantos proyectos. Vamos a convertirlo en el tuyo, parte por parte.',
  },
  sun: { title: 'El sol es tu propósito', body: 'Haz clic en el sol y escribe hacia dónde va todo lo que haces.', hint: 'sun' },
  roots: {
    title: 'Las raíces son tus pasiones',
    body: 'Haz clic en una raíz y cámbiala por algo que te mueva. Desde el panel puedes añadir más, o descubrirlas con el test de IA.',
    hint: 'roots',
  },
  trunk: { title: 'El tronco es tu experiencia', body: 'Haz clic en un tramo del tronco, cámbiale el nombre y cuenta lo que sabes hacer.', hint: 'trunk' },
  branch: {
    title: 'Cada rama es un proyecto',
    body: 'Haz clic en una rama y pulsa «Editar» para ponerle el nombre de un proyecto tuyo, o brota una nueva desde el panel.',
    hint: 'branch',
  },
  leaf: {
    title: 'Las hojas son tareas',
    body: 'Con una rama abierta, haz clic en una hoja: se abre su banco de trabajo, donde se va apuntando lo que haces.',
  },
  end: { title: 'Ya es tu árbol', body: '' },
};

interface TreeGuideProps {
  step: GuideStepId;
  done: boolean;
  leftover: number;
  onStep: (step: GuideStepId) => void;
  onHint: (hint: GuideHint | null) => void;
  onPickFile: (text: string) => void;
  onRemoveLeftover: () => void;
  onClose: () => void;
}

/** A small card over the canvas that walks through the tree, one part at a time. */
const TreeGuide: React.FC<TreeGuideProps> = ({ step, done, leftover, onStep, onHint, onPickFile, onRemoveLeftover, onClose }) => {
  const index = GUIDE_STEPS.indexOf(step);
  const copy = COPY[step];
  const fileRef = useRef<HTMLInputElement>(null);
  const next = () => onStep(GUIDE_STEPS[Math.min(GUIDE_STEPS.length - 1, index + 1)]);

  useEffect(() => {
    onHint(done ? null : copy.hint || null);
    return () => onHint(null);
  }, [copy.hint, done, onHint]);

  // Once a part is made one's own, move on by itself after a short pause.
  useEffect(() => {
    if (!done || step === 'welcome' || step === 'end') return undefined;
    const timer = window.setTimeout(next, 1400);
    return () => window.clearTimeout(timer);
  }, [done, step]);

  return (
    <div className="lt-guide" role="region" aria-label="Guía">
      <div className="lt-guide-top">
        <span>{step === 'welcome' ? 'Bienvenida' : step === 'end' ? 'Listo' : `Paso ${index} de ${GUIDE_STEPS.length - 2}`}</span>
        <button className="lt-x" onClick={onClose} aria-label="Cerrar la guía">
          ×
        </button>
      </div>
      <h3>
        {done && step !== 'end' ? <span className="lt-guide-ok">✓ </span> : null}
        {copy.title}
      </h3>
      {copy.body && <p>{copy.body}</p>}

      {step === 'welcome' && (
        <>
          <button className="lt-guide-drop" onClick={() => fileRef.current?.click()}>
            <b>¿Ya tienes un archivo de Productivitree?</b>
            Suéltalo sobre el árbol o haz clic para elegirlo.
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) file.text().then(onPickFile);
              e.target.value = '';
            }}
          />
          <div className="lt-acts">
            <button className="lt-btn" onClick={onClose}>
              Explorar a mi aire
            </button>
            <button className="lt-btn sprout" onClick={next}>
              Empezar la guía
            </button>
          </div>
        </>
      )}

      {step === 'end' && (
        <>
          <p>
            {leftover
              ? `Quedan ${leftover} ${leftover === 1 ? 'cosa' : 'cosas'} del ejemplo que no has tocado. Puedes quitarlas ahora o más adelante.`
              : 'No queda nada del ejemplo. A partir de aquí, brota ramas y hojas a medida que trabajas.'}
          </p>
          <div className="lt-acts">
            {leftover ? (
              <>
                <button className="lt-btn" onClick={onClose}>
                  Dejarlo así
                </button>
                <button
                  className="lt-btn sprout"
                  onClick={() => {
                    onRemoveLeftover();
                    onClose();
                  }}
                >
                  Quitar lo del ejemplo
                </button>
              </>
            ) : (
              <button className="lt-btn sprout full" onClick={onClose}>
                Terminar
              </button>
            )}
          </div>
        </>
      )}

      {step !== 'welcome' && step !== 'end' && (
        <div className="lt-guide-nav">
          <button className="lt-link" onClick={() => onStep(GUIDE_STEPS[index - 1])}>
            ← Atrás
          </button>
          <button className="lt-link" onClick={next}>
            {done ? 'Siguiente →' : 'Saltar este paso →'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TreeGuide;
