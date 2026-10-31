// The learning path. Module 1 uses original exercises and public-domain melodies.
import { seq } from './notation';
import type { Module, Song } from './types';

export interface LessonSource {
  id: string;
  title: string;
  goal: string;
  bpm: number;
  beatsPerBar: number;
  right?: string;
  left?: string;
}

export function buildSong(src: LessonSource): Song {
  return {
    id: src.id,
    title: src.title,
    goal: src.goal,
    bpm: src.bpm,
    beatsPerBar: src.beatsPerBar,
    notes: [...(src.right ? seq('R', src.right) : []), ...(src.left ? seq('L', src.left) : [])],
  };
}

export const MODULE_1_SOURCES: LessonSource[] = [
  {
    id: 'm1-do-central',
    title: 'O Dó central',
    goal:
      'Ache o Dó central: é o Dó branco logo à esquerda do par de teclas pretas no meio do teclado. Toque com o polegar da mão direita (dedo 1). Repare nas durações: 1 tempo (semínima), 2 tempos (mínima) e 4 tempos (semibreve).',
    bpm: 70,
    beatsPerBar: 4,
    right: 'C4/1@1 C4/1@1 C4/1@1 C4/1@1 | C4/2@1 C4/2@1 | C4/1@1 C4/1@1 C4/2@1 | C4/4@1',
  },
  {
    id: 'm1-do-re-mi',
    title: 'Dó, Ré, Mi',
    goal: 'Mão direita com os dedos 1, 2 e 3 sobre Dó, Ré e Mi. Mantenha os dedos curvados, como se segurasse uma laranja.',
    bpm: 72,
    beatsPerBar: 4,
    right:
      'C4/1@1 D4/1@2 E4/1@3 D4/1@2 | C4/1@1 D4/1@2 E4/2@3 | E4/1@3 D4/1@2 C4/1@1 D4/1@2 | C4/4@1',
  },
  {
    id: 'm1-cinco-dedos-md',
    title: 'Cinco dedos: mão direita',
    goal: 'Posição de Dó: cada dedo da mão direita fica sobre uma tecla, do Dó (polegar) ao Sol (mindinho).',
    bpm: 76,
    beatsPerBar: 4,
    right:
      'C4/1@1 D4/1@2 E4/1@3 F4/1@4 | G4/4@5 | G4/1@5 F4/1@4 E4/1@3 D4/1@2 | C4/4@1 | C4/1@1 E4/1@3 G4/2@5 | G4/1@5 E4/1@3 C4/2@1',
  },
  {
    id: 'm1-cinco-dedos-me',
    title: 'Cinco dedos: mão esquerda',
    goal: 'Agora a mão esquerda, uma oitava abaixo do Dó central: mindinho (dedo 5) no Dó, polegar (dedo 1) no Sol.',
    bpm: 72,
    beatsPerBar: 4,
    left:
      'C3/1@5 D3/1@4 E3/1@3 F3/1@2 | G3/4@1 | G3/1@1 F3/1@2 E3/1@3 D3/1@4 | C3/4@5 | C3/1@5 E3/1@3 G3/2@1 | G3/1@1 E3/1@3 C3/2@5',
  },
  {
    id: 'm1-pergunta-resposta',
    title: 'Pergunta e resposta',
    goal: 'As mãos se revezam: a direita "pergunta", a esquerda "responde". Uma de cada vez, sem pressa.',
    bpm: 76,
    beatsPerBar: 4,
    right: 'C4/1@1 D4/1@2 E4/2@3 | -/4 | E4/1@3 D4/1@2 C4/2@1 | -/4 | E4/1@3 F4/1@4 G4/2@5 | -/4 | G4/1@5 E4/1@3 C4/2@1 | -/4',
    left: '-/4 | C3/1@5 D3/1@4 E3/2@3 | -/4 | E3/1@3 D3/1@4 C3/2@5 | -/4 | E3/1@3 F3/1@2 G3/2@1 | -/4 | G3/1@1 E3/1@3 C3/2@5',
  },
  {
    id: 'm1-ode-alegria',
    title: 'Ode à Alegria (Beethoven)',
    goal: 'Sua primeira música, toda na posição de Dó da mão direita. Atenção ao ritmo pontuado no fim de cada frase: longa-curta.',
    bpm: 80,
    beatsPerBar: 4,
    right:
      'E4/1@3 E4/1@3 F4/1@4 G4/1@5 | G4/1@5 F4/1@4 E4/1@3 D4/1@2 | C4/1@1 C4/1@1 D4/1@2 E4/1@3 | E4/1.5@3 D4/0.5@2 D4/2@2 | ' +
      'E4/1@3 E4/1@3 F4/1@4 G4/1@5 | G4/1@5 F4/1@4 E4/1@3 D4/1@2 | C4/1@1 C4/1@1 D4/1@2 E4/1@3 | D4/1.5@2 C4/0.5@1 C4/2@1',
  },
  {
    id: 'm1-brilha-estrelinha',
    title: 'Brilha, Brilha Estrelinha',
    goal: 'Mão direita um pouco mais aberta: o Sol fica com o dedo 4 e o Lá com o mindinho. O polegar toca Ré e Dó.',
    bpm: 88,
    beatsPerBar: 4,
    right:
      'C4/1@1 C4/1@1 G4/1@4 G4/1@4 | A4/1@5 A4/1@5 G4/2@4 | F4/1@3 F4/1@3 E4/1@2 E4/1@2 | D4/1@1 D4/1@1 C4/2@1 | ' +
      'G4/1@4 G4/1@4 F4/1@3 F4/1@3 | E4/1@2 E4/1@2 D4/2@1 | G4/1@4 G4/1@4 F4/1@3 F4/1@3 | E4/1@2 E4/1@2 D4/2@1 | ' +
      'C4/1@1 C4/1@1 G4/1@4 G4/1@4 | A4/1@5 A4/1@5 G4/2@4 | F4/1@3 F4/1@3 E4/1@2 E4/1@2 | D4/1@1 D4/1@1 C4/2@1',
  },
  {
    id: 'm1-bate-o-sino',
    title: 'Bate o Sino',
    goal: 'O refrão de "Bate o sino pequenino". Muitas notas repetidas: mantenha o dedo perto da tecla.',
    bpm: 96,
    beatsPerBar: 4,
    right:
      'E4/1@3 E4/1@3 E4/2@3 | E4/1@3 E4/1@3 E4/2@3 | E4/1@3 G4/1@5 C4/1.5@1 D4/0.5@2 | E4/4@3 | ' +
      'F4/1@4 F4/1@4 F4/1.5@4 F4/0.5@4 | F4/1@4 E4/1@3 E4/1@3 E4/0.5@3 E4/0.5@3 | E4/1@3 D4/1@2 D4/1@2 E4/1@3 | D4/2@2 G4/2@5 | ' +
      'E4/1@3 E4/1@3 E4/2@3 | E4/1@3 E4/1@3 E4/2@3 | E4/1@3 G4/1@5 C4/1.5@1 D4/0.5@2 | E4/4@3 | ' +
      'F4/1@4 F4/1@4 F4/1.5@4 F4/0.5@4 | F4/1@4 E4/1@3 E4/1@3 E4/0.5@3 E4/0.5@3 | G4/1@5 G4/1@5 F4/1@4 D4/1@2 | C4/4@1',
  },
  {
    id: 'm1-ode-maos-juntas',
    title: 'Ode à Alegria: mãos juntas',
    goal: 'A melodia na direita e notas longas na esquerda (Dó com o mindinho, Sol com o polegar). Se travar, pratique cada mão separada primeiro.',
    bpm: 72,
    beatsPerBar: 4,
    right:
      'E4/1@3 E4/1@3 F4/1@4 G4/1@5 | G4/1@5 F4/1@4 E4/1@3 D4/1@2 | C4/1@1 C4/1@1 D4/1@2 E4/1@3 | E4/1.5@3 D4/0.5@2 D4/2@2 | ' +
      'E4/1@3 E4/1@3 F4/1@4 G4/1@5 | G4/1@5 F4/1@4 E4/1@3 D4/1@2 | C4/1@1 C4/1@1 D4/1@2 E4/1@3 | D4/1.5@2 C4/0.5@1 C4/2@1',
    left: 'C3/4@5 | G3/4@1 | C3/4@5 | G3/4@1 | C3/4@5 | G3/4@1 | C3/4@5 | G3/2@1 C3/2@5',
  },
];

