// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { importFile } from './importFile';
import { parseMidiFile } from './midiFile';
import { parseMusicXml, playOrder } from './musicXml';
import { unzipMusicXml } from './mxl';
import { buildImportedSong, countOutside, suggestOctaveShift, suggestRoles } from './toSong';

// ---------- helpers that write small test files ----------

function vlq(n: number): number[] {
  const out = [n & 0x7f];
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
  return out;
}

function chunk(id: string, data: number[]): number[] {
  const len = data.length;
  return [...id].map((c) => c.charCodeAt(0)).concat([len >>> 24, (len >> 16) & 255, (len >> 8) & 255, len & 255], data);
}

/** A type-1 MIDI file like MuseScore exports: tempo track + one track per staff. */
function midiFile(tpq: number, tracks: number[][]): ArrayBuffer {
  const header = chunk('MThd', [0, 1, 0, tracks.length, tpq >> 8, tpq & 255]);
  const body = tracks.flatMap((t) => chunk('MTrk', [...t, 0, 0xff, 0x2f, 0]));
  return new Uint8Array([...header, ...body]).buffer;
}

function meta(type: number, data: number[]): number[] {
  return [0, 0xff, type, ...vlq(data.length), ...data];
}

function text(s: string): number[] {
  return [...new TextEncoder().encode(s)];
}

async function deflateRaw(raw: Uint8Array): Promise<number[]> {
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(raw);
      c.close();
    },
  }).pipeThrough(new CompressionStream('deflate-raw'));
  const out: number[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out;
    out.push(...value);
  }
}

async function zip(files: Record<string, string>): Promise<ArrayBuffer> {
  const local: number[] = [];
  const central: number[] = [];
  const u16 = (n: number) => [n & 255, n >> 8];
  const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, n >>> 24];
  for (const [name, content] of Object.entries(files)) {
    const raw = new TextEncoder().encode(content);
    const data = await deflateRaw(raw);
    const nameBytes = text(name);
    const offset = local.length;
    local.push(...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(8), ...u16(0), ...u16(0), ...u32(0), ...u32(data.length), ...u32(raw.length), ...u16(nameBytes.length), ...u16(0), ...nameBytes, ...data);
    central.push(...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(8), ...u16(0), ...u16(0), ...u32(0), ...u32(data.length), ...u32(raw.length), ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...nameBytes);
  }
  const count = Object.keys(files).length;
  const end = [...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(count), ...u16(count), ...u32(central.length), ...u32(local.length), ...u16(0)];
  return new Uint8Array([...local, ...central, ...end]).buffer;
}

// ---------- MIDI ----------

describe('MIDI files', () => {
  const tpq = 480;
  const file = midiFile(tpq, [
    [...meta(0x51, [0x07, 0xa1, 0x20]), ...meta(0x58, [3, 2, 24, 8]), ...meta(0x59, [0xff, 0])], // 120 bpm, 3/4, 1 flat
    [
      ...meta(0x03, text('Piano')),
      0, 0x90, 60, 90, // C4 on
      ...vlq(480), 64, 90, // running status: E4 on, one beat later
      0, 0x90, 60, 0, // C4 off (velocity 0)
      ...vlq(480), 0x80, 64, 0, // E4 off
    ],
    [...meta(0x03, text('Piano')), 0, 0x90, 48, 80, ...vlq(1440), 0x80, 48, 0],
  ]);

  it('reads tempo, time and key signature', () => {
    const s = parseMidiFile(file, 'teste');
    expect(s.bpm).toBe(120);
    expect(s.timeSig).toEqual([3, 4]);
    expect(s.keyFifths).toBe(-1);
    expect(s.title).toBe('teste');
    const named = midiFile(tpq, [[...meta(0x03, text('Ode à Alegria'))], [0, 0x90, 60, 90, ...vlq(480), 0x80, 60, 0]]);
    expect(parseMidiFile(named, 'arquivo').title).toBe('Ode à Alegria');
  });

  it('reads notes in beats, with running status and note-on velocity 0', () => {
    const s = parseMidiFile(file);
    expect(s.tracks).toHaveLength(2);
    expect(s.tracks[0].notes).toEqual([
      { midi: 60, start: 0, dur: 1 },
      { midi: 64, start: 1, dur: 1 },
    ]);
    expect(s.tracks[1].notes).toEqual([{ midi: 48, start: 0, dur: 3 }]);
  });

  it('splits a track that mixes channels and marks drums', () => {
    const mixed = midiFile(tpq, [[0, 0x90, 60, 90, 0, 0x99, 36, 90, ...vlq(480), 0x80, 60, 0, 0, 0x89, 36, 0]]);
    const s = parseMidiFile(mixed);
    expect(s.tracks.map((t) => [t.name, t.drums])).toEqual([
      ['Trilha 1 (canal 1)', false],
      ['Trilha 1 (canal 10)', true],
    ]);
  });

  it('rejects files that are not MIDI', () => {
    expect(() => parseMidiFile(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer)).toThrow(/MIDI/);
  });
});

