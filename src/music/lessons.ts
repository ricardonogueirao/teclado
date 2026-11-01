// The learning path: original exercises and public-domain melodies.
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
  /** Sharps (+) or flats (-) in the key signature. */
  keyFifths?: number;
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
    ...(src.keyFifths ? { keyFifths: src.keyFifths } : {}),
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

// Module 3: independent hands. Both hands play in every lesson, each with its own fingering.
export const MODULE_3_SOURCES: LessonSource[] = [
  {
    id: 'm3-paralelo',
    title: 'Mãos em paralelo',
    goal:
      'As duas mãos tocam a mesma melodia, a esquerda uma oitava abaixo. As notas são as mesmas, mas os dedos não: na direita o polegar (1) está no Dó, na esquerda é o mindinho (5). Olhe os números.',
    bpm: 66,
    beatsPerBar: 4,
    right:
      'C4/1@1 D4/1@2 E4/1@3 F4/1@4 | G4/2@5 G4/2@5 | F4/1@4 E4/1@3 D4/1@2 E4/1@3 | C4/4@1 | ' +
      'E4/1@3 F4/1@4 G4/2@5 | F4/1@4 E4/1@3 D4/2@2 | E4/1@3 D4/1@2 C4/1@1 D4/1@2 | C4/4@1',
    left:
      'C3/1@5 D3/1@4 E3/1@3 F3/1@2 | G3/2@1 G3/2@1 | F3/1@2 E3/1@3 D3/1@4 E3/1@3 | C3/4@5 | ' +
      'E3/1@3 F3/1@2 G3/2@1 | F3/1@2 E3/1@3 D3/2@4 | E3/1@3 D3/1@4 C3/1@5 D3/1@4 | C3/4@5',
  },
  {
    id: 'm3-espelho',
    title: 'Espelho',
    goal:
      'Agora as mãos andam em direções opostas, como num espelho: quando a direita sobe, a esquerda desce. A boa notícia é que os dois lados usam sempre o mesmo número de dedo ao mesmo tempo.',
    bpm: 66,
    beatsPerBar: 4,
    right:
      'C4/1@1 D4/1@2 E4/1@3 F4/1@4 | G4/4@5 | G4/1@5 F4/1@4 E4/1@3 D4/1@2 | C4/4@1 | ' +
      'C4/1@1 E4/1@3 G4/2@5 | E4/1@3 D4/1@2 C4/2@1 | D4/1@2 E4/1@3 F4/1@4 D4/1@2 | C4/4@1',
    left:
      'G3/1@1 F3/1@2 E3/1@3 D3/1@4 | C3/4@5 | C3/1@5 D3/1@4 E3/1@3 F3/1@2 | G3/4@1 | ' +
      'G3/1@1 E3/1@3 C3/2@5 | E3/1@3 F3/1@2 G3/2@1 | F3/1@2 E3/1@3 D3/1@4 F3/1@2 | G3/4@1',
  },
  {
    id: 'm3-carneirinho',
    title: 'Maria tinha um carneirinho',
    goal:
      'A direita toca a melodia em semínimas; a esquerda toca uma nota a cada dois tempos (mínimas) e segura. Conte "1, 2, 3, 4": a esquerda entra só no 1 e no 3.',
    bpm: 80,
    beatsPerBar: 4,
    right:
      'E4/1@3 D4/1@2 C4/1@1 D4/1@2 | E4/1@3 E4/1@3 E4/2@3 | D4/1@2 D4/1@2 D4/2@2 | E4/1@3 G4/1@5 G4/2@5 | ' +
      'E4/1@3 D4/1@2 C4/1@1 D4/1@2 | E4/1@3 E4/1@3 E4/1@3 E4/1@3 | D4/1@2 D4/1@2 E4/1@3 D4/1@2 | C4/4@1',
    left:
      'C3/2@5 E3/2@3 | C3/2@5 E3/2@3 | G3/2@1 F3/2@2 | E3/2@3 C3/2@5 | ' +
      'C3/2@5 E3/2@3 | C3/2@5 E3/2@3 | G3/2@1 F3/2@2 | C3/4@5',
  },
  {
    id: 'm3-pulso-esquerda',
    title: 'Pulso na mão esquerda',
    goal:
      'Os papéis se invertem: a esquerda toca em todos os tempos (Dó, Sol, Mi, Sol) e a direita segura notas longas. Deixe a esquerda firme como um relógio e encaixe a direita por cima.',
    bpm: 72,
    beatsPerBar: 4,
    right:
      'E4/2@3 G4/2@5 | F4/2@4 D4/2@2 | E4/2@3 C4/2@1 | D4/4@2 | ' +
      'E4/2@3 G4/2@5 | F4/2@4 D4/2@2 | D4/1@2 F4/1@4 E4/1@3 D4/1@2 | C4/4@1',
    left:
      'C3/1@5 G3/1@1 E3/1@3 G3/1@1 | D3/1@4 G3/1@1 F3/1@2 G3/1@1 | C3/1@5 G3/1@1 E3/1@3 G3/1@1 | D3/1@4 G3/1@1 F3/1@2 G3/1@1 | ' +
      'C3/1@5 G3/1@1 E3/1@3 G3/1@1 | D3/1@4 G3/1@1 F3/1@2 G3/1@1 | D3/1@4 G3/1@1 F3/1@2 G3/1@1 | C3/4@5',
  },
  {
    id: 'm3-ponte-londres',
    title: 'Ponte de Londres',
    goal:
      'As duas mãos em movimento: a esquerda repete o pulso da lição anterior e a direita toca a melodia, com o ritmo pontuado (longa-curta) no começo das frases. A direita começa com o dedo 4 no Sol.',
    bpm: 76,
    beatsPerBar: 4,
    right:
      'G4/1.5@4 A4/0.5@5 G4/1@4 F4/1@3 | E4/1@2 F4/1@3 G4/2@4 | D4/1@1 E4/1@2 F4/2@3 | E4/1@2 F4/1@3 G4/2@4 | ' +
      'G4/1.5@4 A4/0.5@5 G4/1@4 F4/1@3 | E4/1@2 F4/1@3 G4/2@4 | D4/2@1 G4/2@4 | E4/1@2 C4/3@1',
    left:
      'C3/1@5 G3/1@1 E3/1@3 G3/1@1 | C3/1@5 G3/1@1 E3/1@3 G3/1@1 | D3/1@4 G3/1@1 F3/1@2 G3/1@1 | C3/1@5 G3/1@1 E3/1@3 G3/1@1 | ' +
      'C3/1@5 G3/1@1 E3/1@3 G3/1@1 | C3/1@5 G3/1@1 E3/1@3 G3/1@1 | D3/1@4 G3/1@1 F3/1@2 G3/1@1 | C3/4@5',
  },
  {
    id: 'm3-ao-luar',
    title: 'Ao Luar (Au Clair de la Lune)',
    goal:
      'A melodia passa de uma mão para a outra. A direita começa; no compasso 9 a melodia desce para a esquerda, que muda para a posição de Sol (polegar no Ré, mindinho no Sol). No compasso 13 a direita volta.',
    bpm: 80,
    beatsPerBar: 4,
    right:
      'C4/1@1 C4/1@1 C4/1@1 D4/1@2 | E4/2@3 D4/2@2 | C4/1@1 E4/1@3 D4/1@2 D4/1@2 | C4/4@1 | ' +
      'C4/1@1 C4/1@1 C4/1@1 D4/1@2 | E4/2@3 D4/2@2 | C4/1@1 E4/1@3 D4/1@2 D4/1@2 | C4/4@1 | ' +
      '-/4 | -/4 | -/4 | -/4 | ' +
      'C4/1@1 C4/1@1 C4/1@1 D4/1@2 | E4/2@3 D4/2@2 | C4/1@1 E4/1@3 D4/1@2 D4/1@2 | C4/4@1',
    left:
      'C3/4@5 | C3/2@5 G3/2@1 | C3/2@5 G3/2@1 | C3/4@5 | ' +
      'C3/4@5 | C3/2@5 G3/2@1 | C3/2@5 G3/2@1 | C3/4@5 | ' +
      'D4/1@1 D4/1@1 D4/1@1 D4/1@1 | A3/2@4 A3/2@4 | D4/1@1 C4/1@2 B3/1@3 A3/1@4 | G3/4@5 | ' +
      'C3/4@5 | C3/2@5 G3/2@1 | C3/2@5 G3/2@1 | C3/4@5',
  },
  {
    id: 'm3-valsa',
    title: 'Valsa em Dó (3/4)',
    goal:
      'Compasso de três tempos: conte "1, 2, 3". A esquerda faz o balanço da valsa: uma nota grave no 1 e o Sol no 2 e no 3 ("pum, pá, pá"). A direita canta a melodia por cima.',
    bpm: 84,
    beatsPerBar: 3,
    right:
      'E4/2@3 F4/1@4 | G4/3@5 | F4/2@4 E4/1@3 | D4/3@2 | D4/2@2 E4/1@3 | F4/3@4 | E4/2@3 D4/1@2 | C4/3@1 | ' +
      'E4/1@3 F4/1@4 G4/1@5 | G4/2@5 E4/1@3 | F4/1@4 E4/1@3 D4/1@2 | D4/2@2 F4/1@4 | E4/1@3 F4/1@4 G4/1@5 | E4/2@3 C4/1@1 | D4/1@2 E4/1@3 D4/1@2 | C4/3@1',
    left:
      'C3/1@5 G3/1@1 G3/1@1 | C3/1@5 G3/1@1 G3/1@1 | D3/1@4 G3/1@1 G3/1@1 | D3/1@4 G3/1@1 G3/1@1 | ' +
      'D3/1@4 G3/1@1 G3/1@1 | D3/1@4 G3/1@1 G3/1@1 | C3/1@5 G3/1@1 G3/1@1 | C3/1@5 G3/1@1 G3/1@1 | ' +
      'C3/1@5 G3/1@1 G3/1@1 | C3/1@5 G3/1@1 G3/1@1 | D3/1@4 G3/1@1 G3/1@1 | D3/1@4 G3/1@1 G3/1@1 | ' +
      'C3/1@5 G3/1@1 G3/1@1 | C3/1@5 G3/1@1 G3/1@1 | D3/1@4 G3/1@1 G3/1@1 | C3/3@5',
  },
  {
    id: 'm3-minueto-sol',
    title: 'Minueto em Sol (Petzold)',
    goal:
      'O famoso minueto do Caderno de Anna Magdalena Bach, em Sol maior: o Fá é sempre sustenido (a tecla preta). A direita muda de posição várias vezes, siga os números dos dedos. A esquerda fica na posição de Sol, com notas longas.',
    bpm: 66,
    beatsPerBar: 3,
    keyFifths: 1,
    right:
      'D5/1@5 G4/0.5@1 A4/0.5@2 B4/0.5@3 C5/0.5@4 | D5/1@5 G4/1@1 G4/1@1 | E5/1@3 C5/0.5@1 D5/0.5@2 E5/0.5@3 F#5/0.5@4 | G5/1@5 G4/1@1 G4/1@1 | ' +
      'C5/1@4 D5/0.5@5 C5/0.5@4 B4/0.5@3 A4/0.5@2 | B4/1@3 C5/0.5@4 B4/0.5@3 A4/0.5@2 G4/0.5@1 | F#4/1@1 G4/0.5@2 A4/0.5@3 B4/0.5@4 G4/0.5@2 | A4/3@3 | ' +
      'D5/1@5 G4/0.5@1 A4/0.5@2 B4/0.5@3 C5/0.5@4 | D5/1@5 G4/1@1 G4/1@1 | E5/1@3 C5/0.5@1 D5/0.5@2 E5/0.5@3 F#5/0.5@4 | G5/1@5 G4/1@1 G4/1@1 | ' +
      'C5/1@4 D5/0.5@5 C5/0.5@4 B4/0.5@3 A4/0.5@2 | B4/1@3 C5/0.5@4 B4/0.5@3 A4/0.5@2 G4/0.5@1 | A4/1@3 B4/0.5@4 A4/0.5@3 G4/0.5@2 F#4/0.5@1 | G4/3@2',
    left:
      'G3/2@5 A3/1@4 | B3/3@3 | C4/3@2 | B3/3@3 | A3/3@4 | G3/3@5 | D4/2@1 B3/1@3 | D4/1@1 C4/1@2 A3/1@4 | ' +
      'G3/2@5 A3/1@4 | B3/3@3 | C4/3@2 | B3/3@3 | A3/3@4 | G3/3@5 | D4/2@1 C4/1@2 | B3/1@3 G3/2@5',
  },
];

