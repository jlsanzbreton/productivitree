import { useCallback, useContext, useEffect, useRef } from 'react';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import type { AppConnection } from '../../types';
import { fetchYoutubeFeed, isDesktop } from '../../services/desktop';
import { readWritersLens } from '../../services/writersLens';
import { describeWritersLensEdit, diffWritersLens, newVideos, parseYoutubeFeed, WritersLensEdit } from '../../utils/sources';

/** A Writer's Lens project whose branch is not known yet: ask once ("¿Estabas con…?"). */
export interface SourceQuestion {
  connectionId: string;
  edit: WritersLensEdit;
}

const EVERY_MS = 15 * 60 * 1000;
const ON_FOCUS_AFTER_MS = 5 * 60 * 1000;
export const WRITERS_LENS_APP = 'Writer’s Lens';

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Checks the automatic sources (Mac app): every 15 minutes, on start and when coming
 * back to the window. YouTube videos become fruits; Writer's Lens edits water a leaf.
 */
export const useAutoSources = ({ onToast, onAsk }: { onToast: (text: string) => void; onAsk: (question: SourceQuestion) => void }) => {
  const ctx = useContext(AppContext) as AppContextType;
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const handlers = useRef({ onToast, onAsk });
  handlers.current = { onToast, onAsk };
  const running = useRef(false);
  const lastRun = useRef(0);
  const asked = useRef(new Set<string>());

  const branchFor = (connection: AppConnection) =>
    ctxRef.current.projects.find((p) => p.appId === connection.id && !p.deletedAt && p.status !== 'completed');

  const checkYoutube = async (connection: AppConnection) => {
    const { patchSourceState, sproutFruit, achievements } = ctxRef.current;
    if (!connection.channelId) throw new Error('Falta el ID del canal.');
    const videos = parseYoutubeFeed(await fetchYoutubeFeed(connection.channelId));
    const fresh = newVideos(videos, connection.sourceState?.seenVideos);
    const branch = branchFor(connection);
    if (fresh.length && !branch) throw new Error('Marca en qué rama va el canal para recoger sus vídeos como frutos.');
    fresh.forEach((video) => {
      const already = achievements.some((a) => !a.deletedAt && a.link && a.link.includes(video.videoId));
      if (!already && branch) sproutFruit(branch.id, { title: video.title, harvested: true, link: video.url });
    });
    if (fresh.length && branch) {
      handlers.current.onToast(
        fresh.length === 1 ? `Nuevo fruto en ${branch.title}: «${fresh[0].title}».` : `${fresh.length} vídeos nuevos recogidos como frutos en ${branch.title}.`
      );
    }
    const seen = [...new Set([...(connection.sourceState?.seenVideos || []), ...fresh.map((v) => v.videoId)])].slice(-500);
    patchSourceState(connection.id, { seenVideos: seen, checkedAt: new Date().toISOString(), error: undefined });
  };

  const checkWritersLens = async (connection: AppConnection) => {
    const { patchSourceState, recordExternalActivity, projects } = ctxRef.current;
    const rows = await readWritersLens();
    const { snapshot, edits } = diffWritersLens(connection.sourceState?.sections, rows);
    patchSourceState(connection.id, { sections: snapshot, checkedAt: new Date().toISOString(), error: undefined });
    const map = connection.sourceState?.projectBranch || {};
    edits.forEach((edit) => {
      const branchId = map[edit.projectId];
      if (branchId === '') return; // "not a project": never water
      const branch = branchId ? projects.find((p) => p.id === branchId && !p.deletedAt) : undefined;
      if (!branch) {
        const key = `${connection.id}:${edit.projectId}`;
        if (asked.current.has(key)) return;
        asked.current.add(key);
        handlers.current.onAsk({ connectionId: connection.id, edit });
        return;
      }
      const result = recordExternalActivity({ branch: branch.id, task: edit.projectName, app: WRITERS_LENS_APP, note: describeWritersLensEdit(edit) });
      if (result.ok) handlers.current.onToast(`Writer’s Lens regó «${edit.projectName}» en ${branch.title}.`);
    });
  };

  const runNow = useCallback(async () => {
    if (!isDesktop() || running.current) return;
    running.current = true;
    lastRun.current = Date.now();
    try {
      const sources = ctxRef.current.connections.filter((c) => c.tracking === 'auto' && (c.kind === 'youtube' || c.kind === 'writerslens'));
      for (const connection of sources) {
        try {
          if (connection.kind === 'youtube') await checkYoutube(connection);
          else await checkWritersLens(connection);
        } catch (error) {
          ctxRef.current.patchSourceState(connection.id, { error: errorText(error), checkedAt: new Date().toISOString() });
        }
      }
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isDesktop()) return undefined;
    const first = window.setTimeout(runNow, 4000);
    const timer = window.setInterval(runNow, EVERY_MS);
    const onFocus = () => Date.now() - lastRun.current > ON_FOCUS_AFTER_MS && runNow();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [runNow]);

  return { runNow };
};
