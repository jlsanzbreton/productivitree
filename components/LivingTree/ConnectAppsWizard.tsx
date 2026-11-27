import { createPortal } from 'react-dom';
import React, { useContext, useEffect, useState } from 'react';
import './livingTree.css';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { AppConnection, AppConnectionKind, AppTrackingMode } from '../../types';
import { DESKTOP_ACTIVITY_ORIGIN, buildActivityLink, fillUrlTemplate, isSafeOpenUrl } from '../../utils/activityLink';
import { confirmAction, isDesktop } from '../../services/desktop';
import { connectWritersLens, disconnectWritersLens, readWritersLens, writersLensAccount, writersLensConfigured } from '../../services/writersLens';
import { parseYoutubeChannelId } from '../../utils/sources';
import { openExternal } from './treeHelpers';
import { WRITERS_LENS_APP } from './useAutoSources';

const PRESETS: Array<{ kind: AppConnectionKind; name: string; hint: string; url: string }> = [
  { kind: 'writerslens', name: 'Writer’s Lens', hint: 'Se riega sola: entras con GitHub y listo', url: '' },
  { kind: 'youtube', name: 'YouTube', hint: 'Se riega sola: cada vídeo publicado es un fruto', url: '' },
  { kind: 'webapp', name: '', hint: 'Una app web tuya o de otros', url: 'https://' },
  { kind: 'bear', name: 'Bear', hint: 'Notas con etiquetas por proyecto', url: 'bear://x-callback-url/search?tag={etiqueta}' },
  { kind: 'github', name: 'GitHub', hint: 'Repositorios de código', url: 'https://github.com/' },
  { kind: 'docs', name: 'Google Docs', hint: 'Documentos compartidos', url: 'https://docs.google.com/document/u/0/?q={rama}' },
  { kind: 'other', name: '', hint: 'Cualquier app que se abra con un enlace', url: '' },
];

/** Kinds that Productivitree checks on its own (Mac app). */
const AUTO_KINDS: AppConnectionKind[] = ['writerslens', 'youtube'];
const studioUrl = (channelId: string) => `https://studio.youtube.com/channel/${channelId}`;

/**
 * An app added by hand (or from a tree file) as a plain link, whose name says it is one of
 * the sources that can water on their own. Offered a one-click switch to the automatic kind.
 */
const autoKindFor = (app: AppConnection): AppConnectionKind | null => {
  if (AUTO_KINDS.includes(app.kind)) return null;
  if (/writer.?s\s*lens/i.test(app.name)) return 'writerslens';
  if (/youtube/i.test(app.name)) return 'youtube';
  return null;
};

const STEP_TITLES = ['Elige la app', 'Cómo se abre', 'Cómo se anota lo que haces', 'En qué ramas la usas'];

type Draft = {
  id?: string;
  kind: AppConnectionKind;
  name: string;
  openUrl: string;
  tracking: AppTrackingMode;
  branchIds: string[];
  channelId: string;
  /** Writer's Lens: project id → branch id ('' = none). Missing = ask the first time. */
  projectBranch: Record<string, string>;
  /** Writer's Lens projects already watered with the words written before connecting. */
  firstWatered: string[];
};
const emptyDraft = (): Draft => ({ kind: 'webapp', name: '', openUrl: 'https://', tracking: 'manual', branchIds: [], channelId: '', projectBranch: {}, firstWatered: [] });
type WlProject = { id: string; name: string; words: number };