// ---------- MusicXML ----------

const pianoXml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>Teste</work-title></work>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><key><fifths>1</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves>
        <clef number="1"><sign>G</sign></clef><clef number="2"><sign>F</sign></clef></attributes>
      <direction><sound tempo="90"/></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><staff>1</staff>
        <notations><technical><fingering>1</fingering></technical></notations></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><staff>1</staff></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><staff>1</staff></note>
      <note><rest/><duration>2</duration><staff>1</staff></note>
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>2</duration><staff>1</staff><tie type="start"/></note>
      <backup><duration>8</duration></backup>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>8</duration><staff>2</staff></note>
    </measure>
    <measure number="2">
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration><staff>1</staff><tie type="stop"/></note>
      <note><grace/><pitch><step>A</step><octave>4</octave></pitch><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><staff>1</staff></note>
      <backup><duration>8</duration></backup>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>8</duration><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;

describe('MusicXML', () => {
  const s = parseMusicXml(pianoXml);

  it('reads title, tempo, time and key', () => {
    expect(s.title).toBe('Teste');
    expect(s.bpm).toBe(90);
    expect(s.timeSig).toEqual([4, 4]);
    expect(s.keyFifths).toBe(1);
  });

  it('makes one track per staff, named by clef', () => {
    expect(s.tracks.map((t) => t.name)).toEqual(['Piano · clave de sol', 'Piano · clave de fá']);
  });

  it('reads chords, rests, fingering and joins ties; skips grace notes', () => {
    expect(s.tracks[0].notes).toEqual([
      { midi: 60, start: 0, dur: 1, finger: 1 },
      { midi: 64, start: 1, dur: 1 },
      { midi: 67, start: 1, dur: 1 },
      { midi: 66, start: 3, dur: 3 },
      { midi: 67, start: 6, dur: 2 },
    ]);
    expect(s.tracks[1].notes).toEqual([
      { midi: 48, start: 0, dur: 4 },
      { midi: 43, start: 4, dur: 4 },
    ]);
  });

  it('moves a pickup bar so it ends on the first bar line', () => {
    const pickup = pianoXml
      .replace('<measure number="1">', '<measure number="0" implicit="yes">')
      .replace(/<note><pitch><step>C<\/step><octave>4[\s\S]*?<backup><duration>8<\/duration><\/backup>/, '<note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><staff>1</staff></note><backup><duration>2</duration></backup>')
      .replace('<note><pitch><step>C</step><octave>3</octave></pitch><duration>8</duration>', '<note><rest/><duration>2</duration>');
    const p = parseMusicXml(pickup);
    expect(p.tracks[0].notes[0]).toEqual({ midi: 60, start: 3, dur: 1 });
  });

  it('follows repeats and first/second endings', () => {
    const bar = (o: Partial<{ f: boolean; b: boolean; e: number[] }>) => ({
      forwardRepeat: !!o.f,
      backwardRepeat: !!o.b,
      repeatTimes: 2,
      endings: o.e ?? [],
    });
    // |: 0 1 | 2 (1st ending) :| 3 (2nd ending) | 4
    expect(playOrder([bar({ f: true }), bar({}), bar({ b: true, e: [1] }), bar({ e: [2] }), bar({})])).toEqual([0, 1, 2, 0, 1, 3, 4]);
    // plain repeat without a forward sign goes back to the start
    expect(playOrder([bar({}), bar({ b: true }), bar({})])).toEqual([0, 1, 0, 1, 2]);
  });
});

