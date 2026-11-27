import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/700.css';
import './livingTree.css';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { ProjectBranch, ProjectStageLeaf } from '../../types';
import { confirmAction } from '../../services/desktop';
import { buildLivingTreeModel, isFruit, twigParent } from '../../utils/livingTreeModel';
import { createLivingTree } from './livingTreeEngine';
import TaskBench from './TaskBench';
import SproutDialog, { SproutResult, SproutTarget } from './SproutDialog';
import TreeGuide, { GuideStepId } from './TreeGuide';
import type { GuideHint } from './livingTreeEngine';
import { guideProgress, leftoverExample, ExampleSnapshot } from '../../utils/exampleGuide';
import { ago, branchState, continueUrl, daysSince, isDone, leafState, openExternal } from './treeHelpers';

type Engine = ReturnType<typeof createLivingTree>;
type Panel = 'overview' | 'branch' | 'fruit' | 'experience' | 'passion';
export type GuideState = { step: GuideStepId; snap: ExampleSnapshot | null };

interface LivingTreeViewProps {
  onOpenArchive: () => void;
  onOpenData: (text?: string) => void;
  onOpenPassionTest: () => void;
  guide: GuideState | null;
  onGuide: (guide: GuideState | null) => void;
  onOpenConnect: () => void;
  focusRequest?: { projectId: string; taskId?: string; nonce: number } | null;
  sproutRequest?: { target: SproutTarget; nonce: number } | null;
}

