#!/bin/bash
cd /tmp/hoplite/workspace
sed -n '/<script type="module">/,/<\/script>/p' angar.html | sed '1d;$d' > /tmp/mod.mjs
node --check /tmp/mod.mjs && echo "SYNTAX OK"
