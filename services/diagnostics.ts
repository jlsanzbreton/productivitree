// Diagnostic log for the Mac app: errors, moments when the window froze, and the last
// things done in the tree. It is written to a file on the Mac (registro.log, next to the
// data file) and never sent anywhere; from Settings it can be copied to share it.
import { invoke } from '@tauri-apps/api/core';
import { isDesktop } from './desktop';

const FLUSH_MS = 1000;
const STALL_CHECK_MS = 1000;
/** The window counts as frozen when a 1-second timer comes back this late. */
const STALL_MS = 3000;
const MAX_TRAIL = 15;
const MAX_LINE = 600;

let started = false;
let queue: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
const trail: string[] = [];

const stamp = () => new Date().toLocaleString('es-ES', { hour12: false });
const clip = (text: string) => (text.length > MAX_LINE ? `${text.slice(0, MAX_LINE)}…` : text);
const describe = (value: unknown): string => {
  if (value instanceof Error) return `${value.name}: ${value.message}${value.stack ? ` | ${value.stack.split('\n').slice(0, 4).join(' | ')}` : ''}`;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const flush = () => {
  timer = null;
  if (!queue.length) return;
  const lines = queue.join('\n');
  queue = [];
  invoke('append_log', { lines }).catch(() => undefined);
};

const write = (kind: string, text: string) => {
  if (!started) return;
  queue.push(`${stamp()} [${kind}] ${clip(text)}`);
  if (!timer) timer = setTimeout(flush, FLUSH_MS);
};

/** Notes something the user did (sprouting, fruits, imports…), so a hang shows what came before it. */
export const breadcrumb = (text: string): void => {
  trail.push(`${stamp()} ${clip(text)}`);
  if (trail.length > MAX_TRAIL) trail.shift();
  write('accion', text);
};

/** Notes an error that was caught. */
export const logError = (where: string, error: unknown): void => write('error', `${where}: ${describe(error)}`);

/** Starts the log (Mac app only): uncaught errors, console errors and frozen-window detection. */
export const startDiagnostics = (): void => {
  if (started || !isDesktop()) return;
  started = true;
  write('arranque', `Ventana ${window.innerWidth}×${window.innerHeight}, ${navigator.userAgent}`);

  window.addEventListener('error', (event) => write('error', `${event.message} (${event.filename}:${event.lineno})`));
  window.addEventListener('unhandledrejection', (event) => write('error', `Promesa sin resolver: ${describe(event.reason)}`));

  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    original(...args);
    write('consola', args.map(describe).join(' '));
  };

  // If the page's thread gets stuck, this timer comes back late: note how long and what came before.
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    const gap = now - last;
    last = now;
    // Longer than 10 minutes is the Mac sleeping, not a hang.
    if (gap > STALL_MS && gap < 600_000 && document.visibilityState === 'visible') {
      write('bloqueo', `La ventana estuvo congelada ${(gap / 1000).toFixed(1)} s. Antes: ${trail.slice(-5).join(' · ') || 'nada anotado'}`);
    }
  }, STALL_CHECK_MS);
  // Hidden windows get slow timers on purpose: start counting again when it comes back.
  document.addEventListener('visibilitychange', () => {
    last = performance.now();
  });

  window.addEventListener('pagehide', flush);
};

/** The whole log, to copy it from Settings. */
export const readDiagnostics = async (): Promise<string> => (isDesktop() ? invoke<string>('read_log') : '');

export const diagnosticsLocation = async (): Promise<string | null> => {
  if (!isDesktop()) return null;
  try {
    return await invoke<string>('log_location');
  } catch {
    return null;
  }
};

/** True when the last session ended without quitting normally. */
export const previousSessionBroken = async (): Promise<boolean> => {
  if (!isDesktop()) return false;
  try {
    return await invoke<boolean>('previous_session_broken');
  } catch {
    return false;
  }
};
