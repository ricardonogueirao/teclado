# Tecla a Tecla

Keyboard-learning web app (Playground Sessions as the benchmark) for one person: Ricardo, who plays a Roland Fantom 6 (61 keys, MIDI 36–96) over USB on a MacBook Pro M1 in Chrome. Live at https://ricardonogueirao.github.io/teclado/.

## Working with Ricardo

- He is not a programmer. Reply in Brazilian Portuguese, in plain language, outcome first.
- He watches cost: do the task asked, then offer the next step instead of starting it.
- UI text and commit messages in Portuguese; code, identifiers and comments in English.
- `docs/PLANO.md` holds the decisions, the milestone history and what comes next: read it before planning work, and update it when a milestone lands. `README.md` is his user guide: update it whenever something he sees changes.

## Gotchas

- Web MIDI exists only in Chrome/Edge; Safari has none.
- Publishing: `./scripts/deploy.sh` (tests, build, then a new commit on `gh-pages`). Never force-push; it is blocked in cloud sessions. github.io is unreachable from cloud sessions: confirm a deploy through the GitHub API (`repos/ricardonogueirao/teclado/actions/runs`, "pages build and deployment").
- A cloud session cannot reach the real Fantom. Verify in Playwright with a fake keyboard: in `addInitScript`, replace `navigator.requestMIDIAccess` with an object holding an input named `FANTOM-6 7 8` (call its `onmidimessage({ data })` to press keys) and an output whose `send` records messages; make `navigator.permissions.query({ name: 'midi' })` resolve `granted` so the app reconnects after every reload.
- VexFlow is pinned to 4.2.5 on purpose: 5.x loads its fonts from a CDN, which breaks the offline app (`public/sw.js` caches the page network-first and hashed assets cache-first).
- Hands: `R`, `L`, and `A` = accompaniment the app always plays (imported songs only).
- Hand-written lessons use the notation in `src/music/notation.ts`; `src/music/lessons.test.ts` enforces whole bars, the 61-key range, no note crossing a bar line, and durations the sheet can write.
- Imported songs and progress live in the browser's localStorage (`teclado:songs:v1`, `teclado:v1`); there is no server.
