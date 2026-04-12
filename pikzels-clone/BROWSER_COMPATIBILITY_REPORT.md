# ThumPiks Browser Compatibility Report

**Generated:** April 12, 2026  
**Tech Stack:** React 19 · Vite 6 · Tailwind CSS v4 · TensorFlow.js · FFmpeg.wasm · MediaPipe

---

## Executive Summary

ThumPiks uses several bleeding-edge browser APIs (SharedArrayBuffer, WebAssembly, Canvas 2D, WebGL, Clipboard API, Web Workers, Web Notifications). This report identifies **15 cross-browser issues** ranked by severity, with fixes.

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 4 | Will break core features in some browsers |
| 🟡 High | 5 | Degraded experience or silent failures |
| 🟢 Medium | 6 | Minor visual/UX differences |

---

## 🔴 CRITICAL ISSUES

### 1. FFmpeg.wasm — No COOP/COEP Headers in Production (Netlify)

**Affected:** Safari, Firefox, Chrome (all browsers in production)  
**File:** `client/netlify.toml` — missing `[[headers]]` for COOP/COEP  
**File:** `client/vite.config.ts:31-33` — headers set for dev only  

**Problem:** FFmpeg.wasm multi-threaded build requires `SharedArrayBuffer`, which needs cross-origin isolation. Your Vite dev server sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless`, but **your Netlify production config has NO such headers**. FFmpeg will fail with `SharedArrayBuffer is not defined` in production.

**Additional Safari issue:** Safari does NOT support `COEP: credentialless` — only `require-corp`. Your Vite dev config uses `credentialless`, which means FFmpeg multi-thread will also fail on Safari during local dev.

**Fix:**
```toml
# Add to netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

**Caveat:** `require-corp` will block any cross-origin resource (Google Fonts, analytics scripts, Cloudinary images, unpkg CDN) that doesn't send `Cross-Origin-Resource-Policy: cross-origin`. This means:
- Google Fonts import in `index.css` line 1 will break
- FFmpeg core loaded from `unpkg.com` (video-service.ts:79) will break
- Cloudinary image URLs will break

**Recommended approach:** Either:
- **(A)** Self-host FFmpeg core and use single-threaded fallback when `!window.crossOriginIsolated`
- **(B)** Scope COOP/COEP to only the video editor route via Netlify Edge Functions
- **(C)** Add `crossorigin` attributes and ensure all external resources support CORS

---

### 2. Safari ITP — Third-Party Cookie Blocking (Auth)

**Affected:** Safari 16.4+ (all versions)  
**File:** `client/netlify.toml:6-14` — proxy architecture comment  

**Status: ALREADY MITIGATED** ✅ — Your Netlify proxy architecture routes API calls through same-origin, making cookies first-party. This is good. However, verify:
- `sameSite=lax` is set on all auth cookies (not `none`)
- No direct API calls bypass the proxy in production (check `VITE_API_URL=""`)
- localStorage fallback exists if cookies are still blocked in Private Browsing mode

**Risk:** Safari Private Browsing blocks localStorage too in some configurations. If auth depends on localStorage as fallback, users in Safari Private mode may be unable to stay logged in.

---

### 3. TensorFlow.js + MediaPipe — Safari WebGL Failures

**Affected:** Safari (especially iOS Safari), Firefox (partial)  
**Files:**
- `client/src/services/ai-providers/tensorflow.provider.ts`
- `client/src/workers/ai-worker.ts`

**Problems:**
1. **Safari WebGL in Web Workers:** TensorFlow.js WebGL backend fails in Safari Web Workers (fixed in macOS 14.5+/Safari 17.5+ but older versions crash). Your `ai-worker.ts` uses Web Workers for AI tasks.
2. **iOS Safari hangs:** TensorFlow.js with WebGL backend hangs on iOS Safari. Known fix is to fall back to `cpu` backend on iOS.
3. **MediaPipe WASM in Safari:** The `@mediapipe/selfie_segmentation` loaded via CDN (tensorflow.provider.ts:73) may throw `EvalError: Refused to create a WebAssembly object` if CSP headers restrict `wasm-unsafe-eval`.
4. **No backend fallback:** Your code doesn't detect browser/platform and doesn't fall back gracefully.

