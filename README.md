# Tecla a Tecla

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
| **Espera** | As notas param na linha até você acertar. Melhor para aprender uma lição nova. |
| **Apresentação** | A música segue no tempo. Cada nota vale Perfeito, Bom (adiantado/atrasado) ou Perdida. |
| **Ouvir** | O app toca a lição para você escutar antes. |

Também na tela da lição: **Mãos** (as duas, só direita, só esquerda), **Velocidade**, **Metrônomo** e **Repetir compassos**.

No topo da lição, **Visual** escolhe entre **Notas caindo**, **Partitura** ou **Ambos**. Na partitura, um cursor mostra onde a música está e fica amarelo quando espera você tocar. **Nomes nas notas** liga ou desliga os nomes embaixo de cada nota: desligue quando quiser treinar a leitura. As lições do Módulo 2 abrem direto na partitura.

Cores nas notas caindo: azul = mão direita, laranja = mão esquerda, cinza = o app toca. Na partitura: azul = próxima nota, verde = acertou, vermelho = perdeu. No teclado: amarelo = tecla que você deve tocar agora, verde = acertou, vermelho = errou.

Todas as lições estão abertas: escolha a que quiser. A nota fica registrada quando você toca a lição inteira com as duas mãos. 60% vale 1 estrela, 80% vale 2 e 95% vale 3.

Atalho: **barra de espaço** começa e pausa.

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
