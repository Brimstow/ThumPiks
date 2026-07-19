import type { Config, Context } from "@netlify/edge-functions";

/**
 * CSP Nonce Edge Function
 *
 * Runs on every HTML page request. Generates a unique cryptographic nonce,
 * replaces the `__CSP_NONCE__` placeholder in the HTML response, and sets
 * the Content-Security-Policy header with the same nonce.
 *
 * This eliminates 'unsafe-inline' from script-src and style-src-elem,
 * completing Security Audit Finding 2 (Phase B).
 *
 * Placeholder is injected by Vite via `html.cspNonce` in vite.config.ts.
 */

const NONCE_PLACEHOLDER = "__CSP_NONCE__";

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export default async (request: Request, context: Context) => {
  const response = await context.next();

  const contentType = response.headers.get("content-type") || "";
  // Only transform HTML responses (skip API, JS, CSS, images, etc.)
  if (!contentType.includes("text/html")) {
    return response;
  }

  const nonce = generateNonce();

  // Replace the Vite placeholder with the real nonce
  const text = await response.text();
  const modified = text.replaceAll(NONCE_PLACEHOLDER, nonce);

  // Build CSP header — mirrors the backend security.middleware.ts directives
  // but adapted for the Netlify-served frontend.
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' https:`,
    `style-src 'self' 'nonce-${nonce}' https: data: blob:`,
    `style-src-elem 'self' 'nonce-${nonce}' https: data: blob:`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: https: blob:`,
    `connect-src 'self' https: ws: wss:`,
    `font-src 'self' https: data: blob:`,
    `object-src 'none'`,
    `media-src 'self' data:`,
    `frame-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ");

  // Return modified response with CSP header
  return new Response(modified, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      "Content-Security-Policy": csp,
    },
  });
};

export const config: Config = {
  path: ["/*"],
  excludedPath: [
    "/api/*",
    "/assets/*",
    "/*.js",
    "/*.css",
    "/*.woff2",
    "/*.png",
    "/*.jpg",
    "/*.svg",
    "/*.ico",
    "/*.json",
    "/*.webp",
    "/*.woff",
  ],
};
