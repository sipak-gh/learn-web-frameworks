#!/usr/bin/env bash
# Usage: [PROBE=<script.cjs>] ./check.sh <variant-dir>
# Copies tasklet/angular to work/, lays the variant's files over it, builds it,
# serves it on port 4327 and runs the Tasklet suite against it.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
app="$here/../../../tasklet/angular"
e2e="$here/../../../tasklet/e2e"
variant="$here/$1"
work="$here/work"

rm -rf "$work"
mkdir -p "$work"
cp -r "$app/angular.json" "$app/package.json" "$app"/tsconfig*.json "$app/public" "$app/src" "$work/"
ln -s "$app/node_modules" "$work/node_modules"
cp -r "$variant/." "$work/"

cd "$work"
npm run build
node node_modules/http-server/bin/http-server dist/angular/browser -p 4327 -c-1 >/dev/null &
server=$!
trap 'kill $server' EXIT
sleep 2

cd "$e2e"
APP=angular BASE_URL=http://localhost:4327/ TASKLET_WEBSERVER=0 npx playwright test --reporter=line || true
if [ -n "${PROBE:-}" ]; then node "$here/$PROBE" http://localhost:4327/; fi
node "$here/../../../tasklet/tools/size.mjs" "$work/dist/angular/browser" | tail -1
