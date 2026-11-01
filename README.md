# Teclado do Ricardo

App para aprender teclado tocando no seu Roland Fantom 6. Ele reconhece cada tecla que você toca e mostra na hora se está certo, como o Playground Sessions.

**Abrir o app:** https://ricardonogueirao.github.io/teclado/ (no **Google Chrome**)

## Primeira vez

1. Ligue o Fantom no Mac com o cabo USB na porta **USB COMPUTER** (traseira do Fantom).
2. Abra o endereço acima no **Chrome**. O Safari não funciona: ele não lê teclados MIDI.
3. Clique em **Conectar teclado** e depois em **Permitir** no aviso do Chrome.
4. Toque qualquer tecla: o nome da nota aparece e a tecla acende na tela.

Nas próximas vezes o app conecta sozinho.

## Instalar no Mac

Clique em **Instalar no Mac** no topo da tela inicial (ou no ícone de instalar na barra de endereço do Chrome). O app ganha ícone próprio no Dock e no Launchpad e abre em janela própria.

Depois da primeira visita o app funciona **sem internet**. Quando houver versão nova, ela é baixada sozinha na próxima vez que você abrir com internet.

O app não usa o Claude nem nenhum serviço pago: ele roda inteiro no Chrome do seu Mac. O progresso fica salvo no próprio Chrome.

## No Fantom

- Use **uma zona só**.
- Deixe **Octave Shift** e **Transpose** desligados. Senão as notas chegam deslocadas e o app avisa.
- O acompanhamento (a mão que você não está tocando) toca no próprio Fantom, pelo canal 1.

## Como praticar

| Modo | Para quê |
| --- | --- |
| **Apresentação** | A música segue no tempo, mesmo se você errar: a tecla errada fica marcada em vermelho e você continua nas próximas. Cada nota recebe a avaliação de tempo (veja abaixo). É o modo em que as lições abrem. |
| **Espera** | As notas param na linha até você acertar. Útil para decifrar uma lição nova. |
| **Ouvir** | O app toca a lição para você escutar antes. |

O app lembra o último modo que você escolheu.

Também na tela da lição: **Mãos** (as duas, só direita, só esquerda), **Andamento**, **Metrônomo** e **Repetir compassos**.

## Metrônomo no fone do Roland

Cada lição mostra o andamento do metrônomo em **bpm**: na lista da trilha, no cartão de abertura e no topo da lição. Compassos diferentes de 4/4 aparecem junto (por exemplo "84 bpm · 3/4").

Para ouvir o metrônomo no fone ligado ao Fantom:

1. Na lição, deixe **Metrônomo: Do Roland** (é o padrão; também dá para mudar em *Configurações* na tela inicial).
2. No Fantom, ajuste o andamento (TEMPO) para o número que a lição mostra e ligue o metrônomo dele.
3. Clique em **Começar**. As notas descem e param na primeira nota, com o aviso "Toque … junto com um clique do Roland".
4. Toque a primeira nota junto com um clique. A partir daí a música segue no tempo do Roland. As primeiras notas ainda fazem um ajuste fino de onde cai a batida.

Se você **pausar**, a música espera de novo na próxima nota: volte a tocar junto com um clique. Se mudar o **Andamento** no app, mude também no Fantom; o app só usa números inteiros de bpm, iguais aos do Fantom. Os botões **−** e **+** mudam 1 bpm por vez.

As outras opções: **Do app** faz o clique no som do computador (não chega ao fone do Fantom); **Desligado** só faz a contagem antes de começar.

## Como o tempo é avaliado

No modo Apresentação, cada tecla é comparada com o momento exato da nota. O app usa o horário em que a mensagem do Fantom chega pelo USB, não o momento em que a tela atualiza.

| Resultado | Diferença |
| --- | --- |
| **Perfeito** (no tempo) | até 60 ms |
| **Adiantado / Atrasado** (um pouco fora) | até 140 ms |
| **Muito adiantado / Muito atrasado** (fora do tempo) | até meio tempo da música (entre 200 e 350 ms) |
| Mais longe que isso | não conta para a nota: vira tecla errada ou nota perdida |

- Cada tecla mostra o resultado em milissegundos sobre a nota e no **medidor** no topo da tela: pontos à esquerda do centro são notas adiantadas, à direita atrasadas. A faixa verde é "no tempo", a amarela "um pouco fora".
- **Tecla errada** no lugar de uma nota: a nota fica vermelha e conta como errada; a música não para. Se logo depois você tocar a tecla certa, ela não conta de novo como erro.
- **Tecla a mais** (sem nenhuma nota naquele momento) tira um pouco da nota final.
- No fim, o cartão mostra quantas notas foram no tempo, um pouco fora, fora do tempo, erradas e perdidas, e a sua tendência: "Na média você tocou 30 ms atrasado".

