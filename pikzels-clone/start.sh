#!/bin/sh
# Migrations are handled by the Railway deploy command in railway.json.
# This script starts the server, rebuilding if dist/ was clobbered by Railpack cache.

if [ ! -f dist/server.js ]; then
  echo "dist/server.js not found — rebuilding (Railpack cache miss)..."
  npx prisma generate
  npx tsc --project tsconfig.build.json
fi

echo "Starting server..."
node dist/server.js