/** Step by step set-up of the apps where the work happens: how to open them and how they report activity. */
const ConnectAppsWizard: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { connections, projects, saveConnection, removeConnection, updateProjectBranch, patchSourceState, recordExternalActivity } = useContext(
    AppContext
  ) as AppContextType;
  const [step, setStep] = useState(-1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [copied, setCopied] = useState(false);
  const [wlAccount, setWlAccount] = useState<string | null>(null);
  const [wlBusy, setWlBusy] = useState(false);
  const [wlMsg, setWlMsg] = useState('');
  const [wlProjects, setWlProjects] = useState<WlProject[] | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    setStep(connections.length ? -1 : 0);
    setDraft(emptyDraft());
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // Open fresh each time the wizard is shown.
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || draft.kind !== 'writerslens') return undefined;
    let alive = true;
    const refresh = () =>
      writersLensAccount()
        .then((account) => {
          if (!alive) return;
          setWlAccount(account);
          if (!account) return setWlProjects(null);
          // Shows which projects it can see, so it is clear the connection works.
          return readWritersLens().then((rows) => {
            if (!alive) return;
            const byId = new Map<string, WlProject>();
            rows.forEach((r) => {
              const item = byId.get(r.projectId) || { id: r.projectId, name: r.projectName, words: 0 };
              item.words += r.words;
              byId.set(r.projectId, item);
            });
            setWlProjects([...byId.values()]);
          });
        })
        .catch(() => alive && setWlProjects(null));
    void refresh();
    // Coming back from signing in with GitHub in the browser.
    window.addEventListener('focus', refresh);
    return () => {
      alive = false;
      window.removeEventListener('focus', refresh);
    };
  }, [isOpen, draft.kind, step]);

  if (!isOpen) return null;
  const isAuto = AUTO_KINDS.includes(draft.kind);
  const channelId = parseYoutubeChannelId(draft.channelId);

  // In the Mac app, links go to the app itself (productivitree://), not to a web address.
  const origin = isDesktop() ? DESKTOP_ACTIVITY_ORIGIN : typeof window !== 'undefined' ? window.location.origin : 'https://productivitree.app';
  const sample = projects[0];
  const activityLink = buildActivityLink(origin, { app: draft.name || 'Mi app' });
  const sampleLink = sample ? buildActivityLink(origin, { branch: sample.title, task: 'Nombre de la tarea', app: draft.name || 'Mi app' }) : '';
  const testUrl = fillUrlTemplate(draft.openUrl, { branch: sample?.title || 'Mi proyecto', task: 'Primera tarea' });
  const canNext =
    step === 0
      ? true
      : step === 1
        ? Boolean(draft.name.trim()) && (!draft.openUrl.trim() || isSafeOpenUrl(draft.openUrl)) && (draft.kind !== 'youtube' || Boolean(channelId))
        : true;

  const connectWl = async () => {
    setWlBusy(true);
    setWlMsg('');
    try {
      await connectWritersLens();
      setWlMsg('Se ha abierto el navegador: entra con GitHub y vuelve aquí.');
    } catch (error) {
      setWlMsg(error instanceof Error ? error.message : String(error));
    } finally {
      setWlBusy(false);
    }
  };
  const disconnectWl = async () => {
    await disconnectWritersLens();
    setWlAccount(null);
    setWlMsg('Desconectado.');
  };

  const edit = (app: AppConnection, makeAuto?: AppConnectionKind) => {
    setDraft({
      id: app.id,
      kind: makeAuto || app.kind,
      name: app.name,
      openUrl: app.openUrl,
      tracking: makeAuto ? 'auto' : app.tracking,
      branchIds: projects.filter((p) => p.appId === app.id).map((p) => p.id),
      channelId: app.channelId || '',
      projectBranch: { ...(app.sourceState?.projectBranch || {}) },
      firstWatered: [...(app.sourceState?.firstWatered || [])],
    });
    // Writer's Lens goes straight to "Conectar con GitHub"; YouTube first needs the channel ID.
    setStep((makeAuto || app.kind) === 'writerslens' ? 2 : 1);
  };

  const save = () => {
    const openUrl = draft.kind === 'youtube' && channelId ? studioUrl(channelId) : draft.openUrl.trim();
    const id = saveConnection({
      id: draft.id,
      kind: draft.kind,
      name: draft.name.trim(),
      openUrl,
      tracking: isAuto ? 'auto' : draft.tracking,
      ...(draft.kind === 'youtube' && channelId ? { channelId } : {}),
    });
    if (draft.kind === 'writerslens') patchSourceState(id, { projectBranch: draft.projectBranch, firstWatered: draft.firstWatered });
    projects.forEach((p) => {
      const wants = draft.branchIds.includes(p.id);
      if (wants && p.appId !== id) updateProjectBranch({ ...p, appId: id });
      if (!wants && p.appId === id) updateProjectBranch({ ...p, appId: undefined });
    });
    setStep(-1);
    setDraft(emptyDraft());
  };

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      },
      () => setCopied(false)
    );
  };

  return createPortal(
    <div className="lt-dialog-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lt-dialog" role="dialog" aria-modal="true" aria-labelledby="lt-apps-title">
        <button className="lt-x" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <h2 id="lt-apps-title">{step < 0 ? 'Tus apps' : `Conectar una app · ${STEP_TITLES[step]}`}</h2>
        {step >= 0 && (
          <div className="lt-steps" aria-hidden="true">
            {STEP_TITLES.map((t, i) => (
              <span key={t} className={i <= step ? 'on' : ''} />
            ))}
          </div>
        )}

        {step < 0 && (
          <>
            <p className="lt-sub">Las apps donde trabajas en cada rama. «Continuar en…» las abre, y pueden avisar al árbol de lo que haces.</p>
            {connections.length ? (
              <ul className="lt-list">
                {connections.map((app) => (
                  <li key={app.id}>
                    <span className="nm">
                      {app.name}
                      <span className="dd" style={{ display: 'block' }}>
                        {projects.filter((p) => p.appId === app.id).length} ramas ·{' '}
                        {app.tracking === 'auto' ? 'se riega sola' : app.tracking === 'link' ? 'avisa con enlace' : 'anotas a mano'}
                        {app.tracking === 'auto' && app.sourceState?.error ? <span style={{ color: '#b8432f' }}> · {app.sourceState.error}</span> : null}
                        {app.tracking === 'auto' && !app.sourceState?.error && app.sourceState?.checkedAt ? (
                          <> · mirado {new Date(app.sourceState.checkedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</>
                        ) : null}
                      </span>
                    </span>
                    <span className="lt-row-acts">
                      {autoKindFor(app) && (
                        <button className="lt-link" onClick={() => edit(app, autoKindFor(app) || undefined)}>
                          Hacer que se riegue sola
                        </button>
                      )}
                      <button className="lt-link" onClick={() => edit(app)}>
                        Editar
                      </button>
                      <button
                        className="lt-link"
                        style={{ color: '#b8432f' }}
                        onClick={async () => (await confirmAction(`¿Quitar ${app.name}? Las ramas se quedan, solo pierden el enlace.`)) && removeConnection(app.id)}
                      >
                        Quitar
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lt-plain">Aún no hay ninguna.</p>
            )}
            <div className="lt-acts">
              <button className="lt-btn" onClick={onClose}>
                Cerrar
              </button>
              <button className="lt-btn sprout" onClick={() => setStep(0)}>
                Conectar una app
              </button>
            </div>
          </>
        )}

        {step === 0 && (
          <>
            <p className="lt-sub">¿Dónde haces el trabajo? Pulsa la que sea. Writer’s Lens y YouTube se conectan solas; para las demás le pones nombre y enlace.</p>
            <div className="lt-choices">
              {PRESETS.map((preset) => (
                <button
                  key={preset.kind}
                  type="button"
                  className={`lt-choice${draft.kind === preset.kind ? ' on' : ''}`}
                  onClick={() => {
                    // Only one Writer's Lens: if it is already there, open it instead of adding another.
                    const existing = preset.kind === 'writerslens' ? connections.find((c) => c.kind === 'writerslens') : undefined;
                    if (existing) {
                      edit(existing, 'writerslens');
                      return;
                    }
                    setDraft((d) => ({
                      ...d,
                      kind: preset.kind,
                      name: preset.name || (d.kind === preset.kind ? d.name : ''),
                      openUrl: preset.url,
                      tracking: AUTO_KINDS.includes(preset.kind) ? 'auto' : d.tracking === 'auto' ? 'manual' : d.tracking,
                    }));
                    // One click: Writer's Lens needs no link, so it goes straight to "Conectar con GitHub".
                    setStep(preset.kind === 'writerslens' ? 2 : 1);
                  }}
                >
                  <b>{preset.kind === 'webapp' ? 'App web' : preset.kind === 'other' ? 'Otra' : preset.name}</b>
                  <span>{preset.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <label className="lt-field">
              Nombre
              <input value={draft.name} maxLength={40} placeholder="Por ejemplo: mi editor de textos" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            {draft.kind === 'youtube' ? (
              <>
                <label className="lt-field">
                  ID del canal
                  <input value={draft.channelId} placeholder="UC…" onChange={(e) => setDraft({ ...draft, channelId: e.target.value })} />
                </label>
                <p className="lt-note">Empieza por UC (o pega el enlace del canal). «Continuar» abrirá YouTube Studio.</p>
                {draft.channelId.trim() && !channelId && <div className="lt-msg err">Ese ID no parece de un canal.</div>}
              </>
            ) : (
              <label className="lt-field">
                Enlace para abrirla <span className="lt-note" style={{ display: 'inline', margin: 0 }}>(opcional)</span>
                <input value={draft.openUrl} placeholder="https://…" onChange={(e) => setDraft({ ...draft, openUrl: e.target.value })} />
              </label>
            )}
            <p className="lt-note">
              Solo sirve para el botón «Continuar en…»: la dirección donde abres {draft.name.trim() || 'la app'}, la misma que pones en el navegador. Si
              la dejas vacía, todo lo demás funciona igual.
              {draft.kind === 'writerslens' && ' La conexión con tu cuenta (GitHub) está en el paso siguiente, no aquí.'}
            </p>
            <p className="lt-note">
              Puedes usar {'{rama}'}, {'{tarea}'} y {'{etiqueta}'}: se cambian por el proyecto y la tarea al pulsar «Continuar». Cada hoja puede además
              llevar su propio enlace directo.
            </p>
            {draft.openUrl.trim() && !isSafeOpenUrl(draft.openUrl) && <div className="lt-msg err">Ese enlace no parece válido.</div>}
            {testUrl && isSafeOpenUrl(testUrl) && (
              <p className="lt-note">
                Ejemplo: <span className="lt-code">{testUrl}</span>{' '}
                <button className="lt-link" onClick={() => openExternal(testUrl)}>
                  Probar
                </button>
              </p>
            )}
          </>
        )}

        {step === 2 && draft.kind === 'youtube' && (
          <>
            <p className="lt-sub">Se riega sola.</p>
            <p className="lt-note">
              La app de Mac mira el canal cada 15 minutos (su lista pública de vídeos, sin claves ni contraseñas). Cada vídeo nuevo aparece como fruto
              recogido en la rama que marques en el paso siguiente.
            </p>
            {!isDesktop() && <div className="lt-msg err">Esto funciona en la app de Mac; en el navegador no se consulta.</div>}
          </>
        )}

        {step === 2 && draft.kind === 'writerslens' && (
          <>
            <p className="lt-sub">Se riega sola.</p>
            <p className="lt-note">
              Cada 15 minutos la app mira qué secciones cambiaron en Writer’s Lens y riega la hoja de ese proyecto (con el nombre de la sección y las
              palabras nuevas). Solo lee nombres y una huella del texto, nunca el texto. La primera vez que escribas en un proyecto te preguntará a qué
              rama pertenece.
            </p>
            {!isDesktop() ? (
              <div className="lt-msg err">Esto funciona en la app de Mac.</div>
            ) : !writersLensConfigured() ? (
              <div className="lt-msg err">Falta configurar Writer’s Lens en esta copia de la app (ver README).</div>
            ) : wlAccount ? (
              <>
                <p className="lt-note">
                  Conectado como <b>{wlAccount}</b>.{' '}
                  <button className="lt-link" onClick={disconnectWl}>
                    Desconectar
                  </button>
                </p>
                {wlProjects && !wlProjects.length && (
                  <p className="lt-note">Esta cuenta no tiene proyectos en Writer’s Lens. ¿Es la misma cuenta de GitHub con la que entras allí?</p>
                )}
                {wlProjects && wlProjects.length > 0 && (
                  <>
                    <p className="lt-note">
                      Tus proyectos de Writer’s Lens. Elige qué rama riega cada uno: cuando escribas en él, se anotará en esa rama sin preguntarte.
                    </p>
                    <div className="lt-checks">
                      {wlProjects.map((wp) => {
                        const value = draft.projectBranch[wp.id];
                        return (
                          <label key={wp.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ flex: 1 }}>
                              {wp.name}
                              <span className="lt-note" style={{ margin: 0 }}>
                                {' '}
                                · {wp.words.toLocaleString('es-ES')} palabras
                              </span>
                            </span>
                            <select
                              className="lt-input"
                              style={{ maxWidth: '50%' }}
                              value={value === undefined ? '?' : value}
                              aria-label={`Rama de ${wp.name}`}
                              onChange={(e) => {
                                const next = { ...draft.projectBranch };
                                if (e.target.value === '?') delete next[wp.id];
                                else next[wp.id] = e.target.value;
                                // The first time a project gets its branch, what was already written waters it once.
                                let firstWatered = draft.firstWatered;
                                if (e.target.value && e.target.value !== '?' && !firstWatered.includes(wp.id) && wp.words > 0) {
                                  const result = recordExternalActivity({
                                    branch: e.target.value,
                                    task: wp.name,
                                    app: WRITERS_LENS_APP,
                                    note: `Primer riego: ${wp.words.toLocaleString('es-ES')} palabras ya escritas`,
                                  });
                                  if (result.ok) {
                                    firstWatered = [...firstWatered, wp.id];
                                    setWlMsg(`«${wp.name}» riega ${projects.find((p) => p.id === e.target.value)?.title || 'su rama'}: primer riego con ${wp.words.toLocaleString('es-ES')} palabras.`);
                                  } else setWlMsg(result.message);
                                }
                                setDraft({ ...draft, projectBranch: next, firstWatered });
                                // Already connected: keep the choice right away, without going through «Guardar».
                                if (connections.some((c) => c.id === draft.id && c.kind === 'writerslens'))
                                  patchSourceState(draft.id as string, { projectBranch: next, firstWatered });
                              }}
                            >
                              <option value="?">Preguntar la primera vez</option>
                              <option value="">No es de ninguna rama</option>
                              {projects
                                .filter((p) => !p.deletedAt && p.status !== 'completed')
                                .map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.title}
                                  </option>
                                ))}
                            </select>
                          </label>
                        );
                      })}
                    </div>
                    <p className="lt-note">
                      Al elegir la rama, lo que ya llevas escrito le da un primer riego (una hoja con el nombre del proyecto). Después, cada vez que
                      escribas, regará esa hoja.
                    </p>
                  </>
                )}
                {connections.find((c) => c.id === draft.id)?.kind !== 'writerslens' && <p className="lt-note">Termina los pasos y pulsa «Guardar» para que empiece a regar.</p>}
              </>
            ) : (
              <div className="lt-acts">
                <button className="lt-btn sprout full" disabled={wlBusy} onClick={connectWl}>
                  Conectar con GitHub (tu cuenta de Writer’s Lens)
                </button>
              </div>
            )}
            {wlMsg && <p className="lt-note">{wlMsg}</p>}
          </>
        )}

        {step === 2 && !isAuto && (
          <>
            <div className="lt-choices">
              <button type="button" className={`lt-choice${draft.tracking === 'manual' ? ' on' : ''}`} onClick={() => setDraft({ ...draft, tracking: 'manual' })}>
                <b>Lo anoto yo</b>
                <span>Con «Trabajé en esto ahora» en cada tarea.</span>
              </button>
              <button type="button" className={`lt-choice${draft.tracking === 'link' ? ' on' : ''}`} onClick={() => setDraft({ ...draft, tracking: 'link' })}>
                <b>La app avisa</b>
                <span>Abriendo un enlace de actividad.</span>
              </button>
            </div>
            {draft.tracking === 'link' && (
              <>
                <p className="lt-note">
                  Al abrir este enlace, el árbol anota que trabajaste en esa tarea (y la crea si no existe). Úsalo desde un Atajo de Apple con una
                  combinación de teclas, o añádelo como botón en tu propia app. Debe abrirse en el navegador donde usas Productivitree.
                </p>
                <span className="lt-code">{activityLink}</span>
                {sampleLink && (
                  <p className="lt-note">
                    Con datos reales: <span className="lt-code">{sampleLink}</span>
                  </p>
                )}
                <div className="lt-acts">
                  <button className="lt-btn full" onClick={() => copy(activityLink)}>
                    {copied ? 'Copiado' : 'Copiar el enlace'}
                  </button>
                </div>
                <p className="lt-note">Opcionales: «nota» (qué hiciste) y «url» (dónde está).</p>
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <p className="lt-sub">Marca las ramas que se trabajan en {draft.name || 'esta app'}.</p>
            {projects.length ? (
              <div className="lt-checks">
                {projects.map((p) => (
                  <label key={p.id}>
                    <input
                      type="checkbox"
                      checked={draft.branchIds.includes(p.id)}
                      onChange={(e) =>
                        setDraft({ ...draft, branchIds: e.target.checked ? [...draft.branchIds, p.id] : draft.branchIds.filter((id) => id !== p.id) })
                      }
                    />
                    {p.title}
                    {p.appId && p.appId !== draft.id ? <span className="lt-note" style={{ margin: 0 }}> · ahora en {connections.find((c) => c.id === p.appId)?.name}</span> : null}
                  </label>
                ))}
              </div>
            ) : (
              <p className="lt-plain">Aún no hay ramas; podrás elegir esta app al brotar una.</p>
            )}
          </>
        )}

        {step >= 0 && (
          <div className="lt-acts">
            <button
              className="lt-btn"
              onClick={() =>
                step === 0 ? (connections.length ? setStep(-1) : onClose()) : setStep(step === 2 && draft.kind === 'writerslens' ? 0 : step - 1)
              }
            >
              {step === 0 ? 'Cancelar' : '← Atrás'}
            </button>
            {step === 0 ? null : step < 3 ? (
              <button className="lt-btn sprout" disabled={!canNext} onClick={() => setStep(step + 1)}>
                Siguiente
              </button>
            ) : (
              <button className="lt-btn sprout" onClick={save}>
                Guardar
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ConnectAppsWizard;
