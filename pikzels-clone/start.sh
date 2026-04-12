#!/bin/sh
# Migrations are handled by the Railway deploy command in railway.json.
# This script only starts the server.
echo "Starting server..."
node dist/server.js
