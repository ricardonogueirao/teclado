#!/usr/bin/env bash
# Builds the app and adds it as a new commit on the gh-pages branch, which GitHub Pages serves.
# Never rewrites history: each publish is a normal commit on top of the previous one.
set -euo pipefail
cd "$(dirname "$0")/.."

npm test
npm run build
touch dist/.nojekyll

rev="$(git rev-parse --short HEAD)"
work="$(mktemp -d)/gh-pages"
if git fetch -q origin gh-pages 2>/dev/null; then
  git worktree add -q --detach "$work" FETCH_HEAD
else
  git worktree add -q --orphan -b gh-pages "$work"
fi

# Replace the published files with the new build (inside the temporary worktree only).
find "$work" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -r {} +
cp -R dist/. "$work"/

git -C "$work" add -A
if git -C "$work" diff --cached --quiet; then
  echo "Nada mudou desde a última publicação."
else
  git -C "$work" commit -q -m "Publica versão ${rev}"
  git -C "$work" push -q origin HEAD:refs/heads/gh-pages
  echo "Publicado. Em 1 a 2 minutos estará em https://ricardonogueirao.github.io/teclado/"
fi
git worktree remove "$work"
