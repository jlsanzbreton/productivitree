import { createPortal } from 'react-dom';
import React, { useContext, useEffect, useState } from 'react';
import './livingTree.css';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { AppConnection, AppConnectionKind, AppTrackingMode } from '../../types';
import { DESKTOP_ACTIVITY_ORIGIN, buildActivityLink, fillUrlTemplate, isSafeOpenUrl } from '../../utils/activityLink';
import { confirmAction, isDesktop } from '../../services/desktop';
import { connectWritersLens, disconnectWritersLens, writersLensAccount, writersLensConfigured } from '../../services/writersLens';
import { parseYoutubeChannelId } from '../../utils/sources';
import { openExternal } from './treeHelpers';

const PRESETS: Array<{ kind: AppConnectionKind; name: string; hint: string; url: string }> = [
  { kind: 'webapp', name: '', hint: 'Una app web tuya o de otros', url: 'https://' },
  { kind: 'bear', name: 'Bear', hint: 'Notas con etiquetas por proyecto', url: 'bear://x-callback-url/search?tag={etiqueta}' },
  { kind: 'github', name: 'GitHub', hint: 'Repositorios de código', url: 'https://github.com/' },
  { kind: 'docs', name: 'Google Docs', hint: 'Documentos compartidos', url: 'https://docs.google.com/document/u/0/?q={rama}' },
  { kind: 'writerslens', name: 'Writer’s Lens', hint: 'Tu app de escritura: se riega sola', url: 'https://' },
  { kind: 'youtube', name: 'YouTube', hint: 'Tu canal: cada vídeo publicado es un fruto', url: '' },
  { kind: 'other', name: '', hint: 'Cualquier app que se abra con un enlace', url: '' },
];

/** Kinds that Productivitree checks on its own (Mac app). */
const AUTO_KINDS: AppConnectionKind[] = ['writerslens', 'youtube'];
const studioUrl = (channelId: string) => `https://studio.youtube.com/channel/${channelId}`;

const STEP_TITLES = ['Elige la app', 'Cómo se abre', 'Cómo se anota lo que haces', 'En qué ramas la usas'];

type Draft = { id?: string; kind: AppConnectionKind; name: string; openUrl: string; tracking: AppTrackingMode; branchIds: string[]; channelId: string };
const emptyDraft = (): Draft => ({ kind: 'webapp', name: '', openUrl: 'https://', tracking: 'manual', branchIds: [], channelId: '' });

/** Step by step set-up of the apps where the work happens: how to open them and how they report activity. */
const ConnectAppsWizard: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { connections, projects, saveConnection, removeConnection, updateProjectBranch } = useContext(AppContext) as AppContextType;
  const [step, setStep] = useState(-1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [copied, setCopied] = useState(false);
  const [wlAccount, setWlAccount] = useState<string | null>(null);
  const [wlBusy, setWlBusy] = useState(false);
  const [wlMsg, setWlMsg] = useState('');

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
    if (!isOpen || draft.kind !== 'writerslens') return;
    writersLensAccount().then(setWlAccount).catch(() => setWlAccount(null));
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

  const edit = (app: AppConnection) => {
    setDraft({
      id: app.id,
      kind: app.kind,
      name: app.name,
      openUrl: app.openUrl,
      tracking: app.tracking,
      branchIds: projects.filter((p) => p.appId === app.id).map((p) => p.id),
      channelId: app.channelId || '',
    });
    setStep(1);
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
            <p className="lt-sub">¿Dónde haces el trabajo? Elige lo más parecido; en el paso siguiente le pones nombre.</p>
            <div className="lt-choices">
              {PRESETS.map((preset) => (
                <button
                  key={preset.kind}
                  type="button"
                  className={`lt-choice${draft.kind === preset.kind ? ' on' : ''}`}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      kind: preset.kind,
                      name: preset.name || (d.kind === preset.kind ? d.name : ''),
                      openUrl: preset.url,
                      tracking: AUTO_KINDS.includes(preset.kind) ? 'auto' : d.tracking === 'auto' ? 'manual' : d.tracking,
                    }))
                  }
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
                Enlace para abrirla
                <input value={draft.openUrl} placeholder="https://…" onChange={(e) => setDraft({ ...draft, openUrl: e.target.value })} />
              </label>
            )}
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
              <p className="lt-note">
                Conectado como <b>{wlAccount}</b>.{' '}
                <button className="lt-link" onClick={disconnectWl}>
                  Desconectar
                </button>
              </p>
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
            <button className="lt-btn" onClick={() => (step === 0 ? (connections.length ? setStep(-1) : onClose()) : setStep(step - 1))}>
              {step === 0 ? 'Cancelar' : '← Atrás'}
            </button>
            {step < 3 ? (
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
