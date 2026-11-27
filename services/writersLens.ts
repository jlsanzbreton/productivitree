// Reads from Writer's Lens (Jose's writing app) which sections changed, to water the tree.
// Read-only: Productivitree signs in with the same account (GitHub) and only reads project
// and section names plus a fingerprint of each section's text (never the text itself).
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { WritersLensRow } from '../utils/sources';
import { isDesktop, openDesktopLink } from './desktop';

const URL_ = import.meta.env.VITE_WL_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_WL_SUPABASE_KEY as string | undefined;

/** Where Supabase sends the browser back after signing in with GitHub (the Mac app). */
export const WRITERS_LENS_REDIRECT = 'productivitree://auth';

let client: SupabaseClient | null = null;

export const writersLensConfigured = (): boolean => Boolean(URL_ && KEY);

const getClient = (): SupabaseClient => {
  if (!URL_ || !KEY) throw new Error('Falta configurar Writer’s Lens (VITE_WL_SUPABASE_URL y VITE_WL_SUPABASE_KEY).');
  if (!client) {
    client = createClient(URL_, KEY, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'productivitree-writers-lens' },
    });
  }
  return client;
};

/** The signed-in Writer's Lens account (its e-mail or GitHub name), or null. */
export const writersLensAccount = async (): Promise<string | null> => {
  if (!writersLensConfigured()) return null;
  const { data } = await getClient().auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  return (user.user_metadata?.user_name as string) || user.email || 'conectado';
};

/** Opens GitHub sign-in in the browser; it comes back through productivitree://auth. */
export const connectWritersLens = async (): Promise<void> => {
  if (!isDesktop()) throw new Error('La conexión con Writer’s Lens funciona en la app de Mac.');
  const { data, error } = await getClient().auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: WRITERS_LENS_REDIRECT, skipBrowserRedirect: true },
  });
  if (error || !data?.url) throw new Error(error?.message || 'No se pudo iniciar sesión.');
  openDesktopLink(data.url);
};

/** Finishes sign-in from productivitree://auth?code=… Returns true if the link was for us. */
export const finishWritersLensSignIn = async (link: string): Promise<{ handled: boolean; ok?: boolean; message?: string }> => {
  if (!link.toLowerCase().startsWith(WRITERS_LENS_REDIRECT)) return { handled: false };
  const query = link.slice(link.indexOf('?') + 1).split('#')[0];
  const params = new URLSearchParams(link.includes('?') ? query : '');
  const code = params.get('code');
  if (!code) return { handled: true, ok: false, message: params.get('error_description') || 'No se completó el inicio de sesión.' };
  const { error } = await getClient().auth.exchangeCodeForSession(code);
  if (error) return { handled: true, ok: false, message: `Writer’s Lens: ${error.message}` };
  return { handled: true, ok: true, message: 'Writer’s Lens conectado. A partir de ahora riega solo.' };
};

export const disconnectWritersLens = async (): Promise<void> => {
  if (writersLensConfigured()) await getClient().auth.signOut();
};

type ProjectRow = { id: string; name: string; active_version_id: string | null };
type SectionRow = { id: string; name: string; project_id: string; version_id: string };
type ContentRow = { section_id: string; content_hash: string | null; word_count: number | null };

const inChunks = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

/**
 * Current state of every section of the active version of each project.
 * Throws when not signed in.
 */
export const readWritersLens = async (): Promise<WritersLensRow[]> => {
  const supabase = getClient();
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('Sin sesión en Writer’s Lens: vuelve a conectarlo.');

  const projects = await supabase.from('projects').select('id,name,active_version_id').is('deleted_at', null);
  if (projects.error) throw new Error(projects.error.message);
  const projectRows = (projects.data || []) as ProjectRow[];
  if (!projectRows.length) return [];

  const sections = await supabase
    .from('sections')
    .select('id,name,project_id,version_id')
    .is('deleted_at', null)
    .in('project_id', projectRows.map((p) => p.id));
  if (sections.error) throw new Error(sections.error.message);
  const byProject = new Map(projectRows.map((p) => [p.id, p]));
  const sectionRows = ((sections.data || []) as SectionRow[]).filter((s) => {
    const active = byProject.get(s.project_id)?.active_version_id;
    return !active || s.version_id === active;
  });

  const contents: ContentRow[] = [];
  for (const ids of inChunks(sectionRows.map((s) => s.id), 150)) {
    const res = await supabase.from('section_contents').select('section_id,content_hash,word_count').is('deleted_at', null).in('section_id', ids);
    if (res.error) throw new Error(res.error.message);
    contents.push(...((res.data || []) as ContentRow[]));
  }
  const contentBySection = new Map(contents.map((c) => [c.section_id, c]));

  return sectionRows.map((s) => {
    const content = contentBySection.get(s.id);
    return {
      sectionId: s.id,
      sectionName: s.name,
      projectId: s.project_id,
      projectName: byProject.get(s.project_id)?.name || 'Proyecto',
      hash: content?.content_hash || '',
      words: content?.word_count || 0,
    };
  });
};
