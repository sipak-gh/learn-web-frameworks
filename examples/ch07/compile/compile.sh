#!/usr/bin/env bash
# Compiles TaskItem with the Angular compiler (ngc) from tasklet/angular and
# writes the JavaScript to out/.
set -euo pipefail
cd "$(dirname "$0")"
../../../tasklet/angular/node_modules/.bin/ngc -p tsconfig.json
