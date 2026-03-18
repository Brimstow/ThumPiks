#!/bin/sh
set -e

echo "📦 Installing dependencies..."
npm install --include=dev

echo "🔨 Building application..."
npm run build

# Generate _redirects with API proxy target
# API_PROXY_TARGET is set per deploy context in netlify.toml
if [ -n "$API_PROXY_TARGET" ]; then
  echo "/api/* ${API_PROXY_TARGET}/api/:splat 200" > dist/_redirects
  echo "/* /index.html 200" >> dist/_redirects
  echo "✅ Generated _redirects with proxy to: $API_PROXY_TARGET"
else
  echo "⚠️  WARNING: API_PROXY_TARGET not set!"
  echo "   Falling back to default _redirects (no API proxy)"
  echo "   Safari/iOS users may experience auth failures"
fi
