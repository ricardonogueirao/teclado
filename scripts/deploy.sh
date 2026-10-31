#!/usr/bin/env bash
# Builds the app and publishes it to the gh-pages branch, which GitHub Pages serves.
set -euo pipefail
cd "$(dirname "$0")/.."

npm test
npm run build
touch dist/.nojekyll

origin="$(git remote get-url origin)"
rev="$(git rev-parse --short HEAD)"
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "Publica versão ${rev}"
git push -f "$origin" gh-pages
rm -rf .git
echo "Publicado. Em 1 a 2 minutos estará em https://ricardonogueirao.github.io/teclado/"
