// Reads a file the user picked: MIDI, MusicXML or compressed MusicXML (.mxl).
import { parseMidiFile } from './midiFile';
import { parseMusicXml } from './musicXml';
import { decodeXml, unzipMusicXml } from './mxl';
import type { ImportedScore } from './types';

export const ACCEPTED = '.mid,.midi,.mxl,.musicxml,.xml';

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Música';
}

export async function importFile(file: { name: string; arrayBuffer(): Promise<ArrayBuffer> }): Promise<ImportedScore> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const name = baseName(file.name);
  const magic = String.fromCharCode(...bytes.slice(0, 4));

  let score: ImportedScore;
  if (magic === 'MThd') score = parseMidiFile(buffer, name);
  else if (magic === 'PK\u0003\u0004') score = parseMusicXml(await unzipMusicXml(buffer), name);
  else if (/\.(musicxml|xml)$/i.test(file.name) || decodeXml(bytes.slice(0, 400)).includes('<')) score = parseMusicXml(decodeXml(bytes), name);
  else throw new Error('Formato não reconhecido. Use um arquivo MIDI (.mid) ou MusicXML (.mxl, .musicxml).');

  if (score.tracks.every((t) => t.notes.length === 0)) throw new Error('O arquivo não tem nenhuma nota.');
  return score;
}