export const MODULES: Module[] = [
  {
    id: 'm1',
    title: 'Módulo 1: Primeiros passos',
    description: 'Dó central, posição de cinco dedos, durações básicas e as primeiras músicas com as duas mãos.',
    lessons: MODULE_1_SOURCES.map(buildSong),
  },
];

/** Modules planned for later versions, shown in the path as "em breve". */
export const UPCOMING_MODULES = [
  { title: 'Módulo 2: Lendo partitura', description: 'Clave de sol e clave de fá, intervalos, colcheias.' },
  { title: 'Módulo 3: Mãos independentes', description: 'Melodia e acompanhamento ao mesmo tempo, novas posições.' },
  { title: 'Módulo 4: Acordes', description: 'Tríades maiores e menores, cifras, acompanhar uma música.' },
  { title: 'Módulo 5: Escalas e tonalidades', description: 'Passagem do polegar, Sol maior, Fá maior, Lá menor.' },
  { title: 'Módulo 6: Intermediário', description: 'Inversões, arpejos, síncope, pedal e dinâmica.' },
];

export function findLesson(id: string): { module: Module; song: Song; index: number } | null {
  for (const module of MODULES) {
    const index = module.lessons.findIndex((l) => l.id === id);
    if (index >= 0) return { module, song: module.lessons[index], index };
  }
  return null;
}