No topo da lição, **Visual** escolhe entre **Notas caindo**, **Partitura** ou **Ambos**. Na partitura, um cursor mostra onde a música está e fica amarelo quando espera você tocar. **Nomes nas notas** liga ou desliga os nomes embaixo de cada nota: desligue quando quiser treinar a leitura. As lições do Módulo 2 abrem direto na partitura.

Cores nas notas caindo: azul = mão direita, laranja = mão esquerda, cinza = o app toca, vermelho = errou ou perdeu. Na partitura: azul = próxima nota, verde = acertou, vermelho = errou ou perdeu. No teclado: amarelo = tecla que você deve tocar agora, verde = acertou, vermelho = errou.

Os números são os dedos: 1 = polegar, 2 = indicador, 3 = médio, 4 = anelar, 5 = mindinho. Na partitura, os dedos da mão direita ficam acima da pauta de sol e os da mão esquerda, em negrito, logo abaixo da pauta de fá. Nas notas caindo, o número fica dentro da nota; no teclado, na tecla amarela.

A trilha tem quatro módulos: **1. Primeiros passos**, **2. Lendo partitura**, **3. Mãos independentes** (mãos em paralelo e em espelho, uma mão segurando e a outra andando, a melodia passando de mão, valsa em 3/4 e o Minueto em Sol) e **4. Acordes** (tríades maiores e menores, Dó-Fá-Sol, os quatro acordes do pop, acordes na mão esquerda, baixo e acorde, e a valsa com acordes). Nos acordes, cada nota tem o seu dedo, e o nome do acorde (a cifra, como C ou Am) vem explicado no texto da lição. Todas as lições estão abertas: escolha a que quiser. A nota fica registrada quando você toca a lição inteira com as duas mãos. 60% vale 1 estrela, 80% vale 2 e 95% vale 3.

Atalho: **barra de espaço** começa e pausa.

## Suas músicas (MuseScore)

Na tela inicial, **Minhas músicas → Importar música** (ou arraste o arquivo para lá).

1. No **MuseScore.com**, procure a música com "piano" e, se quiser, o nível ("easy piano"). Abra a partitura, clique em **Baixar** e escolha **MusicXML**. Baixar costuma exigir a assinatura MuseScore Pro.
2. Importe o arquivo. O app mostra as partes da partitura e sugere quem toca cada uma: **Mão direita**, **Mão esquerda**, **O app toca** (acompanhamento, por exemplo a voz) ou **Não usar**.
3. Se alguma nota não couber nas 61 teclas, o app a traz para dentro mudando de oitava. Você também pode mudar a oitava de tudo.
4. **Salvar e abrir**. A música fica guardada em *Minhas músicas*, com estrelas e recorde como as lições.

Formatos: MusicXML (`.mxl`, `.musicxml`, `.xml`) é o melhor, porque a partitura sai como a original, com dedilhado quando houver. MIDI (`.mid`) também funciona, mas só traz as notas, então a partitura é montada a partir delas e pode sair simplificada.

As músicas ficam guardadas só no Chrome deste Mac. Se você apagar os dados do site, elas somem: guarde os arquivos baixados.

## Sem o teclado

Dá para tocar pelo teclado do computador: `A S D F G H J K` são as teclas brancas, `W E T Y U` as pretas, `Z` e `X` mudam a oitava. Também dá para clicar nas teclas da tela.

## Problemas comuns

- **"Nenhum teclado encontrado"**: confira se o Fantom está ligado e o cabo está na porta USB COMPUTER. Se ele não aparecer no app "Configuração de Áudio e MIDI" do Mac, o problema está no cabo ou no driver, não no app.
- **"O Chrome bloqueou o acesso"**: clique no ícone à esquerda do endereço, em "Dispositivos MIDI" escolha Permitir e recarregue.
- **Uma tecla não é reconhecida**: abra *Configurações → Diagnóstico MIDI* na tela inicial e veja se a mensagem chega.

O plano do projeto e as próximas etapas estão em [docs/PLANO.md](docs/PLANO.md).

## Para desenvolvedores

```bash
npm install
npm run dev      # servidor local
npm test         # testes
./scripts/deploy.sh   # publica no GitHub Pages (ramo gh-pages)
```

React + TypeScript + Vite. O motor de prática (`src/engine/practice.ts`) é independente da interface e coberto por testes.
