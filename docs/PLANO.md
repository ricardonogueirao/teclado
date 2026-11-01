# Teclado do Ricardo: plano do projeto

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
| Avaliação | Nota certa + tempo certo, em milissegundos, medido pelo horário em que a mensagem MIDI chega ao Chrome. Duração e força ficam para depois. |
| Modos | Apresentação (padrão: a música segue mesmo com erro, que fica marcado), Espera, mãos separadas, repetir trecho, andamento em bpm inteiro. Também há o modo Ouvir. O app lembra o último modo. |
| Metrônomo | Padrão: o do próprio Fantom, que Ricardo ouve no fone ligado ao teclado. Cada lição mostra o bpm para ajustar no Fantom; a música começa na primeira nota tocada junto com o clique, e as 4 primeiras notas fazem o ajuste fino da batida. Opções: clique do app (som do computador, agendado no tempo exato e descontando o atraso de saída de áudio) ou desligado. |
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
- Janelas de tempo no modo Apresentação: até 60 ms = Perfeito, até 140 ms = um pouco adiantado/atrasado, até meio tempo (entre 200 e 350 ms) = muito adiantado/atrasado; além disso a tecla não conta para a nota.
- Tecla errada no modo Apresentação: a nota que estava no momento (a mais próxima no tempo, e depois no som) fica marcada como errada e a música segue. Tecla sem nenhuma nota perto = tecla a mais.
- Nota: `(no tempo + 0,7 × um pouco fora + 0,4 × fora do tempo) / (total + 0,5 × teclas a mais)`. No modo Espera, toda tecla errada é tecla a mais. Estrelas: 60%, 80% e 95%.

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
4. **Módulo 3, metrônomo do Fantom e avaliação de tempo** *(entregue)*
   - Módulo 3, *Mãos independentes*: 8 lições com as duas mãos e dedilhado em todas as notas (mãos em paralelo; espelho; Maria tinha um carneirinho com mínimas na esquerda; pulso na mão esquerda; Ponte de Londres; Ao Luar com a melodia passando de mão; Valsa em Dó em 3/4; Minueto em Sol de Petzold, com Fá sustenido).
   - Dedos da mão esquerda na partitura (em negrito, abaixo da pauta de fá); nas notas caindo, o dedo aparece também em notas curtas.
   - Andamento em bpm em cada lição (trilha, cartão de abertura, topo), com compasso quando não é 4/4; controle de andamento em bpm inteiro com − e +.
   - Metrônomo do Fantom: a música começa na primeira nota tocada junto com o clique; pausar ou mudar o andamento faz o app achar a batida de novo.
   - Modo Apresentação como padrão: tecla errada marca a nota e a música segue; tecla certa logo depois não conta como erro de novo.
   - Avaliação de tempo mais precisa: horário da mensagem MIDI em vez do quadro da tela; clique do app agendado no tempo exato; janelas 60/140 ms e até meio tempo; resultado em ms em cada tecla, medidor de tempo no topo e tendência média no fim.
5. **Módulo 4: acordes** *(entregue)*
   - 8 lições: tríade de Dó maior; Dó, Fá e Sol; maior e menor (C/Cm, G/Gm); Am, Dm e Em; os quatro acordes do pop (C–G–Am–F) com baixo na esquerda; Brilha, Brilha com acordes na esquerda; Ode à Alegria com baixo e acorde; valsa com acordes em 3/4.
   - Notação de lições: cada nota de um acorde pode ter o seu dedo (`C4@1+E4@3+G4@5/4`).
   - Cifras (C, Am...) aparecem só no texto de cada lição; o app ainda não desenha cifras na partitura.
6. **Módulos 5 e 6**: escalas e intermediário. Avaliação de duração e força; relatório das notas que você mais erra.
   - Ideia em aberto: o app mandar o clock MIDI para o Fantom (Sync Mode do Fantom em modo escravo pela USB), para o metrônomo do Fantom seguir o app sozinho, sem ajustar o andamento à mão.

## Testes

- `npm test`: motor de prática (modo Espera e Apresentação, tecla errada que não para a música, janelas de tempo, metrônomo do Fantom com início na primeira nota, ajuste fino e pausa, clique agendado no tempo exato, repetição de trecho sem perder o tempo), configurações antigas convertidas, horário das mensagens MIDI, importação (MIDI gerado no teste, MusicXML com ligaduras, acordes, anacruse e repetições, `.mxl` compactado, sugestões de mãos e oitava), motor de prática, leitura de MIDI, notação, montagem da partitura (compassos, pausas, acordes) e conteúdo das lições: tudo cabe nas 61 teclas, nenhuma nota atravessa a barra de compasso e toda duração pode ser escrita na partitura.
- Teste de ponta a ponta no Chrome com um Fantom simulado: conexão, nota reconhecida, lição completa, acompanhamento enviado ao Fantom.
- Importação testada com arquivos reais de domínio público (Sonatina de Clementi em `.mxl`, Beethoven com voz e 3 bemóis, Bach com notas sobrepostas) e um MIDI no formato do MuseScore.