describe('compressed MusicXML (.mxl)', () => {
  it('finds the score through META-INF/container.xml', async () => {
    const file = await zip({
      'META-INF/container.xml': '<container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>',
      'score.xml': pianoXml,
    });
    expect(await unzipMusicXml(file)).toContain('<work-title>Teste</work-title>');
  });

  it('is recognised by importFile from its first bytes', async () => {
    const buffer = await zip({ 'score.musicxml': pianoXml });
    const s = await importFile({ name: 'minha_musica.mxl', arrayBuffer: async () => buffer });
    expect(s.format).toBe('musicxml');
    expect(s.tracks).toHaveLength(2);
  });
});

// ---------- From import to lesson ----------

describe('turning an import into a lesson', () => {
  const s = parseMusicXml(pianoXml);

  it('suggests the higher staff for the right hand and the lower for the left', () => {
    expect(suggestRoles(s)).toEqual({ 'P1-s1': 'R', 'P1-s2': 'L' });
  });

  it('builds a song with hands, key and time signature', () => {
    const song = buildImportedSong(s, { title: '', bpm: 90, roles: suggestRoles(s), octaveShift: 0 }, 'u-1', 'teste.mxl');
    expect(song.title).toBe('Teste');
    expect(song.keyFifths).toBe(1);
    expect(song.timeSig).toEqual([4, 4]);
    expect(song.notes.filter((n) => n.hand === 'L').map((n) => n.midi)).toEqual([48, 43]);
    expect(song.notes.find((n) => n.midi === 60)?.finger).toBe(1);
  });

  it('brings notes outside the 61 keys back in, by octaves', () => {
    const low = { ...s, tracks: [{ id: 'x', name: 'Baixo', drums: false, notes: [{ midi: 28, start: 0, dur: 1 }, { midi: 40, start: 1, dur: 1 }] }] };
    const roles = { x: 'L' as const };
    expect(countOutside(low, roles, 0)).toBe(1);
    expect(suggestOctaveShift(low, roles)).toBe(0); // one stray note: moved alone, not the whole song
    const song = buildImportedSong(low, { title: 'x', bpm: 90, roles, octaveShift: 0 }, 'u', 'f');
    expect(song.notes.map((n) => n.midi)).toEqual([40, 40]);
  });

  it('keeps the written octave when only a few notes are off the keyboard', () => {
    const notes = Array.from({ length: 100 }, (_, i) => ({ midi: 60 + (i % 12), start: i, dur: 1 }));
    const few = { ...s, tracks: [{ id: 'x', name: 'Piano', drums: false, notes: [...notes, { midi: 30, start: 100, dur: 1 }] }] };
    expect(suggestOctaveShift(few, { x: 'R' })).toBe(0);
  });

  it('suggests a voice part as accompaniment in a piano arrangement', () => {
    const withVoice = { ...s, tracks: [{ id: 'v', name: 'Voz', drums: false, notes: [{ midi: 72, start: 0, dur: 1 }] }, ...s.tracks] };
    expect(suggestRoles(withVoice)).toEqual({ v: 'A', 'P1-s1': 'R', 'P1-s2': 'L' });
  });

  it('keeps accompaniment at its own pitch and drops tracks set to off', () => {
    const roles = { 'P1-s1': 'A' as const, 'P1-s2': 'off' as const };
    const song = buildImportedSong(s, { title: 'x', bpm: 90, roles, octaveShift: 2 }, 'u', 'f');
    expect(song.notes.every((n) => n.hand === 'A')).toBe(true);
    expect(song.notes[0].midi).toBe(60);
  });

  it('skips empty bars at the start', () => {
    const late = { ...s, tracks: [{ id: 'x', name: 'x', drums: false, notes: [{ midi: 60, start: 8.5, dur: 1 }] }] };
    const song = buildImportedSong(late, { title: 'x', bpm: 90, roles: { x: 'R' }, octaveShift: 0 }, 'u', 'f');
    expect(song.notes[0].start).toBe(0.5);
  });
});
