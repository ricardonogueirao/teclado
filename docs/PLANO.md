# Tecla a Tecla: plano do projeto

App para aprender teclado com o Roland Fantom 6, tendo o Playground Sessions como referência. Uso pessoal, roda no Google Chrome do MacBook.

## Decisões

| Tema | Decisão |
| --- | --- |
| Uso | Pessoal, um único aluno, sem login. |
| Plataforma | App web no Chrome, publicado no GitHub Pages (gratuito) e instalável no Mac, funcionando sem internet. O Chrome lê o teclado pela Web MIDI API; o Safari não tem suporte. |
| Custo | Usar o app não consome créditos do Claude nem de nenhum serviço: tudo roda no Chrome. O Claude só é usado para desenvolver novas versões. |
| Conexão | Fantom 6 → cabo USB na porta **USB COMPUTER** → MacBook Pro M1 (macOS Tahoe 26). |
| Zonas | Uma zona só. Se houver layer ou split, o app junta as notas repetidas de canais diferentes. |
| Som | Você ouve o próprio Fantom. O acompanhamento (a mão que você não está tocando) é enviado ao Fantom por MIDI no canal 1; sem Fantom, toca no som do computador. |
| Visual | Notas caindo, partitura ou ambos, escolhido na tela da lição. |
| Avaliação | Nota certa + tempo certo. Duração e força ficam para depois. |
| Modos | Espera, Apresentação, mãos separadas, repetir trecho, velocidade + metrônomo. Também há o modo Ouvir. |
| Conteúdo | Trilha estruturada, com todas as lições abertas para você escolher, + músicas pop importadas. |
| Progresso | Salvo no próprio navegador: melhor nota, estrelas, dias seguidos. |
| Nomes das notas | Dó · C (os dois), com opção de só um. |

## Músicas pop

O Spotify e o YouTube Premium entregam **áudio gravado**. Para avaliar se você tocou certo, o app precisa da **partitura** (quais notas e em que momento). Converter uma gravação completa (voz, bateria, banda) em notas automaticamente erra demais para servir de lição. Além disso, extrair o áudio desses serviços viola os termos de uso e a proteção contra cópia deles.

**Proposta:** importar arranjos para piano em **MusicXML** ou **MIDI**. A fonte recomendada é o [MuseScore.com](https://musescore.com), que tem arranjos de músicas pop em vários níveis, inclusive "fácil" e "iniciante". Baixar costuma exigir a assinatura MuseScore Pro. O arquivo importado fica só no seu Mac. A mão esquerda e os outros instrumentos do arquivo viram o acompanhamento.

## Arquitetura

```
Fantom 6 ──USB──> Chrome (Web MIDI) ──> midi/midiConnection.ts ──┐
Teclado do computador / mouse ───────> midi/computerKeyboard.ts ─┤  eventos de tecla
                                                                  v
                     music/lessons.ts ──> engine/practice.ts  (motor puro, testado)
                     (trilha, notação)        │  avança o tempo, compara, pontua
                                              v
          ui/LessonPlayer.tsx ── ui/FallingNotes.tsx (canvas) + ui/SheetMusic.tsx (VexFlow) + ui/Keyboard.tsx
                │
                ├─> audio/sound.ts      (metrônomo, som do simulador)
                ├─> MIDI de volta ao Fantom (acompanhamento)
                └─> store/progress.ts   (progresso no navegador)
```

- `engine/practice.ts` não depende de tela nem de relógio: recebe o tempo e as teclas e devolve eventos. Por isso pode ser testado a fundo.
- Janelas de tempo no modo Apresentação: até 80 ms = Perfeito, até 180 ms = Bom (adiantado/atrasado), além disso = nota errada ou perdida.
- Nota: `(perfeitas + 0,7 × boas) / (total + 0,5 × teclas erradas)`. Estrelas: 60%, 80% e 95%.

## Marcos

1. **Conexão e primeira trilha** *(entregue)*
   - Conexão com o Fantom, teste de teclado e painel de diagnóstico MIDI.
   - Módulo 1 com 9 lições (exercícios próprios + Ode à Alegria, Brilha Brilha Estrelinha, Bate o Sino).
   - Notas caindo, teclado de 61 teclas, dedilhado, os cinco modos, acompanhamento no Fantom, estrelas e progresso.
   - Simulador pelo teclado do computador.
   - Lições todas desbloqueadas; app instalável no Mac e funcionando sem internet.
2. **Partitura e Módulo 2** *(entregue)*
   - Partitura desenhada com a VexFlow 4 (fontes embutidas, funciona sem internet): clave de sol e de fá, chave unindo as pautas, colcheias com barra, pausas, dedilhado e nomes das notas.
   - Partitura em uma linha que rola com a música; cursor que para no modo Espera; notas azuis (próxima), verdes (acertou) e vermelhas (perdeu).
   - Visual escolhido na lição (Notas caindo, Partitura, Ambos) e lembrado.
   - Módulo 2, *Lendo partitura*: 10 lições (Dó, Ré, Mi e Fá, Sol na clave de sol; posição de Sol; clave de fá; Dó central nas duas claves; segundas e terças; quartas e quintas; colcheias; Frei Martinho; Brilha, Brilha nas duas claves).
3. **Importar músicas** *(entregue)*
   - Leitura de MusicXML (`.musicxml`, `.xml` e `.mxl` compactado, aberto com a descompressão do próprio Chrome) e MIDI (`.mid`, tipos 0 e 1).
   - MusicXML: uma trilha por pauta, ligaduras unidas, notas de enfeite ignoradas, dedilhado lido, anacruse alinhada, ritornelos e casas 1/2 tocados na ordem.
   - Escolha de quem toca cada parte (mão direita, esquerda, acompanhamento do app, não usar), com sugestão automática; bateria nunca vira mão.
   - Ajuste às 61 teclas: muda a oitava de tudo só quando vale a pena; notas avulsas mudam de oitava sozinhas.
   - Partitura para qualquer música: armadura de clave, acidentes automáticos, nomes com bemol em tons bemóis, ligaduras na barra de compasso, notas sobrepostas na mesma mão, compassos como 3/4 e 6/8.
   - Biblioteca pessoal no Chrome, com estrelas e recorde.
   - Limitações conhecidas: D.S., D.C. e Coda não são seguidos; mudanças de andamento ou de compasso no meio da música são ignoradas (vale o primeiro); quiálteras aparecem arredondadas na partitura (a avaliação usa o tempo exato); nota longa segurada sob outras na mesma mão aparece encurtada na partitura.
4. **Módulo 3**: mãos independentes.
5. **Módulos 4 a 6**: acordes, escalas e intermediário. Avaliação de duração e força; relatório das notas que você mais erra.

## Testes

- `npm test`: importação (MIDI gerado no teste, MusicXML com ligaduras, acordes, anacruse e repetições, `.mxl` compactado, sugestões de mãos e oitava), motor de prática, leitura de MIDI, notação, montagem da partitura (compassos, pausas, acordes) e conteúdo das lições: tudo cabe nas 61 teclas, nenhuma nota atravessa a barra de compasso e toda duração pode ser escrita na partitura.
- Teste de ponta a ponta no Chrome com um Fantom simulado: conexão, nota reconhecida, lição completa, acompanhamento enviado ao Fantom.
- Importação testada com arquivos reais de domínio público (Sonatina de Clementi em `.mxl`, Beethoven com voz e 3 bemóis, Bach com notas sobrepostas) e um MIDI no formato do MuseScore.