**Fix — Add browser-aware backend selection:**
```typescript
// In tensorflow.provider.ts or ai-worker.ts
async function selectBestBackend(): Promise<string> {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  
  if (isIOS) return 'cpu'; // WebGL hangs on iOS Safari
  if (isSafari) {
    try {
      await tf.setBackend('webgl');
      return 'webgl';
    } catch {
      return 'wasm'; // fallback
    }
  }
  return 'webgl'; // Chrome/Firefox default
}
```

---

### 4. FFmpeg Loading from unpkg CDN — CORS & COEP Conflict

**Affected:** All browsers when COEP is enabled  
**File:** `client/src/services/video/video-service.ts:79-102`

**Problem:** FFmpeg core is loaded from `https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm`. When COEP `require-corp` is active, this cross-origin fetch will be blocked unless unpkg sends `Cross-Origin-Resource-Policy: cross-origin` (it doesn't reliably).

You convert to blob URLs via `toBlobURL()` which should work, but the initial fetch to unpkg still needs CORS headers. If unpkg doesn't send proper CORS headers, this breaks.

**Fix:** Self-host the FFmpeg WASM core files in `public/ffmpeg/`:
```typescript
// Replace unpkg with self-hosted
const baseURL = '/ffmpeg'; // served from public/ffmpeg/
await this.ffmpeg.load({
  coreURL: '/ffmpeg/ffmpeg-core.js',
  wasmURL: '/ffmpeg/ffmpeg-core.wasm',
  classWorkerURL: '/ffmpeg/worker.js',
});
```

---

## 🟡 HIGH SEVERITY ISSUES

### 5. Clipboard API — No Fallback for Firefox/Older Browsers

**Affected:** Firefox (requires user gesture + Permissions API), older browsers  
**Files:** `Dashboard.tsx:240`, `AIToolsPanel.tsx:535`, `VisionToolPage.tsx`

**Problem:** `navigator.clipboard.writeText()` is used without try/catch or fallback. In Firefox, Clipboard API requires:
- A user gesture (click handler) — ✅ you have this
- Secure context (HTTPS) — ✅ Netlify provides this
- **But:** Firefox may throw if the document isn't focused or permissions are denied

**Fix:** Wrap all clipboard calls:
```typescript
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / permission denied
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
```

---

### 6. Tailwind CSS v4 — Safari 15 Compatibility

**Affected:** Safari 15.x (released Sep 2021, still in use ~2-3% of Safari users)  
**File:** `client/src/index.css`, all Tailwind utility usage

**Problem:** Tailwind CSS v4 requires:
- **CSS `@layer`** — Safari 15.4+ ✅ (but 15.0–15.3 ❌)
- **`oklch()` colors** — Safari 15.4+ partial, full from 16.2
- **CSS nesting** — handled by Tailwind's Lightning CSS, so OK
- **`@property`** — Safari 15.4+, polyfilled by Tailwind v4.1+

**Tailwind v4's official minimum:** Chrome 111, Safari 16.4, Firefox 128.

**Your Vite build target:** Defaults to `baseline-widely-available` (Safari 16.4+). Users on Safari 15.x will see broken layouts.

**Fix:** This is acceptable — Safari 15 is <3% market share. If you need to support it, use `@vitejs/plugin-legacy`. Otherwise, document minimum browser requirements on your site.

---

### 7. Web Notifications — Safari Requires User Interaction

**Affected:** Safari (desktop + iOS 16.4+)  
**Files:** `hooks/useNotifications.ts`, `components/notifications/` (56+ matches)

**Problem:** Safari requires:
1. User to explicitly grant permission via a user gesture (button click)
2. iOS Safari 16.4+ supports Web Push but requires the site to be added to Home Screen
3. `Notification.requestPermission()` must be called from a user gesture in Safari

**Fix:** Ensure permission request is triggered by a button click, not on page load. Add feature detection:
```typescript
const supportsNotifications = 'Notification' in window;
const supportsWebPush = 'PushManager' in window;
// iOS Safari web push requires standalone mode
const isIOSStandalone = window.navigator.standalone === true;
```

---

### 8. `canvas.toBlob()` / `toDataURL()` — Safari Memory Limits

**Affected:** Safari (especially iOS), mobile browsers  
**Files:** 85+ files using Canvas API (ThumbnailStudio, CanvasEngine, PresetEditor, QuickEditView, etc.)

**Problem:** iOS Safari has aggressive memory limits for canvas:
- **iOS Safari limit:** ~100-120 MB total for canvas elements
- Maximum canvas size: ~16 megapixels (4096×4096) on iPhone, 64MP on iPad
- `canvas.toBlob()` can silently fail or return null on memory pressure
- `toDataURL()` on large canvases can cause tab crash

**Fix:** Add canvas size validation:
```typescript
function getMaxCanvasSize(): { width: number; height: number } {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) return { width: 4096, height: 4096 };
  return { width: 16384, height: 16384 }; // Desktop limit
}

// Before canvas.toBlob()
if (!blob) {
  console.error('toBlob returned null — canvas too large or memory pressure');
  // Fallback: scale down canvas and retry
}
```

---

### 9. Google Fonts Import — COEP Blocking

**Affected:** All browsers when COEP is enabled  
**File:** `client/src/index.css:1`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter&...');
```

**Problem:** When `Cross-Origin-Embedder-Policy: require-corp` is set, this cross-origin font import will be blocked because Google Fonts doesn't send `Cross-Origin-Resource-Policy: cross-origin`.

**Fix options:**
1. Self-host fonts using `@fontsource/inter` npm package
2. Use `<link>` with `crossorigin` attribute in HTML
3. Use COEP `credentialless` instead (but Safari doesn't support it)

---

## 🟢 MEDIUM SEVERITY ISSUES

### 10. `backdrop-filter` (Blur Effects) — Firefox Partial Support

**Affected:** Firefox (requires `layout.css.backdrop-filter.enabled` flag until Firefox 103)  
**Files:** 414 matches across 81 CSS/TSX files using `backdrop-blur`, `backdrop-filter`

**Current status:** Firefox 103+ supports `backdrop-filter` without flags. Firefox 102 and below don't. Your Tailwind minimum target (Firefox 128) means this is fine for your target audience. No fix needed unless you support older Firefox.

---

### 11. `overscroll-behavior-x` — Safari iOS Partial Support

**Affected:** iOS Safari (limited support)  
**File:** `client/src/index.css:17`

```css
overscroll-behavior-x: none;
```

iOS Safari has partial support for `overscroll-behavior`. The horizontal axis override may not work, allowing unwanted back-navigation swipe gestures.

**Fix:** Add `-webkit-overflow-scrolling: touch` and use `touch-action` as supplementary:
```css
body {
  overscroll-behavior-x: none;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y; /* prevent horizontal swipe nav */
}
```

---

### 12. `navigator.maxTouchPoints` — IE/Legacy Check

**Affected:** None (minor code quality)  
**File:** `client/src/hooks/useDeviceDetection.ts:51`

```typescript
// @ts-expect-error - msMaxTouchPoints is IE-specific
navigator.msMaxTouchPoints > 0
```

This IE-specific property is dead code. IE is not supported. Remove to reduce bundle size and code noise.

---

### 13. Web Workers with ES Modules

**Affected:** Firefox (supported since v114), Safari (since 15.5)  
**File:** `client/src/hooks/useAIWorker.ts:37-39`

```typescript
workerRef.current = new Worker(
  new URL('../workers/ai-worker.ts', import.meta.url),
  { type: 'module' }
);
```

Module workers (`type: 'module'`) are supported in Chrome 80+, Firefox 114+, Safari 15.5+. Your minimum targets should be fine, but add graceful degradation if the worker fails to initialize.

---

### 14. `window.matchMedia` — `addEventListener` vs `addListener`

**Affected:** Safari 13 and below (not your target)  
**File:** `client/src/hooks/useDeviceDetection.ts:127-128`

```typescript
mobileQuery.addEventListener('change', handleMediaChange);
```

Modern API is used correctly. Safari 14+ supports `addEventListener` on `MediaQueryList`. No fix needed for your target browsers.

---

### 15. Framer Motion — Safari Animation Performance

**Affected:** Safari, iOS Safari  
**Dependency:** `framer-motion: ^12.4.10`

**Problem:** Framer Motion's `AnimatePresence` and spring animations can cause high CPU usage on Safari due to different compositor behavior. The `AnimatedBackground.tsx` component uses canvas + requestAnimationFrame which compounds this.

**Fix:** Add `will-change: transform` to animated elements and use `transform3d(0,0,0)` to trigger GPU acceleration on Safari. Consider `prefers-reduced-motion` media query for performance-sensitive users.

---

## Browser Support Matrix

| Feature | Chrome 111+ | Firefox 128+ | Safari 16.4+ | Safari 15.x | iOS Safari | Edge |
|---------|:-----------:|:------------:|:------------:|:-----------:|:----------:|:----:|
| Core UI (Tailwind v4) | ✅ | ✅ | ✅ | ❌ broken | ✅ | ✅ |
| Auth (cookies) | ✅ | ✅ | ✅ (via proxy) | ✅ | ⚠️ Private | ✅ |
| Canvas Editor | ✅ | ✅ | ✅ | ✅ | ⚠️ memory | ✅ |
| FFmpeg Video | ✅* | ✅* | ❌ no credentialless | ❌ | ❌ | ✅* |
| TensorFlow.js | ✅ | ✅ | ⚠️ WebGL quirks | ❌ | ❌ crashes | ✅ |
| MediaPipe | ✅ | ✅ | ⚠️ CSP issues | ❌ | ❌ | ✅ |
| Clipboard | ✅ | ⚠️ permissions | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ⚠️ gesture req | ⚠️ | ⚠️ PWA only | ✅ |
| Web Workers (module) | ✅ | ✅ | ✅ | ⚠️ 15.5+ | ⚠️ | ✅ |
| backdrop-filter | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

*\* Requires COOP/COEP headers (currently missing in production)*

---

## Priority Action Items

| # | Action | Effort | Impact | Status |
|---|--------|--------|--------|--------|
| 1 | Add COOP/COEP headers to Netlify (`credentialless`) | Medium | Enables FFmpeg in production | ✅ FIXED |
| 2 | Add TensorFlow.js backend fallback (MediaPipe → TF.js runtime) | Low | Fixes Safari/iOS crashes | ✅ FIXED |
| 3 | Self-host Google Fonts (use @fontsource) | Low | Fixes COEP font blocking | N/A (`credentialless` doesn't block) |
| 4 | Wrap clipboard API with fallback | Low | Fixes Firefox edge cases | ✅ FIXED (browserCompat.ts) |
| 5 | Add canvas size limits for iOS Safari | Low | Prevents iOS crashes | ✅ FIXED |
| 6 | Add `crossOriginIsolated` check + single-thread FFmpeg fallback | Medium | Safari video support | ✅ FIXED |
| 7 | Harden localStorage for Safari Private Browsing | Low | Prevents auth errors | ✅ FIXED |
| 8 | Document minimum browser requirements | Low | Set user expectations | Pending |

---

## Recommended Minimum Browser Requirements for ThumPiks

- **Chrome / Edge:** 111+ (March 2023)
- **Firefox:** 128+ (July 2024)
- **Safari:** 16.4+ (March 2023)
- **iOS Safari:** 16.4+ (iPhone 8 or newer with iOS 16.4+)
- **Not supported:** IE, Safari 15 and below, Opera Mini
