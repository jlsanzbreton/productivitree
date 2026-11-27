export interface YoutubeVideo { videoId: string; title: string; published: string; url: string }
export type WritersLensSnapshot = Record<string, { h: string; w: number }>;
export interface WritersLensRow { sectionId: string; sectionName: string; projectId: string; projectName: string; hash: string; words: number }
export interface WritersLensEdit { projectId: string; projectName: string; sections: string[]; words: number }
export function parseYoutubeChannelId(value: string): string | null;
export function parseYoutubeFeed(xml: string): YoutubeVideo[];
export function newVideos(videos: YoutubeVideo[], seenIds?: string[]): YoutubeVideo[];
export function diffWritersLens(previous: WritersLensSnapshot | null | undefined, rows: WritersLensRow[]): { snapshot: WritersLensSnapshot; edits: WritersLensEdit[] };
export function describeWritersLensEdit(edit: WritersLensEdit): string;
export function mergeDuplicateSources<C extends { id: string; kind: string; tracking: string; channelId?: string; createdAt?: string; openUrl: string; sourceState?: object }, P extends { appId?: string }>(
  connections: C[],
  projects: P[]
): { connections: C[]; projects: P[]; changed: boolean };
