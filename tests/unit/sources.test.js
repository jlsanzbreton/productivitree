import test from 'node:test';
import assert from 'node:assert/strict';
import { describeWritersLensEdit, diffWritersLens, mergeDuplicateSources, newVideos, parseYoutubeChannelId, parseYoutubeFeed } from '../../utils/sources.js';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
 <title>Scientifically (dis)Proved!</title>
 <entry>
  <id>yt:video:BBBBBBBBBBB</id>
  <yt:videoId>BBBBBBBBBBB</yt:videoId>
  <title>Human error &amp; the myth</title>
  <published>2026-12-10T10:00:00+00:00</published>
 </entry>
 <entry>
  <id>yt:video:AAAAAAAAAAA</id>
  <yt:videoId>AAAAAAAAAAA</yt:videoId>
  <title>Primer vídeo</title>
  <published>2026-12-01T10:00:00+00:00</published>
 </entry>
</feed>`;

test('reads channel ids and channel URLs', () => {
  assert.equal(parseYoutubeChannelId('UC0YXv_iSslCc19Q-uqb3kBA'), 'UC0YXv_iSslCc19Q-uqb3kBA');
  assert.equal(parseYoutubeChannelId('https://www.youtube.com/channel/UC0YXv_iSslCc19Q-uqb3kBA/videos'), 'UC0YXv_iSslCc19Q-uqb3kBA');
  assert.equal(parseYoutubeChannelId('@scientifically'), null);
  assert.equal(parseYoutubeChannelId(''), null);
});

test('parses the YouTube feed and finds new videos in publishing order', () => {
  const videos = parseYoutubeFeed(FEED);
  assert.equal(videos.length, 2);
  assert.equal(videos[0].title, 'Human error & the myth');
  assert.equal(videos[0].url, 'https://www.youtube.com/watch?v=BBBBBBBBBBB');
  assert.deepEqual(newVideos(videos, []).map((v) => v.videoId), ['AAAAAAAAAAA', 'BBBBBBBBBBB']);
  assert.deepEqual(newVideos(videos, ['AAAAAAAAAAA']).map((v) => v.videoId), ['BBBBBBBBBBB']);
  assert.deepEqual(parseYoutubeFeed('<feed></feed>'), []);
});

const row = (sectionId, hash, words, extra = {}) => ({
  sectionId,
  sectionName: `Sección ${sectionId}`,
  projectId: 'wl1',
  projectName: 'The Myth of Human Error',
  hash,
  words,
  ...extra,
});

test('first Writer’s Lens check only takes a snapshot', () => {
  const { snapshot, edits } = diffWritersLens(null, [row('s1', 'a', 100)]);
  assert.deepEqual(snapshot, { s1: { h: 'a', w: 100 } });
  assert.deepEqual(edits, []);
});

test('only sections whose text changed count as written', () => {
  const previous = { s1: { h: 'a', w: 100 }, s2: { h: 'b', w: 50 } };
  const { edits } = diffWritersLens(previous, [
    row('s1', 'a', 100), // same text, even if re-synced
    row('s2', 'c', 80),
    row('s3', 'd', 20), // new section with text
    row('s4', '', 0), // new empty section
    row('x1', 'z', 10, { projectId: 'wl2', projectName: 'Otro' }),
  ]);
  assert.equal(edits.length, 2);
  const myth = edits.find((e) => e.projectId === 'wl1');
  assert.deepEqual(myth.sections, ['Sección s2', 'Sección s3']);
  assert.equal(myth.words, 50);
  assert.equal(describeWritersLensEdit(myth), 'Escribiste en «Sección s2», «Sección s3» (+50 palabras)');
});

test('two Writer’s Lens connections become one, keeping branches and answers', () => {
  const connections = [
    { id: 'a', kind: 'writerslens', tracking: 'auto', openUrl: '', createdAt: '2026-11-27T10:00:00Z', sourceState: { projectBranch: { p1: 'b1' }, sections: { s: { h: 'x', w: 1 } } } },
    { id: 'bear', kind: 'bear', tracking: 'manual', openUrl: 'bear://', createdAt: '2026-11-27T10:00:00Z' },
    { id: 'b', kind: 'writerslens', tracking: 'auto', openUrl: 'https://wl.example', createdAt: '2026-11-27T11:00:00Z', sourceState: { projectBranch: { p2: '' } } },
  ];
  const projects = [{ id: 'b1', appId: 'b' }, { id: 'b2', appId: 'bear' }];
  const result = mergeDuplicateSources(connections, projects);
  assert.equal(result.changed, true);
  assert.deepEqual(result.connections.map((c) => c.id), ['bear', 'b']);
  const kept = result.connections.find((c) => c.id === 'b');
  assert.deepEqual(kept.sourceState.projectBranch, { p1: 'b1', p2: '' });
  assert.ok(kept.sourceState.sections.s);
  assert.equal(kept.openUrl, 'https://wl.example');
  assert.equal(mergeDuplicateSources(result.connections, result.projects).changed, false);
});