const LivingTreeView: React.FC<LivingTreeViewProps> = ({ onOpenArchive, onOpenData, onOpenPassionTest, guide, onGuide, onOpenConnect, focusRequest, sproutRequest }) => {
  const ctx = useContext(AppContext) as AppContextType;
  const { projects, currentTasks, achievements, roots, trunkSegments, purpose, setPurpose, connections, setBranchStatus, archiveItem, setFruitHarvested, updateFruit, updateTrunkSegment } = ctx;
  const { updateCoreRoot, deleteCoreRoot, deleteTrunkSegment, removeExampleParts } = ctx;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const figRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [panel, setPanel] = useState<Panel>('overview');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [fruitId, setFruitId] = useState<string | null>(null);
  const [leafId, setLeafId] = useState<string | null>(null);
  const [benchOpen, setBenchOpen] = useState(false);
  const [zoomed, setZoomed] = useState<string | null>(null);
  const [sprout, setSprout] = useState<SproutTarget | null>(null);
  const [editingPurpose, setEditingPurpose] = useState(false);
  const [purposeDraft, setPurposeDraft] = useState(purpose);
  const [fruitLink, setFruitLink] = useState('');
  const [tick, setTick] = useState(0);
  const [expId, setExpId] = useState<string | null>(null);
  const [expDraft, setExpDraft] = useState('');
  const [rootSel, setRootSel] = useState<string | null>(null);
  const [rootDraft, setRootDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [benchSeen, setBenchSeen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const modelRef = useRef<ReturnType<typeof buildLivingTreeModel> | null>(null);

  // Closed branches leave the tree (they live in the archive); paused ones stay, greyed.
  const treeProjects = useMemo(() => projects.filter((p) => p.status !== 'completed'), [projects]);
  const model = useMemo(
    () => buildLivingTreeModel({ purpose, roots, trunkSegments, projects: treeProjects, stages: currentTasks, achievements }, new Date()),
    // tick re-ages the leaves every few minutes
    [purpose, roots, trunkSegments, treeProjects, currentTasks, achievements, tick]
  );

  useEffect(() => {
    const timer = window.setInterval(() => setTick((n) => n + 1), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const openBranch = useCallback((id: string) => {
    setBranchId(id);
    setPanel('branch');
    setFruitId(null);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !figRef.current) return undefined;
    const engine = createLivingTree(canvasRef.current, {
      container: figRef.current,
      tip: tipRef.current || undefined,
      onBranch: (id: string) => openBranch(id),
      onLeaf: (bId: string, lId: string) => {
        setBranchId(bId);
        setPanel('branch');
        setLeafId(lId);
        setBenchOpen(true);
      },
      onFruit: (bId: string, fId: string) => {
        setBranchId(bId);
        setFruitId(fId);
        setPanel('fruit');
        setBenchOpen(false);
      },
      onBackground: () => {
        setPanel('overview');
        setLeafId(null);
        setBenchOpen(false);
      },
      onZoom: (id: string | null) => setZoomed(id),
      onTrunk: (index: number) => {
        const id = modelRef.current?.trunkIds[index];
        if (!id) return;
        setExpId(id);
        setPanel('experience');
        setBenchOpen(false);
      },
      onRoot: (index: number) => {
        const id = modelRef.current?.rootIds[index];
        if (!id) return;
        setRootSel(id);
        setPanel('passion');
        setBenchOpen(false);
      },
      onSun: () => {
        setPanel('overview');
        setBenchOpen(false);
        setEditingPurpose(true);
      },
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [openBranch]);

  useEffect(() => {
    modelRef.current = model;
    engineRef.current?.setModel(model);
  }, [model]);

  useEffect(() => {
    const trunkIndex = panel === 'experience' && expId ? model.trunkIds.indexOf(expId) : -1;
    const rootIndex = panel === 'passion' && rootSel ? model.rootIds.indexOf(rootSel) : -1;
    engineRef.current?.select({
      branchId: panel === 'branch' || panel === 'fruit' ? branchId : null,
      leafId: benchOpen ? leafId : null,
      fruitId: panel === 'fruit' ? fruitId : null,
      trunkIndex: trunkIndex >= 0 ? trunkIndex : null,
      rootIndex: rootIndex >= 0 ? rootIndex : null,
    });
  }, [branchId, leafId, fruitId, panel, benchOpen, expId, rootSel, model]);

  // ---- first-run guide over the example tree
  const guideData = { purpose, roots, trunkSegments, projects, stages: currentTasks, connections };
  const progress = guideProgress(guide?.snap || null, guideData);
  const leftover = leftoverExample(guide?.snap || null, guideData);
  useEffect(() => {
    if (benchOpen) setBenchSeen(true);
  }, [benchOpen]);
  const stepDone = guide
    ? guide.step === 'sun'
      ? progress.sun
      : guide.step === 'roots'
        ? progress.roots
        : guide.step === 'trunk'
          ? progress.trunk
          : guide.step === 'branch'
            ? progress.branch
            : guide.step === 'leaf'
              ? benchSeen
              : false
    : false;
  const setHint = useCallback((hint: GuideHint | null) => engineRef.current?.setHint(hint), []);

  const onDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) file.text().then((text) => onOpenData(text));
  };

  useEffect(() => {
    if (!focusRequest) return;
    openBranch(focusRequest.projectId);
    engineRef.current?.zoomTo(focusRequest.projectId);
    if (focusRequest.taskId) {
      setLeafId(focusRequest.taskId);
      setBenchOpen(true);
    }
  }, [focusRequest, openBranch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || sprout) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
      if (benchOpen) setBenchOpen(false);
      else if (zoomed) {
        engineRef.current?.zoomTo(null);
        setPanel('overview');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [benchOpen, zoomed, sprout]);

  // The drawer covers the right of the screen: keep the zoomed branch in the part still visible.
  useEffect(() => {
    const fig = figRef.current;
    if (!fig) return;
    const covered = benchOpen ? Math.max(0, fig.getBoundingClientRect().right - (window.innerWidth - Math.min(420, window.innerWidth))) : 0;
    engineRef.current?.setRightInset(covered);
  }, [benchOpen]);

  useEffect(() => {
    if (sproutRequest) setSprout(sproutRequest.target);
  }, [sproutRequest]);

  useEffect(() => setPurposeDraft(purpose), [purpose]);

  const project = projects.find((p) => p.id === branchId) || null;
  useEffect(() => {
    if ((panel === 'branch' || panel === 'fruit') && !project) setPanel('overview');
  }, [panel, project]);

  const experience = trunkSegments.find((s) => s.id === expId) || null;
  useEffect(() => {
    setExpDraft(experience?.description || '');
    if (panel === 'experience') setTitleDraft(experience?.title || '');
  }, [experience?.id, panel]);
  const passion = roots.find((r) => r.id === rootSel) || null;
  useEffect(() => {
    setRootDraft(passion?.description || '');
    if (panel === 'passion') setTitleDraft(passion?.title || '');
  }, [passion?.id, panel]);
  useEffect(() => {
    if ((panel === 'passion' && !passion) || (panel === 'experience' && !experience)) setPanel('overview');
  }, [panel, passion, experience]);

  const fruit = achievements.find((a) => a.id === fruitId) || null;
  useEffect(() => setFruitLink(fruit?.link || ''), [fruit?.id]);

  const zoomOut = () => {
    engineRef.current?.zoomTo(null);
    setPanel('overview');
    setBenchOpen(false);
    setLeafId(null);
  };

  const onSprouted = (result: SproutResult) => {
    setSprout(null);
    if (result.kind === 'root') {
      setRootSel(result.id);
      setPanel('passion');
      return;
    }
    if (result.kind === 'trunk') {
      setExpId(result.id);
      setPanel('experience');
      return;
    }
    if (result.kind === 'branch' && result.edited) {
      openBranch(result.id);
      return;
    }
    if (result.kind === 'branch') {
      // zoom out so the new branch can be seen growing
      engineRef.current?.zoomTo(null);
      openBranch(result.id);
    } else if (result.kind === 'leaf') {
      openBranch(result.projectId);
      engineRef.current?.zoomTo(result.projectId);
      setLeafId(result.id);
      setBenchOpen(true);
    } else {
      setBranchId(result.projectId);
      setFruitId(result.id);
      setPanel('fruit');
      setBenchOpen(false);
      engineRef.current?.zoomTo(result.projectId);
    }
  };

  const savePurpose = () => {
    setPurpose(purposeDraft.trim());
    setEditingPurpose(false);
  };

  const openExperience = (id: string) => {
    setExpId(id);
    setPanel('experience');
    setBenchOpen(false);
    if (zoomed) engineRef.current?.zoomTo(null);
  };
  const openPassion = (id: string) => {
    setRootSel(id);
    setPanel('passion');
    setBenchOpen(false);
    if (zoomed) engineRef.current?.zoomTo(null);
  };
  const saveTitle = (current: string, save: (title: string) => void) => {
    const t = titleDraft.trim();
    if (t && t !== current) save(t);
    else setTitleDraft(current);
  };

  const renderPassion = () => {
    if (!passion) return null;
    const fed = projects.filter((p) => p.rootId === passion.id && !p.deletedAt);
    return (
      <>
        <p className="lt-crumb">
          <button className="lt-link" onClick={() => setPanel('overview')}>
            Tu árbol
          </button>{' '}
          · raíz · pasión
        </p>
        <label className="lt-field lt-title-field">
          Nombre
          <input
            value={titleDraft}
            maxLength={40}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => saveTitle(passion.title, (title) => updateCoreRoot({ ...passion, title }))}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        </label>
        <label className="lt-field">
          Por qué te mueve
          <textarea
            value={rootDraft}
            placeholder="Qué te da, desde cuándo, qué te gustaría que creciera de aquí…"
            onChange={(e) => setRootDraft(e.target.value)}
            onBlur={() => rootDraft !== passion.description && updateCoreRoot({ ...passion, description: rootDraft })}
          />
        </label>
        <p className="lt-note">Este contexto queda guardado con tu árbol: más adelante servirá para que una IA entienda qué te mueve.</p>
        <h3>Ramas que alimenta</h3>
        {fed.length ? (
          <ul className="lt-list">
            {fed.map((p) => (
              <li
                key={p.id}
                className="lt-click"
                tabIndex={0}
                onClick={() => {
                  openBranch(p.id);
                  engineRef.current?.zoomTo(p.id);
                }}
              >
                <span className="nm">{p.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="lt-plain">Ninguna todavía. Se elige al brotar o editar una rama.</p>
        )}
        <div className="lt-acts">
          <button className="lt-btn" onClick={() => setPanel('overview')}>
            ← Volver
          </button>
          <button
            className="lt-btn danger"
            onClick={async () => (await confirmAction(`¿Quitar la raíz «${passion.title}»?`)) && (deleteCoreRoot(passion.id), setPanel('overview'))}
          >
            Quitar raíz
          </button>
        </div>
      </>
    );
  };

  const renderOverview = () => (
    <>
      <p className="lt-crumb">Tu árbol</p>
      {editingPurpose ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            savePurpose();
          }}
        >
          <label className="lt-field">
            Propósito (el sol del árbol)
            <input value={purposeDraft} maxLength={40} autoFocus onChange={(e) => setPurposeDraft(e.target.value)} onBlur={savePurpose} />
          </label>
        </form>
      ) : (
        <h2>
          {purpose || 'Sin propósito todavía'}{' '}
          <button className="lt-link" style={{ fontSize: 14 }} onClick={() => setEditingPurpose(true)}>
            {purpose ? 'cambiar' : 'escribirlo'}
          </button>
        </h2>
      )}
      <p className="lt-last">
        {treeProjects.length} {treeProjects.length === 1 ? 'rama' : 'ramas'} · {currentTasks.filter((t) => !isDone(t)).length} tareas abiertas ·{' '}
        {achievements.filter((a) => isFruit(a) && a.harvested).length} frutos cosechados
      </p>
      <button className="lt-cont" onClick={() => setSprout({ kind: 'branch' })}>
        Brotar una rama
        <small>Un proyecto nuevo en el árbol</small>
      </button>
      <h3>Ramas</h3>
      {treeProjects.length ? (
        <ul className="lt-list">
          {treeProjects.map((p) => {
            const tasks = currentTasks.filter((t) => t.projectId === p.id);
            const [label, color] = branchState(p, tasks);
            return (
              <li
                key={p.id}
                className="lt-click"
                tabIndex={0}
                onClick={() => {
                  openBranch(p.id);
                  engineRef.current?.zoomTo(p.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    openBranch(p.id);
                    engineRef.current?.zoomTo(p.id);
                  }
                }}
              >
                <i className="lt-dot" style={{ background: color }} />
                <span className="nm">{p.title}</span>
                <span className="dd">{label}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="lt-plain">Todavía no hay ramas. Brota la primera o importa tu árbol desde un archivo.</p>
      )}
      <h3>Tronco · experiencia</h3>
      {trunkSegments.length ? (
        <ul className="lt-list">
          {trunkSegments.map((t) => (
            <li key={t.id} className="lt-click" tabIndex={0} onClick={() => openExperience(t.id)} onKeyDown={(e) => e.key === 'Enter' && openExperience(t.id)}>
              <i className="lt-dot" style={{ background: '#9c9b92' }} />
              <span className="nm">{t.title}</span>
              {t.yearsOfExperience ? <span className="dd">{t.yearsOfExperience} años</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="lt-plain">Aún no hay experiencia en el tronco.</p>
      )}
      <button className="lt-link" style={{ marginTop: 6 }} onClick={() => setSprout({ kind: 'trunk' })}>
        + Añadir experiencia
      </button>
      <h3>Raíces · pasiones</h3>
      {roots.length ? (
        <ul className="lt-list">
          {roots.map((r) => (
            <li key={r.id} className="lt-click" tabIndex={0} onClick={() => openPassion(r.id)} onKeyDown={(e) => e.key === 'Enter' && openPassion(r.id)}>
              <i className="lt-dot" style={{ background: '#c4463a' }} />
              <span className="nm">{r.title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="lt-plain">Aún no hay raíces.</p>
      )}
      <div className="lt-row-acts" style={{ marginTop: 6, flexWrap: 'wrap' }}>
        <button className="lt-link" onClick={() => setSprout({ kind: 'root' })}>
          + Añadir pasión
        </button>
        <button className="lt-link" onClick={onOpenPassionTest}>
          Descubrirlas con un test de IA
        </button>
      </div>
      <div className="lt-acts">
        <button className="lt-btn" onClick={onOpenConnect}>
          Conectar apps
        </button>
        <button className="lt-btn" onClick={() => onOpenData()}>
          Importar / exportar
        </button>
        <button className="lt-btn full" onClick={onOpenArchive}>
          Abrir el archivo
        </button>
      </div>
    </>
  );

  const renderExperience = () => {
    if (!experience) return null;
    return (
      <>
        <p className="lt-crumb">
          <button className="lt-link" onClick={() => setPanel('overview')}>
            Tu árbol
          </button>{' '}
          · tronco · experiencia
        </p>
        <label className="lt-field lt-title-field">
          Nombre
          <input
            value={titleDraft}
            maxLength={40}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => saveTitle(experience.title, (title) => updateTrunkSegment({ ...experience, title }))}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        </label>
        <p className="lt-last">
          {experience.yearsOfExperience ? `${experience.yearsOfExperience} años · ` : ''}nivel {experience.proficiencyLevel} de 5
        </p>
        <label className="lt-field">
          Contexto
          <textarea
            value={expDraft}
            placeholder="Qué sabes hacer aquí, dónde lo aprendiste, qué has hecho con ello…"
            onChange={(e) => setExpDraft(e.target.value)}
            onBlur={() => expDraft !== experience.description && updateTrunkSegment({ ...experience, description: expDraft })}
          />
        </label>
        <p className="lt-note">Este contexto queda guardado con tu árbol: más adelante servirá para que una IA te ayude con los proyectos que crecen de esta experiencia.</p>
        <div className="lt-acts">
          <label className="lt-field" style={{ marginTop: 0 }}>
            Años
            <input
              type="number"
              min={0}
              max={80}
              value={experience.yearsOfExperience || 0}
              onChange={(e) => updateTrunkSegment({ ...experience, yearsOfExperience: Math.max(0, Math.min(80, Number(e.target.value) || 0)) })}
            />
          </label>
          <label className="lt-field" style={{ marginTop: 0 }}>
            Nivel
            <select value={experience.proficiencyLevel} onChange={(e) => updateTrunkSegment({ ...experience, proficiencyLevel: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button className="lt-btn" onClick={() => setPanel('overview')}>
            ← Volver
          </button>
          <button
            className="lt-btn danger"
            onClick={async () => (await confirmAction(`¿Quitar «${experience.title}» del tronco?`)) && (deleteTrunkSegment(experience.id), setPanel('overview'))}
          >
            Quitar del tronco
          </button>
        </div>
      </>
    );
  };

  const renderBranch = (p: ProjectBranch) => {
    const tasks = currentTasks.filter((t) => t.projectId === p.id);
    const fruits = achievements.filter((a) => isFruit(a) && a.projectId === p.id);
    const [label, color] = branchState(p, tasks);
    const open = tasks.filter((t) => !isDone(t)).sort((a, b) => daysSince(a.lastActivityAt) - daysSince(b.lastActivityAt));
    const current = open[0] || null;
    const app = connections.find((c) => c.id === p.appId);
    const url = continueUrl(p, current, connections);
    const lastWork = Math.min(99, ...tasks.map((t) => daysSince(t.lastActivityAt)));
    const root = roots.find((r) => r.id === p.rootId);
    const byAge = (a: ProjectStageLeaf, b: ProjectStageLeaf) =>
      Number(isDone(a)) - Number(isDone(b)) || daysSince(a.lastActivityAt) - daysSince(b.lastActivityAt);
    // Leaves of a twig are listed right under it.
    const parentOf = (t: ProjectStageLeaf) => twigParent(t, tasks);
    const sorted = tasks
      .filter((t) => !parentOf(t))
      .sort(byAge)
      .flatMap((t) => [t, ...tasks.filter((k) => parentOf(k) === t.id).sort(byAge)]);
    return (
      <>
        <p className="lt-crumb">
          <button className="lt-link" onClick={zoomOut}>
            Tu árbol
          </button>{' '}
          · rama
        </p>
        <h2>{p.title}</h2>
        <span className="lt-state">
          <i className="lt-dot" style={{ background: color }} />
          {label}
        </span>
        <p className="lt-last">
          {p.sproutedFrom ? `Brotó del fruto ${p.sproutedFrom} · ` : ''}
          {p.grownFrom && projects.some((o) => o.id === p.grownFrom) ? `Creció de una ramita de ${projects.find((o) => o.id === p.grownFrom)?.title} · ` : ''}
          {tasks.length ? `Último trabajo ${ago(lastWork)}` : 'Sin hojas todavía'}
          {app ? ` en ${app.name}` : ''}
        </p>
        <button className="lt-cont" aria-disabled={!url} onClick={() => url && openExternal(url)}>
          {current ? `Continuar: ${current.title}` : 'Nada abierto'}
          <small>{url ? `Abre ${app?.name || 'el enlace'}` : app ? 'Esta app no tiene enlace todavía' : 'Sin app conectada a esta rama'}</small>
        </button>
        <h3>Hojas (tareas)</h3>
        {sorted.length ? (
          <ul className="lt-list">
            {sorted.map((t) => {
              const [, c] = leafState(t);
              return (
                <li
                  key={t.id}
                  className={`lt-click${benchOpen && leafId === t.id ? ' on' : ''}${isDone(t) ? ' done' : ''}`}
                  tabIndex={0}
                  onClick={() => {
                    setLeafId(t.id);
                    setBenchOpen(true);
                    if (zoomed !== p.id) engineRef.current?.zoomTo(p.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setLeafId(t.id);
                      setBenchOpen(true);
                    }
                  }}
                >
                  <i className="lt-dot" style={{ background: c, ...(parentOf(t) ? { marginLeft: 18 } : {}) }} />
                  <span className="nm">{t.title}</span>
                  <span className="dd">{isDone(t) ? 'hecha' : ago(daysSince(t.lastActivityAt))}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="lt-plain">Sin hojas. Brota la primera tarea.</p>
        )}
        <h3>Frutos (producto final)</h3>
        {fruits.length ? (
          <ul className="lt-list">
            {fruits.map((f) => (
              <li
                key={f.id}
                className="lt-click"
                tabIndex={0}
                onClick={() => {
                  setFruitId(f.id);
                  setPanel('fruit');
                  setBenchOpen(false);
                  if (zoomed !== p.id) engineRef.current?.zoomTo(p.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setFruitId(f.id);
                    setPanel('fruit');
                  }
                }}
              >
                <i className="lt-dot" style={{ background: f.harvested ? '#d34a35' : '#96be50' }} />
                <span className="nm">{f.title}</span>
                <span className="dd">{f.harvested ? 'cosechado' : 'madurando'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="lt-plain">Todavía ninguno.</p>
        )}
        {root && (
          <>
            <h3>Raíz</h3>
            <p className="lt-plain">{root.title}</p>
          </>
        )}
        <div className="lt-acts">
          <button className="lt-btn sprout" onClick={() => setSprout({ kind: 'leaf', projectId: p.id })}>
            Brotar una hoja
          </button>
          <button className="lt-btn sprout" onClick={() => setSprout({ kind: 'fruit', projectId: p.id })}>
            Brotar un fruto
          </button>
          <button className="lt-btn" onClick={() => setBranchStatus(p.id, p.status === 'paused' ? 'active' : 'paused')}>
            {p.status === 'paused' ? 'Reanudar' : 'Pausar'}
          </button>
          <button className="lt-btn" onClick={() => setSprout({ kind: 'branch', editId: p.id })}>
            Editar
          </button>
          <button
            className="lt-btn full"
            onClick={() => {
              setBranchStatus(p.id, 'completed');
              zoomOut();
            }}
          >
            Cerrar la rama (terminada)
          </button>
          <button
            className="lt-btn danger full"
            onClick={() => {
              archiveItem('branch', p.id);
              zoomOut();
            }}
          >
            Enviar la rama al archivo
          </button>
        </div>
      </>
    );
  };

  const renderFruit = (p: ProjectBranch) => {
    if (!fruit) return null;
    const tasks = currentTasks.filter((t) => t.projectId === p.id);
    const made = tasks.filter(isDone).length;
    const fromTask = fruit.fromTaskId ? currentTasks.find((t) => t.id === fruit.fromTaskId) : undefined;
    return (
      <>
        <p className="lt-crumb">
          <button className="lt-link" onClick={() => setPanel('branch')}>
            {p.title}
          </button>{' '}
          · fruto
        </p>
        <h2>{fruit.title}</h2>
        <span className="lt-state">
          <i className="lt-dot" style={{ background: fruit.harvested ? '#d34a35' : '#96be50' }} />
          {fruit.harvested ? 'Cosechado' : 'Madurando'}
        </span>
        <p className="lt-last">{fromTask ? `Salió de la hoja «${fromTask.title}»` : `Fruto de la rama ${p.title}`}</p>
        <button className="lt-cont" aria-disabled={!fruit.link} onClick={() => fruit.link && openExternal(fruit.link)}>
          {fruit.harvested ? 'Abrir el resultado' : 'Ver cómo va'}
          <small>{fruit.link ? 'Abre el enlace del producto' : 'Añade abajo el enlace al resultado'}</small>
        </button>
        <label className="lt-field">
          Enlace al resultado
          <input
            type="url"
            value={fruitLink}
            placeholder="https://…"
            onChange={(e) => setFruitLink(e.target.value)}
            onBlur={() => fruitLink.trim() !== (fruit.link || '') && updateFruit(fruit.id, { link: fruitLink.trim() })}
          />
        </label>
        <h3>Cómo creció</h3>
        <p className="lt-plain">
          {made} {made === 1 ? 'hoja hecha' : 'hojas hechas'} en esta rama, {tasks.length - made} abiertas.
        </p>
        {fruit.harvested ? (
          <>
            <h3>Hacer brotar una rama nueva</h3>
            <p className="lt-plain">Un fruto cosechado lleva semilla: una segunda edición, un curso o una versión en otro formato.</p>
          </>
        ) : (
          <>
            <h3>Cuando esté listo</h3>
            <p className="lt-plain">Al cosecharlo podrás hacer brotar ramas nuevas a partir de él.</p>
          </>
        )}
        <div className="lt-acts">
          {fruit.harvested ? (
            <button className="lt-btn sprout full" onClick={() => setSprout({ kind: 'branch', fromFruitId: fruit.id })}>
              Brotar una rama de este fruto
            </button>
          ) : (
            <button className="lt-btn full" onClick={() => setFruitHarvested(fruit.id, true)}>
              Marcar como cosechado
            </button>
          )}
          <button className="lt-btn" onClick={() => setPanel('branch')}>
            ← Volver
          </button>
          <button
            className="lt-btn danger"
            onClick={() => {
              archiveItem('fruit', fruit.id);
              setPanel('branch');
            }}
          >
            Al archivo
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="lt">
      <div
        className={`lt-fig${dragging ? ' drag' : ''}`}
        ref={figRef}
        onDragOver={(e) => {
          if (!Array.from(e.dataTransfer.types).includes('Files')) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
        onDrop={onDropFile}
      >
        <canvas ref={canvasRef} aria-label="Árbol de proyectos: haz clic en una rama para acercarte" role="img" />
        {zoomed && (
          <button className="lt-back" onClick={zoomOut}>
            ← Ver el árbol entero
          </button>
        )}
        <div className="lt-tip" ref={tipRef} hidden />
        {dragging && <div className="lt-dropzone">Suelta aquí tu archivo de Productivitree</div>}
        {guide && (
          <TreeGuide
            step={guide.step}
            done={stepDone}
            leftover={leftover.count}
            onStep={(step) => onGuide({ ...guide, step })}
            onHint={setHint}
            onPickFile={(text) => onOpenData(text)}
            onRemoveLeftover={() => removeExampleParts(leftover)}
            onClose={() => onGuide(null)}
          />
        )}
        {!treeProjects.length && !guide && (
          <div className="lt-empty">
            <p>Tu árbol todavía no tiene ramas.</p>
            <div className="lt-acts" style={{ marginTop: 0 }}>
              <button className="lt-btn sprout" onClick={() => setSprout({ kind: 'branch' })}>
                Brotar una rama
              </button>
              <button className="lt-btn" onClick={() => onOpenData()}>
                Importar un archivo
              </button>
            </div>
          </div>
        )}
      </div>
      <aside className="lt-panel" aria-live="polite">
        {panel === 'passion' && passion
          ? renderPassion()
          : panel === 'experience' && experience
          ? renderExperience()
          : panel === 'branch' && project
            ? renderBranch(project)
            : panel === 'fruit' && project && fruit
              ? renderFruit(project)
              : renderOverview()}
      </aside>
      <TaskBench
        taskId={leafId}
        open={benchOpen}
        onClose={() => setBenchOpen(false)}
        onSproutFruit={(pId, tId) => setSprout({ kind: 'fruit', projectId: pId, fromTaskId: tId })}
        onOpenFruit={(pId, fId) => {
          setBenchOpen(false);
          setBranchId(pId);
          setFruitId(fId);
          setPanel('fruit');
        }}
        onOpenTask={(tId) => {
          setLeafId(tId);
          setBenchOpen(true);
        }}
        onPromoted={(newBranchId) => {
          // zoom out so the new branch can be seen growing out of the trunk
          setBenchOpen(false);
          setLeafId(null);
          engineRef.current?.zoomTo(null);
          openBranch(newBranchId);
        }}
      />
      <SproutDialog target={sprout} onClose={() => setSprout(null)} onDone={onSprouted} />
    </div>
  );
};

export default LivingTreeView;
