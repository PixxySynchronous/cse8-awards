#!/bin/sh
# Deploys the site to Vercel from a copy without git history.
# Vercel's free plan checks the latest commit's author email, and this repo uses a private GitHub address.
set -e
cd "$(dirname "$0")"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
rsync -a --exclude .git --exclude node_modules --exclude print --exclude backup --exclude migrate --exclude qr ./ "$TMP/"
cd "$TMP"
"${VERCEL:-vercel}" deploy --prod --yes
