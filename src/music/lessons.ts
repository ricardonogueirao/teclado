// The learning path. Module 1 uses original exercises and public-domain melodies.
import { seq } from './notation';
import type { Module, Song, ViewMode } from './types';

export interface LessonSource {
  id: string;
  title: string;
  goal: string;
  bpm: number;
  beatsPerBar: number;
  right?: string;
  left?: string;
  view?: ViewMode;
}

export function buildSong(src: LessonSource): Song {
  return {
    id: src.id,
    title: src.title,
    goal: src.goal,
    bpm: src.bpm,
    beatsPerBar: src.beatsPerBar,
    notes: [...(src.right ? seq('R', src.right) : []), ...(src.left ? seq('L', src.left) : [])],
    ...(src.view ? { view: src.view } : {}),
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

// Module 2: reading. Every lesson opens in the sheet-music view.
export const MODULE_2_SOURCES: LessonSource[] = [
  {
    id: 'm2-sol-do-re-mi',
    title: 'Clave de sol: Dó, Ré e Mi',
    goal:
      'Na clave de sol, o Dó central fica numa linha extra abaixo da pauta (linha suplementar). O Ré fica logo abaixo da primeira linha e o Mi em cima da primeira linha. Tente ler a nota antes de olhar o nome embaixo dela.',
    bpm: 72,
    beatsPerBar: 4,
    view: 'sheet',
    right: 'C4/1@1 E4/1@3 D4/1@2 C4/1@1 | E4/1@3 D4/1@2 E4/2@3 | D4/1@2 C4/1@1 E4/1@3 D4/1@2 | C4/1@1 D4/1@2 C4/2@1',
  },
  {
    id: 'm2-sol-fa-sol',
    title: 'Clave de sol: Fá e Sol',
    goal:
      'O Fá fica no primeiro espaço e o Sol na segunda linha, a linha onde a clave de sol se enrola. Notas vizinhas alternam: linha, espaço, linha, espaço.',
    bpm: 76,
    beatsPerBar: 4,
    view: 'sheet',
    right:
      'E4/1@3 F4/1@4 G4/2@5 | G4/1@5 F4/1@4 E4/2@3 | C4/1@1 E4/1@3 G4/1@5 E4/1@3 | F4/1@4 D4/1@2 C4/2@1 | ' +
      'G4/1@5 E4/1@3 F4/1@4 D4/1@2 | E4/1@3 C4/1@1 D4/2@2 | G4/1@5 F4/1@4 E4/1@3 D4/1@2 | C4/4@1',
  },
  {
    id: 'm2-posicao-sol',
    title: 'Posição de Sol (mão direita)',
    goal:
      'Nova posição: polegar da mão direita no Sol (segunda linha). Lá fica no segundo espaço, Si na terceira linha, Dó no terceiro espaço e Ré na quarta linha.',
    bpm: 72,
    beatsPerBar: 4,
    view: 'sheet',
    right:
      'G4/1@1 A4/1@2 B4/1@3 C5/1@4 | D5/2@5 B4/2@3 | C5/1@4 A4/1@2 B4/1@3 G4/1@1 | A4/4@2 | ' +
      'B4/1@3 C5/1@4 D5/1@5 B4/1@3 | C5/1@4 A4/1@2 B4/2@3 | A4/1@2 B4/1@3 G4/1@1 A4/1@2 | G4/4@1',
  },
  {
    id: 'm2-fa-posicao-do',
    title: 'Clave de fá: posição de Dó',
    goal:
      'A clave de fá marca a linha do Fá: a quarta linha, entre os dois pontos. Mão esquerda na posição de Dó: Dó no segundo espaço, Ré na terceira linha, Mi no terceiro espaço, Fá na quarta linha e Sol no quarto espaço.',
    bpm: 72,
    beatsPerBar: 4,
    view: 'sheet',
    left:
      'C3/1@5 E3/1@3 D3/1@4 C3/1@5 | E3/1@3 F3/1@2 G3/2@1 | G3/1@1 E3/1@3 F3/1@2 D3/1@4 | E3/1@3 D3/1@4 C3/2@5 | ' +
      'D3/1@4 F3/1@2 E3/1@3 G3/1@1 | F3/1@2 D3/1@4 E3/2@3 | G3/1@1 F3/1@2 E3/1@3 D3/1@4 | C3/4@5',
  },
  {
    id: 'm2-do-central-duas-claves',
    title: 'Dó central nas duas claves',
    goal:
      'O Dó central é a mesma tecla nas duas claves: uma linha suplementar abaixo da clave de sol ou acima da clave de fá. Os dois polegares ficam nele. A mão direita sobe (Ré, Mi, Fá, Sol) e a esquerda desce (Si, Lá, Sol, Fá).',
    bpm: 72,
    beatsPerBar: 4,
    view: 'sheet',
    right: 'C4/1@1 D4/1@2 E4/2@3 | -/4 | E4/1@3 F4/1@4 G4/2@5 | -/4 | G4/1@5 E4/1@3 C4/2@1 | -/4 | -/4 | C4/4@1',
    left: '-/4 | C4/1@1 B3/1@2 A3/2@3 | -/4 | A3/1@3 G3/1@4 F3/2@5 | -/4 | F3/1@5 A3/1@3 C4/2@1 | G3/1@4 B3/1@2 C4/2@1 | -/4',
  },
  {
    id: 'm2-segundas-tercas',
    title: 'Intervalos: segundas e terças',
    goal:
      'Segunda é a nota vizinha: de linha para espaço. Terça pula uma nota: de linha para linha ou de espaço para espaço. Olhe a distância entre as notas na pauta antes de tocar.',
    bpm: 76,
    beatsPerBar: 4,
    view: 'sheet',
    right:
      'C4/1@1 D4/1@2 C4/1@1 E4/1@3 | D4/1@2 E4/1@3 D4/1@2 F4/1@4 | E4/1@3 F4/1@4 E4/1@3 G4/1@5 | F4/1@4 D4/1@2 E4/2@3 | ' +
      'G4/1@5 E4/1@3 F4/1@4 D4/1@2 | E4/1@3 C4/1@1 D4/2@2 | E4/1@3 G4/1@5 F4/1@4 D4/1@2 | C4/4@1',
  },
  {
    id: 'm2-quartas-quintas',
    title: 'Intervalos: quartas e quintas',
    goal:
      'Saltos maiores. Quarta: de linha para espaço, pulando duas notas (Dó–Fá). Quinta: de linha para linha, pulando três (Dó–Sol), do polegar ao mindinho.',
    bpm: 72,
    beatsPerBar: 4,
    view: 'sheet',
    right:
      'C4/1@1 F4/1@4 C4/1@1 G4/1@5 | D4/1@2 G4/1@5 D4/2@2 | C4/1@1 G4/1@5 F4/1@4 C4/1@1 | E4/4@3 | ' +
      'G4/1@5 C4/1@1 G4/1@5 D4/1@2 | F4/1@4 C4/1@1 F4/2@4 | G4/1@5 D4/1@2 E4/1@3 F4/1@4 | C4/4@1',
  },
  {
    id: 'm2-colcheias',
    title: 'Colcheias',
    goal:
      'A colcheia vale meio tempo: duas cabem em um tempo e vêm unidas por uma barra. Conte em voz alta "um-e, dois-e, três-e, quatro-e". Deixe o metrônomo ligado.',
    bpm: 72,
    beatsPerBar: 4,
    view: 'sheet',
    right:
      'C4/1@1 D4/1@2 E4/0.5@3 E4/0.5@3 E4/1@3 | D4/0.5@2 D4/0.5@2 E4/0.5@3 D4/0.5@2 C4/2@1 | ' +
      'E4/0.5@3 F4/0.5@4 G4/1@5 G4/0.5@5 F4/0.5@4 E4/1@3 | D4/2@2 G4/2@5 | ' +
      'C4/1@1 D4/1@2 E4/0.5@3 E4/0.5@3 E4/1@3 | G4/0.5@5 F4/0.5@4 E4/0.5@3 D4/0.5@2 C4/2@1',
  },
  {
    id: 'm2-frei-martinho',
    title: 'Frei Martinho',
    goal:
      'Melodia conhecida (Frère Jacques) com colcheias nos compassos 5 e 6. A mão esquerda segura o Dó na clave de fá e, no "dim, dom, dão" do fim, toca o Sol.',
    bpm: 80,
    beatsPerBar: 4,
    view: 'sheet',
    right:
      'C4/1@1 D4/1@2 E4/1@3 C4/1@1 | C4/1@1 D4/1@2 E4/1@3 C4/1@1 | E4/1@3 F4/1@4 G4/2@5 | E4/1@3 F4/1@4 G4/2@5 | ' +
      'G4/0.5@4 A4/0.5@5 G4/0.5@4 F4/0.5@3 E4/1@2 C4/1@1 | G4/0.5@4 A4/0.5@5 G4/0.5@4 F4/0.5@3 E4/1@2 C4/1@1 | ' +
      'C4/1@1 -/1 C4/2@1 | C4/1@1 -/1 C4/2@1',
    left: 'C3/4@5 | C3/4@5 | C3/4@5 | C3/4@5 | C3/4@5 | C3/4@5 | -/1 G3/1@1 -/2 | -/1 G3/1@1 -/2',
  },
  {
    id: 'm2-brilha-duas-claves',
    title: 'Brilha, Brilha: duas claves',
    goal:
      'Melodia na clave de sol e baixo na clave de fá. Leia as duas pautas juntas: o que está alinhado na vertical toca ao mesmo tempo.',
    bpm: 80,
    beatsPerBar: 4,
    view: 'sheet',
    right:
      'C4/1@1 C4/1@1 G4/1@4 G4/1@4 | A4/1@5 A4/1@5 G4/2@4 | F4/1@3 F4/1@3 E4/1@2 E4/1@2 | D4/1@1 D4/1@1 C4/2@1 | ' +
      'G4/1@4 G4/1@4 F4/1@3 F4/1@3 | E4/1@2 E4/1@2 D4/2@1 | G4/1@4 G4/1@4 F4/1@3 F4/1@3 | E4/1@2 E4/1@2 D4/2@1 | ' +
      'C4/1@1 C4/1@1 G4/1@4 G4/1@4 | A4/1@5 A4/1@5 G4/2@4 | F4/1@3 F4/1@3 E4/1@2 E4/1@2 | D4/1@1 D4/1@1 C4/2@1',
    left:
      'C3/4@5 | F3/2@2 C3/2@5 | F3/2@2 C3/2@5 | G3/2@1 C3/2@5 | C3/2@5 F3/2@2 | C3/2@5 G3/2@1 | ' +
      'C3/2@5 F3/2@2 | C3/2@5 G3/2@1 | C3/4@5 | F3/2@2 C3/2@5 | F3/2@2 C3/2@5 | G3/2@1 C3/2@5',
  },
];

export const MODULES: Module[] = [
  {
    id: 'm1',
    title: 'Módulo 1: Primeiros passos',
    description: 'Dó central, posição de cinco dedos, durações básicas e as primeiras músicas com as duas mãos.',
    lessons: MODULE_1_SOURCES.map(buildSong),
  },
  {
    id: 'm2',
    title: 'Módulo 2: Lendo partitura',
    description: 'Clave de sol e clave de fá, o Dó central nas duas, intervalos e colcheias. As lições abrem na partitura.',
    lessons: MODULE_2_SOURCES.map(buildSong),
  },
];

/** Modules planned for later versions, shown in the path as "em breve". */
export const UPCOMING_MODULES = [
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
