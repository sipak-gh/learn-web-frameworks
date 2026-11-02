#!/usr/bin/env bash
# Usage: ./check.sh <variant-dir>
# Copies tasklet/solid to work/, lays the variant's files over it, builds it,
# serves it on port 4328 and runs the Tasklet suite against it.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
app="$here/../../../tasklet/solid"
e2e="$here/../../../tasklet/e2e"
variant="$here/$1"
work="$here/work"

rm -rf "$work"
mkdir -p "$work"
cp -r "$app/index.html" "$app/package.json" "$app/tsconfig.json" "$app/vite.config.ts" "$app/public" "$app/src" "$work/"
ln -s "$app/node_modules" "$work/node_modules"
cp -r "$variant/." "$work/"

cd "$work"
npm run build
node node_modules/vite/bin/vite.js preview --port 4328 --strictPort >/dev/null &
server=$!
trap 'kill $server' EXIT
sleep 2

cd "$e2e"
APP=solid BASE_URL=http://localhost:4328/ TASKLET_WEBSERVER=0 npx playwright test --reporter=line || true
node "$here/row-identity.cjs" http://localhost:4328/
node "$here/../../../tasklet/tools/size.mjs" "$work/dist" | tail -1