// Module 4: chords. Triads in root position, then chords as accompaniment under a melody.
// Chord shapes are written once; each note carries its own finger (right hand 1-3-5, left hand 5-3-1).
const RH = {
  C: 'C4@1+E4@3+G4@5',
  F: 'F4@1+A4@3+C5@5',
  G: 'G4@1+B4@3+D5@5',
  Am: 'A3@1+C4@3+E4@5',
  Dm: 'D4@1+F4@3+A4@5',
  Em: 'E4@1+G4@3+B4@5',
  Cm: 'C4@1+Eb4@3+G4@5',
  Gm: 'G4@1+Bb4@3+D5@5',
};
const LH = {
  C: 'C3@5+E3@3+G3@1',
  F: 'F3@5+A3@3+C4@1',
  G: 'G2@5+B2@3+D3@1',
};
/** Left-hand "bass, chord" pair of one chord, 1 beat each: the root, then the other two notes. */
const PAH = {
  C: 'C3@5/1 E3@3+G3@1/1',
  G: 'G2@5/1 B2@3+D3@1/1',
};
/** Writes `chord` for `beats` beats. */
const hold = (chord: string, beats: number) => `${chord}/${beats}`;

export const MODULE_4_SOURCES: LessonSource[] = [
  {
    id: 'm4-triade-do',
    title: 'Sua primeira tríade: Dó maior',
    goal:
      'Um acorde é um grupo de notas tocadas juntas. A tríade de Dó maior (cifra: C) tem três notas: Dó, Mi e Sol. Mão direita na posição de Dó, com os dedos 1, 3 e 5 (polegar, médio e mindinho) descendo ao mesmo tempo. Todas as três teclas têm de soar juntas.',
    bpm: 60,
    beatsPerBar: 4,
    right: [
      hold(RH.C, 4),
      `${hold(RH.C, 2)} ${hold(RH.C, 2)}`,
      `${hold(RH.C, 1)} ${hold(RH.C, 1)} ${hold(RH.C, 2)}`,
      hold(RH.C, 4),
      `${hold(RH.C, 1)} -/1 ${hold(RH.C, 1)} -/1`,
      `${hold(RH.C, 2)} -/2`,
      `${hold(RH.C, 1)} ${hold(RH.C, 1)} ${hold(RH.C, 1)} ${hold(RH.C, 1)}`,
      hold(RH.C, 4),
    ].join(' | '),
  },
  {
    id: 'm4-do-fa-sol',
    title: 'Dó, Fá e Sol',
    goal:
      'Os três acordes mais usados da música: C (Dó maior), F (Fá maior) e G (Sol maior). Cada um tem a mesma forma de tríade, com dedos 1, 3 e 5; só muda de lugar. Mova a mão inteira de uma vez, sem olhar para os dedos.',
    bpm: 60,
    beatsPerBar: 4,
    right: [
      hold(RH.C, 4),
      hold(RH.F, 4),
      hold(RH.G, 4),
      hold(RH.C, 4),
      `${hold(RH.C, 2)} ${hold(RH.F, 2)}`,
      `${hold(RH.G, 2)} ${hold(RH.C, 2)}`,
      `${hold(RH.F, 2)} ${hold(RH.G, 2)}`,
      hold(RH.C, 4),
    ].join(' | '),
  },
  {
    id: 'm4-maior-menor',
    title: 'Maior e menor',
    goal:
      'Um acorde maior soa alegre e um menor soa triste. A diferença é uma só nota: no menor, a nota do meio desce meio tom. Dó maior (C) vira Dó menor (Cm) trocando o Mi pelo Mi bemol, a tecla preta logo ao lado. O mesmo vale para Sol (G) e Sol menor (Gm).',
    bpm: 56,
    beatsPerBar: 4,
    right: [
      hold(RH.C, 4),
      hold(RH.Cm, 4),
      hold(RH.C, 4),
      hold(RH.Cm, 4),
      hold(RH.G, 4),
      hold(RH.Gm, 4),
      `${hold(RH.G, 2)} ${hold(RH.Gm, 2)}`,
      hold(RH.C, 4),
    ].join(' | '),
  },
  {
    id: 'm4-menores',
    title: 'Lá menor, Ré menor e Mi menor',
    goal:
      'Os três acordes menores que combinam com Dó maior: Am (Lá menor), Dm (Ré menor) e Em (Mi menor). Só usam teclas brancas. Repare que o Lá menor começa abaixo do Dó central: leve a mão um pouco para a esquerda.',
    bpm: 56,
    beatsPerBar: 4,
    right: [
      hold(RH.Am, 4),
      hold(RH.Dm, 4),
      hold(RH.Em, 4),
      hold(RH.Am, 4),
      `${hold(RH.C, 2)} ${hold(RH.G, 2)}`,
      `${hold(RH.Am, 2)} ${hold(RH.Em, 2)}`,
      `${hold(RH.Dm, 2)} ${hold(RH.Em, 2)}`,
      hold(RH.Am, 4),
    ].join(' | '),
  },
  {
    id: 'm4-quatro-acordes',
    title: 'Os quatro acordes do pop',
    goal:
      'C – G – Am – F é a sequência de acordes de centenas de músicas. A direita toca o acorde (duas vezes por compasso) e a esquerda toca só a nota de baixo, que é o nome do acorde: Dó, Sol, Lá e Fá. Na cifra, o nome do acorde diz qual é a nota de baixo.',
    bpm: 72,
    beatsPerBar: 4,
    right: [
      `${hold(RH.C, 2)} ${hold(RH.C, 2)}`,
      `${hold(RH.G, 2)} ${hold(RH.G, 2)}`,
      `${hold(RH.Am, 2)} ${hold(RH.Am, 2)}`,
      `${hold(RH.F, 2)} ${hold(RH.F, 2)}`,
      `${hold(RH.C, 2)} ${hold(RH.C, 2)}`,
      `${hold(RH.G, 2)} ${hold(RH.G, 2)}`,
      `${hold(RH.F, 2)} ${hold(RH.F, 2)}`,
      hold(RH.C, 4),
    ].join(' | '),
    left: ['C3@5/4', 'G2@5/4', 'A2@5/4', 'F2@5/4', 'C3@5/4', 'G2@5/4', 'F2@5/4', 'C3@5/4'].join(' | '),
  },
  {
    id: 'm4-acordes-esquerda',
    title: 'Brilha, Brilha com acordes',
    goal:
      'Hora de inverter: a melodia fica na direita e a esquerda toca os acordes (dedos 5, 3 e 1, do grave para o agudo). São só três acordes, C, F e G, e eles mudam no meio de alguns compassos. Olhe a mão esquerda um compasso antes.',
    bpm: 72,
    beatsPerBar: 4,
    right:
      'C4/1@1 C4/1@1 G4/1@4 G4/1@4 | A4/1@5 A4/1@5 G4/2@4 | F4/1@3 F4/1@3 E4/1@2 E4/1@2 | D4/1@1 D4/1@1 C4/2@1 | ' +
      'G4/1@4 G4/1@4 F4/1@3 F4/1@3 | E4/1@2 E4/1@2 D4/2@1 | G4/1@4 G4/1@4 F4/1@3 F4/1@3 | E4/1@2 E4/1@2 D4/2@1 | ' +
      'C4/1@1 C4/1@1 G4/1@4 G4/1@4 | A4/1@5 A4/1@5 G4/2@4 | F4/1@3 F4/1@3 E4/1@2 E4/1@2 | D4/1@1 D4/1@1 C4/2@1',
    left: [
      hold(LH.C, 4),
      `${hold(LH.F, 2)} ${hold(LH.C, 2)}`,
      `${hold(LH.F, 2)} ${hold(LH.C, 2)}`,
      `${hold(LH.G, 2)} ${hold(LH.C, 2)}`,
      `${hold(LH.C, 2)} ${hold(LH.F, 2)}`,
      `${hold(LH.C, 2)} ${hold(LH.G, 2)}`,
      `${hold(LH.C, 2)} ${hold(LH.F, 2)}`,
      `${hold(LH.C, 2)} ${hold(LH.G, 2)}`,
      hold(LH.C, 4),
      `${hold(LH.F, 2)} ${hold(LH.C, 2)}`,
      `${hold(LH.F, 2)} ${hold(LH.C, 2)}`,
      `${hold(LH.G, 2)} ${hold(LH.C, 2)}`,
    ].join(' | '),
  },
  {
    id: 'm4-baixo-acorde',
    title: 'Ode à Alegria: baixo e acorde',
    goal:
      'O acompanhamento mais clássico: a esquerda alterna a nota de baixo e o resto do acorde ("pum-tá, pum-tá"). Em cada compasso a esquerda faz quatro toques, um por tempo, enquanto a direita canta a melodia. O baixo é o dedo 5 e o resto do acorde, os dedos 3 e 1 juntos.',
    bpm: 66,
    beatsPerBar: 4,
    right:
      'E4/1@3 E4/1@3 F4/1@4 G4/1@5 | G4/1@5 F4/1@4 E4/1@3 D4/1@2 | C4/1@1 C4/1@1 D4/1@2 E4/1@3 | E4/1.5@3 D4/0.5@2 D4/2@2 | ' +
      'E4/1@3 E4/1@3 F4/1@4 G4/1@5 | G4/1@5 F4/1@4 E4/1@3 D4/1@2 | C4/1@1 C4/1@1 D4/1@2 E4/1@3 | D4/1.5@2 C4/0.5@1 C4/2@1',
    left: [
      `${PAH.C} ${PAH.C}`,
      `${PAH.G} ${PAH.G}`,
      `${PAH.C} ${PAH.C}`,
      `${PAH.C} ${PAH.G}`,
      `${PAH.C} ${PAH.C}`,
      `${PAH.G} ${PAH.G}`,
      `${PAH.C} ${PAH.C}`,
      `${PAH.G} ${PAH.C}`,
    ].join(' | '),
  },
  {
    id: 'm4-valsa-acordes',
    title: 'Valsa com acordes (3/4)',
    goal:
      'Mesma valsa do módulo anterior, agora com acordes de verdade: a esquerda toca a nota de baixo no 1 e o acorde no 2 e no 3 ("pum, tá, tá"). Dois acordes: C (Dó maior) e G (Sol maior). A direita canta a melodia por cima.',
    bpm: 84,
    beatsPerBar: 3,
    right:
      'E4/2@3 F4/1@4 | G4/3@5 | F4/2@4 E4/1@3 | D4/3@2 | D4/2@2 E4/1@3 | F4/3@4 | E4/2@3 D4/1@2 | C4/3@1 | ' +
      'E4/1@3 F4/1@4 G4/1@5 | E4/2@3 C4/1@1 | D4/1@2 E4/1@3 D4/1@2 | C4/3@1',
    left: [
      'C3@5/1 E3@3+G3@1/1 E3@3+G3@1/1',
      'C3@5/1 E3@3+G3@1/1 E3@3+G3@1/1',
      'G2@5/1 B2@3+D3@1/1 B2@3+D3@1/1',
      'G2@5/1 B2@3+D3@1/1 B2@3+D3@1/1',
      'G2@5/1 B2@3+D3@1/1 B2@3+D3@1/1',
      'G2@5/1 B2@3+D3@1/1 B2@3+D3@1/1',
      'C3@5/1 E3@3+G3@1/1 E3@3+G3@1/1',
      'C3@5/1 E3@3+G3@1/1 E3@3+G3@1/1',
      'C3@5/1 E3@3+G3@1/1 E3@3+G3@1/1',
      'C3@5/1 E3@3+G3@1/1 E3@3+G3@1/1',
      'G2@5/1 B2@3+D3@1/1 B2@3+D3@1/1',
      hold(LH.C, 3),
    ].join(' | '),
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
  {
    id: 'm3',
    title: 'Módulo 3: Mãos independentes',
    description:
      'As duas mãos ao mesmo tempo: em paralelo, em espelho, uma segurando e a outra andando, a melodia passando de mão, valsa em 3/4 e o Minueto em Sol.',
    lessons: MODULE_3_SOURCES.map(buildSong),
  },
  {
    id: 'm4',
    title: 'Módulo 4: Acordes',
    description:
      'Tríades maiores e menores, as cifras (C, Am, G...), os acordes do pop e acompanhar uma melodia com a mão esquerda: baixo e acorde, e a valsa.',
    lessons: MODULE_4_SOURCES.map(buildSong),
  },
];

/** Modules planned for later versions, shown in the path as "em breve". */
export const UPCOMING_MODULES = [
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
