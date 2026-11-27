// Automatic sources: apps that water the tree on their own (phase 2).
// Pure functions only; the network and the app state live in services/sources.ts.

const YOUTUBE_CHANNEL_RE = /^UC[A-Za-z0-9_-]{22}$/;

/** A YouTube channel id looks like UC + 22 characters. Accepts a channel URL too. */
export const parseYoutubeChannelId = (value) => {
  const text = String(value || '').trim();
  const fromUrl = /youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/.exec(text);
  const id = fromUrl ? fromUrl[1] : text;
  return YOUTUBE_CHANNEL_RE.test(id) ? id : null;
};

const decodeXml = (text) =>
  String(text || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .trim();

const tag = (block, name) => {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(block);
  return match ? decodeXml(match[1]) : '';
};

/**
 * Reads the public Atom feed of a channel (youtube.com/feeds/videos.xml?channel_id=…).
 * @returns {{videoId: string, title: string, published: string, url: string}[]}
 */
export const parseYoutubeFeed = (xml) => {
  const entries = String(xml || '').match(/<entry>[\s\S]*?<\/entry>/g) || [];
  return entries
    .map((block) => {
      const videoId = tag(block, 'yt:videoId');
      return {
        videoId,
        title: tag(block, 'title') || 'Vídeo sin título',
        published: tag(block, 'published'),
        url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
      };
    })
    .filter((video) => video.videoId);
};

/** Videos not seen before, oldest first so fruits appear in publishing order. */
export const newVideos = (videos, seenIds = []) => {
  const seen = new Set(seenIds);
  return videos.filter((video) => !seen.has(video.videoId)).sort((a, b) => a.published.localeCompare(b.published));
};

/**
 * Compares Writer's Lens sections with the previous check. A section counts as written
 * only when its text changed (content hash), because Writer's Lens re-stamps updated_at
 * on every sync. The first check only takes note of where things are.
 *
 * @param {Record<string, {h: string, w: number}> | null | undefined} previous section id → hash and words
 * @param {{sectionId: string, sectionName: string, projectId: string, projectName: string, hash: string, words: number}[]} rows
 * @returns {{snapshot: Record<string, {h: string, w: number}>, edits: {projectId: string, projectName: string, sections: string[], words: number}[]}}
 */
export const diffWritersLens = (previous, rows) => {
  const snapshot = {};
  const byProject = new Map();
  rows.forEach((row) => {
    if (!row.sectionId) return;
    const hash = row.hash || '';
    const words = Number(row.words) || 0;
    snapshot[row.sectionId] = { h: hash, w: words };
    if (!previous) return;
    const before = previous[row.sectionId];
    if (before && before.h === hash) return;
    if (!before && !hash) return; // empty new section: nothing written yet
    const edit = byProject.get(row.projectId) || { projectId: row.projectId, projectName: row.projectName, sections: [], words: 0 };
    if (row.sectionName && !edit.sections.includes(row.sectionName)) edit.sections.push(row.sectionName);
    edit.words += words - (before ? before.w : 0);
    byProject.set(row.projectId, edit);
  });
  return { snapshot, edits: [...byProject.values()] };
};

/** One line for the leaf's history: what was written and how much. */
export const describeWritersLensEdit = (edit) => {
  const names = edit.sections.slice(0, 3).map((name) => `«${name}»`).join(', ');
  const more = edit.sections.length > 3 ? ` y ${edit.sections.length - 3} más` : '';
  const words = edit.words > 0 ? ` (+${edit.words} palabras)` : edit.words < 0 ? ` (${edit.words} palabras)` : '';
  return names ? `Escribiste en ${names}${more}${words}` : `Escribiste en «${edit.projectName}»${words}`;
};

/**
 * The same source connected twice (two Writer's Lens entries, or the same YouTube channel)
 * would water everything twice. Keeps one per source: the one with more branches, else the
 * oldest. Its memory (sections seen, project → branch answers, videos) absorbs the other's,
 * and the other's branches move to it.
 * @returns {{connections: object[], projects: object[], changed: boolean}}
 */
export const mergeDuplicateSources = (connections = [], projects = []) => {
  const keyOf = (c) =>
    c.tracking !== 'auto' ? '' : c.kind === 'writerslens' ? 'writerslens' : c.kind === 'youtube' && c.channelId ? `youtube:${c.channelId}` : '';
  const branches = (c) => projects.filter((p) => p.appId === c.id).length;
  const groups = new Map();
  connections.forEach((c) => {
    const key = keyOf(c);
    if (key) groups.set(key, [...(groups.get(key) || []), c]);
  });
  const replaced = new Map();
  const merged = new Map();
  groups.forEach((group) => {
    if (group.length < 2) return;
    const [keep, ...rest] = [...group].sort((a, b) => branches(b) - branches(a) || String(a.createdAt).localeCompare(String(b.createdAt)));
    let state = { ...(keep.sourceState || {}) };
    let openUrl = keep.openUrl;
    rest.forEach((other) => {
      const o = other.sourceState || {};
      state = {
        ...o,
        ...state,
        projectBranch: { ...(o.projectBranch || {}), ...(state.projectBranch || {}) },
        ...(state.sections || o.sections ? { sections: state.sections || o.sections } : {}),
        ...(state.seenVideos || o.seenVideos ? { seenVideos: [...new Set([...(o.seenVideos || []), ...(state.seenVideos || [])])] } : {}),
      };
      if (!openUrl && other.openUrl) openUrl = other.openUrl;
      replaced.set(other.id, keep.id);
    });
    merged.set(keep.id, { ...keep, openUrl, sourceState: state });
  });
  if (!replaced.size) return { connections, projects, changed: false };
  return {
    connections: connections.filter((c) => !replaced.has(c.id)).map((c) => merged.get(c.id) || c),
    projects: projects.map((p) => (p.appId && replaced.has(p.appId) ? { ...p, appId: replaced.get(p.appId) } : p)),
    changed: true,
  };
};
