// Bridge to the Mac app (Tauri). In the browser every function here is a no-op, so the
// web version keeps working exactly as before.
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { STORAGE_KEYS, setPersistenceMirror } from '../utils/persistence';

export const isDesktop = (): boolean => {
  try {
    return isTauri();
  } catch {
    return false;
  }
};

/** Keyboard shortcut for quick watering, as shown to the user. */
export const QUICK_LOG_SHORTCUT = '⌃⌥R';

const SAVE_DELAY_MS = 400;

/**
 * Loads the tree from the file on the Mac before the app starts, and from then on
 * writes every save to that file. The file wins over whatever the window's own
 * storage holds; on the very first run the window's storage (if any) seeds the file.
 */
export const startDesktopStorage = async (): Promise<void> => {
  if (!isDesktop()) return;

  try {
    const saved = await invoke<string | null>('load_state');
    if (saved) {
      localStorage.setItem(STORAGE_KEYS.consolidatedState, saved);
    } else {
      const existing = localStorage.getItem(STORAGE_KEYS.consolidatedState);
      if (existing) await invoke('save_state', { json: existing });
    }
  } catch (error) {
    console.error('[Productivitree] No se pudo leer el archivo de datos', error);
  }

  let pending: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let writing: Promise<void> = Promise.resolve();

  const write = () => {
    timer = null;
    if (pending === null) return writing;
    const json = pending;
    pending = null;
    writing = writing
      .then(() => invoke('save_state', { json }))
      .then(() => undefined)
      .catch((error) => console.error('[Productivitree] No se pudo guardar el archivo de datos', error));
    return writing;
  };

  const mirror = (json: string) => {
    pending = json;
    if (timer) clearTimeout(timer);
    timer = setTimeout(write, SAVE_DELAY_MS);
  };
  mirror.flush = () => {
    if (timer) clearTimeout(timer);
    return write();
  };

  setPersistenceMirror(mirror);
  // Hiding the window or quitting: write what is pending right away.
  window.addEventListener('pagehide', () => void mirror.flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void mirror.flush();
  });
};

/** Path of the data file, for Settings. */
export const desktopDataLocation = async (): Promise<string | null> => {
  if (!isDesktop()) return null;
  try {
    return await invoke<string>('data_location');
  } catch {
    return null;
  }
};

/** Opens a web link in the browser, or an app link (bear://…) in its app. */
export const openDesktopLink = (url: string): boolean => {
  if (!isDesktop()) return false;
  invoke('open_external', { url }).catch((error) => console.error('[Productivitree] No se pudo abrir el enlace', error));
  return true;
};

let launchLinksRead = false;

/**
 * Calls `onLink` with each productivitree:// link: the one that launched the app and
 * every later one. Returns a function that stops listening.
 */
export const listenDesktopLinks = (onLink: (url: string) => void): (() => void) => {
  if (!isDesktop()) return () => undefined;
  let stop: (() => void) | null = null;
  let stopped = false;
  if (!launchLinksRead) {
    launchLinksRead = true;
    getCurrent()
      .then((urls) => urls?.forEach(onLink))
      .catch(() => undefined);
  }
  onOpenUrl((urls) => urls.forEach(onLink))
    .then((unlisten) => {
      if (stopped) unlisten();
      else stop = unlisten;
    })
    .catch(() => undefined);
  return () => {
    stopped = true;
    stop?.();
  };
};

/** Calls `onPress` when the quick-watering shortcut is pressed anywhere on the Mac. */
export const listenQuickLogShortcut = (onPress: () => void): (() => void) => {
  if (!isDesktop()) return () => undefined;
  let stop: (() => void) | null = null;
  let stopped = false;
  listen('riego-rapido', () => onPress())
    .then((unlisten) => {
      if (stopped) unlisten();
      else stop = unlisten;
    })
    .catch(() => undefined);
  return () => {
    stopped = true;
    stop?.();
  };
};

/** Public feed (Atom XML) of a YouTube channel, read by the Mac app. */
export const fetchYoutubeFeed = (channelId: string): Promise<string> => invoke<string>('fetch_youtube_feed', { channelId });

/**
 * Asks yes/no. window.confirm does nothing inside the Mac app's window (it answers "no"
 * without showing anything), so there it uses the native macOS dialog.
 */
export const confirmAction = async (message: string): Promise<boolean> => {
  if (!isDesktop()) return window.confirm(message);
  const { ask } = await import('@tauri-apps/plugin-dialog');
  return ask(message, { title: 'Productivitree', kind: 'warning', okLabel: 'Sí', cancelLabel: 'Cancelar' });
};

/**
 * Saves a text file. In the browser it downloads it; in the Mac app (where downloads do
 * not work) it opens the macOS save dialog. Returns false if the user cancelled.
 */
export const saveTextFile = async (name: string, text: string, type = 'application/json'): Promise<boolean> => {
  if (isDesktop()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const path = await save({ defaultPath: name, filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (!path) return false;
    await invoke('write_user_file', { path, contents: text });
    return true;
  }
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
};
