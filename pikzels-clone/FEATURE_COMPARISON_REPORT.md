# Feature Comparison Report: Marketing vs. Implementation

**Generated:** June 2025  
**Scope:** FeaturesPage.tsx, ThumPiksLanding.tsx, AIToolsPage.tsx, PricingPage.tsx vs. actual codebase

---

## Summary

| Category | Count |
|---|---|
| **Fully Implemented** | 18 |
| **Partially Implemented** | 5 |
| **Marketing says "Coming Soon" but Actually Implemented** | 3 |
| **Over-Promised / Not Implemented** | 3 |
| **Implemented but Missing from Marketing** | 8 |

---

## 1. FULLY IMPLEMENTED FEATURES ✅

These features are marketed and have complete backend + frontend implementations.

### 1.1 AI Image Generation
- **Marketed on:** FeaturesPage, AIToolsPage, Landing Page, PricingPage
- **Backend:** `POST /api/thumbnails/ai/generate` → `aiGenerate()` in `thumbnail.controller.ts`
- **Frontend:** Full UI in `AIToolsPage.tsx` with prompt input, style presets, tier selector
- **Details:**
  - ✅ Text-to-image generation
  - ✅ Style presets (cinematic, gaming, pro, bold, etc.)
  - ✅ Model tiers: Flash, Standard, Pro (via `model-tiers.config`)
  - ✅ Multi-provider routing (Comet, ZenMux, OpenRouter)
  - ✅ Credit deduction & refund on failure
  - ✅ Watermarking for free-tier users
  - ✅ Analytics event emission

### 1.2 AI Inpainting (Photo Editing)
- **Marketed on:** FeaturesPage ("edit specific areas with AI prompts")
- **Backend:** `POST /api/thumbnails/ai/inpaint` → `aiInpaint()`
- **Frontend:** Full UI in `AIToolsPage.tsx` with image + prompt inputs
- **Status:** ✅ Fully implemented with OpenRouter integration

### 1.3 Background Removal
- **Marketed on:** FeaturesPage, Quick Editor comparison
- **Backend:** `POST /api/thumbnails/ai/remove-background` → `aiRemoveBackground()`
- **Frontend:** Full UI in `AIToolsPage.tsx`
- **Details:**
  - ✅ Replicate (RMBG 2.0) as primary provider
  - ✅ OpenRouter fallback
  - ✅ 1 credit flat cost

### 1.4 AI Face Swap
- **Marketed on:** FeaturesPage, AIToolsPage, PricingPage (per-plan limits)
- **Backend:** `POST /api/thumbnails/ai/face-swap` → `aiFaceSwap()`
- **Frontend:** Full UI in `AIToolsPage.tsx` with source/target image upload
- **Details:**
  - ✅ ByteDance Seedream 4.5 model
  - ✅ Plan-based limits (Free: 3/mo, Starter: 20, Pro: 100, Ultra Pro: unlimited)

### 1.5 AI Upscaling
- **Marketed on:** FeaturesPage ("2x or 4x resolution")
- **Backend:** `POST /api/thumbnails/ai/upscale` → `aiUpscale()`
- **Frontend:** Full UI in `AIToolsPage.tsx` with scale selector
- **Details:**
  - ✅ 2x and 4x options
  - ✅ Replicate (Real-ESRGAN) primary, OpenRouter fallback
  - ✅ 4x requires Pro tier (validated server-side)

### 1.6 AI Enhancement
- **Marketed on:** FeaturesPage ("sharpen, denoise, HDR, color")
- **Backend:** `POST /api/thumbnails/ai/enhance` → `aiEnhance()`
- **Frontend:** Full UI in `AIToolsPage.tsx`
- **Details:**
  - ✅ Enhancement types: auto, color, sharpen, denoise, hdr
  - ✅ 1 credit flat cost

### 1.7 AI Expand / Outpaint
- **Marketed on:** FeaturesPage ("Expand canvas in any direction")
- **Backend:** `POST /api/thumbnails/ai/expand` → `aiExpand()`
- **Frontend:** Full UI in `AIToolsPage.tsx` with direction picker and pixel slider
- **Details:**
  - ✅ Directions: left, right, top, bottom, all
  - ✅ Configurable expand pixels (64-512)
  - ✅ Replicate provider

### 1.8 Object Removal
- **Marketed on:** FeaturesPage ("click to erase anything")
- **Backend:** Uses `POST /api/thumbnails/ai/segment` (SAM interactive) + `POST /api/thumbnails/ai/inpaint` (fill)
- **Frontend:** Full multi-step UI in `AIToolsPage.tsx`
- **Details:**
  - ✅ Click-to-select object detection (SAM 2)
  - ✅ Mask generation and preview
  - ✅ Inpaint fill with "remove object" prompt
  - **Note:** No dedicated `/ai/object-removal` endpoint; uses segment + inpaint combo on frontend

### 1.9 Recreate Better
- **Marketed on:** FeaturesPage ("upload old thumbnail, get improved version")
- **Backend:** Uses `POST /api/vision/describe` + `POST /api/thumbnails/ai/generate`
- **Frontend:** Full UI in `AIToolsPage.tsx` + `RecreateBetterModal.tsx`
- **Details:**
  - ✅ 3 input sources: upload, my thumbnails, URL
  - ✅ Vision analysis of original → enhanced prompt → regeneration
  - ✅ Dedicated modal with multi-step workflow

### 1.10 AI Auto-Layer Decompose
- **Marketed on:** FeaturesPage ("SAM 2 AI segmentation")
- **Backend:** `POST /api/thumbnails/ai/decompose` → `aiDecompose()`
- **Frontend:** Referenced in ThumbnailStudio editor
- **Details:**
  - ✅ SAM 2 auto-segmentation via Replicate
  - ✅ Returns isolated RGBA layers with bounds and scores
  - ✅ 3 credits per operation

### 1.11 AI Smart Text
- **Marketed on:** FeaturesPage ("GPT-4.1 powered suggestions, 5 tone modes")
- **Backend:** `POST /api/thumbnails/ai/generate-text` → `aiGenerateText()`
- **Frontend:** `AITextGenerator.tsx` component, integrated in QuickEditView
- **Details:**
  - ✅ GPT-4.1 Nano default model
  - ✅ 5 tones: clickbait, professional, casual, dramatic, educational
  - ✅ Structured JSON output with text, style, score
  - ✅ Session seed for unique results each call
  - ⚠️ "Vision-aware" claim partially accurate — the text generator itself doesn't take an image, but RecreateBetter flow does vision → text

### 1.12 Vision & CTR Analysis
- **Marketed on:** FeaturesPage ("Gemini vision analysis, attention heatmap")
- **Backend:** Full module at `src/modules/vision/` with `vision.service.ts`, `vision.controller.ts`, `vision.routes.ts`
- **Frontend:** `VisionToolPage.tsx` dashboard page
- **Details:**
  - ✅ Backend service with vision analysis and CTR scoring
  - ✅ Frontend page exists and is routed
  - ✅ Tests exist (`vision.service.test.ts`)

### 1.13 Visual Similarity Search
- **Marketed on:** FeaturesPage ("search by image or text, vector-powered")
- **Backend:** Full module at `src/modules/visual-search/` with embedding service, Qdrant vector DB
- **Frontend:** `VisualSearchPage.tsx` dashboard page
- **Details:**
  - ✅ Embedding service (`embedding.service.ts`)
  - ✅ Qdrant vector store (`qdrant.service.ts`)
  - ✅ Controller, routes, types all present
  - ✅ Tests exist

### 1.14 Video Frame Extraction
- **Marketed on:** FeaturesPage ("YouTube, TikTok, Twitch, Instagram & more")
- **Backend:** Full module at `src/modules/video-proxy/` with yt-dlp, ffmpeg integration
- **Frontend:** Used in QuickEditView, dedicated `VideoFrameExtractor.css`
- **Details:**
  - ✅ `yt-dlp.util.ts` for video downloading
  - ✅ `ffmpeg-frames.util.ts` for frame extraction
  - ✅ `frame-cycle-cache.service.ts` for caching
  - ✅ `frame-rate-limit.service.ts` for rate limiting
  - ✅ Plan-based limits (Free: 5/day, Starter: 20/day, Pro+: unlimited)

### 1.15 Projects & Organization
- **Marketed on:** FeaturesPage ("projects with bulk move & organize")
- **Backend:** Full module at `src/modules/project/project.routes.ts` (25 route matches)
- **Frontend:** `ProjectsPage.tsx`, `useProjects.ts` hook, `projectService.ts`
- **Details:**
  - ✅ CRUD for projects
  - ✅ Bulk move thumbnails between projects
  - ✅ Dashboard widgets

### 1.16 Multi-Format Export & Download
- **Marketed on:** FeaturesPage ("1080p, 4K, PNG, JPG, WebP")
- **Backend:** `GET /api/thumbnails/:id/download` → `downloadThumbnail()`
- **Frontend:** Export functionality in editor, `ExportSheet.tsx` (mobile)
- **Details:**
  - ✅ Download endpoint exists
  - ✅ Watermark-free exports controlled by plan (Free: 1/mo, Paid: unlimited)

### 1.17 No Watermarks (Paid Plans)
- **Marketed on:** FeaturesPage, PricingPage
- **Backend:** `watermarkImageUrls()` function called on every AI tool output
- **Config:** `subscription.config.ts` → `watermark: true` for Free, `false` for paid
- **Details:**
  - ✅ Watermarking system fully implemented
  - ✅ `watermarkFreeExports` per plan (Free: 1, Paid: -1 = unlimited)

### 1.18 Credit System & Pricing Plans
- **Marketed on:** PricingPage, Landing Page
- **Backend:** `subscription.config.ts` with 4 plans + credit packs
- **Details:**
  - ✅ Free (150 credits), Starter ($19, 750), Pro ($39, 3000), Ultra Pro ($79, 9000)
  - ✅ Credit packs (50/$9, 100/$15, 250/$35, 500/$60)
  - ✅ Credit deduction and refund logic on every AI endpoint
  - ✅ Polar billing integration (`polar-webhook.routes.ts`)

---

## 2. PARTIALLY IMPLEMENTED FEATURES ⚠️

### 2.1 AI Smart Text "Vision-Aware"
- **Marketed claim:** "Vision-aware: AI sees your thumbnail before suggesting"
- **Reality:** The `aiGenerateText` endpoint does NOT accept an image — it's text-only. However, the RecreateBetter flow uses `/api/vision/describe` before generating, which is vision-aware in that context.
- **Gap:** The standalone text generator tool is **not** vision-aware as marketed.

### 2.2 Attention Heatmap Overlay
- **Marketed on:** FeaturesPage ("Attention heatmap overlay" under Vision & CTR Analysis)
- **Backend:** Vision service exists but heatmap generation needs verification
- **Gap:** Could not confirm a visual heatmap overlay rendering in the frontend `VisionToolPage.tsx`. The backend may return scoring data, but actual heatmap image overlay generation is unclear.

### 2.3 Priority Processing / Dedicated Queue
- **Marketed on:** FeaturesPage ("2-3x faster generation", "dedicated priority queue")
- **Backend:** Multi-provider routing exists (Comet, ZenMux, OpenRouter, Replicate). Job queue exists via `replicate-queue.service.ts`.
- **Gap:** No evidence of a **dedicated priority queue** that routes paid users to faster processing. The multi-provider failover is real, but "dedicated priority queue for paid plans" is not verifiable in code. There's no per-user priority logic in the queue service.

### 2.4 Templates — Save & Reuse
- **Marketed on:** FeaturesPage ("Save & reuse custom templates", "Curated composition layouts")
- **Backend:** `src/modules/templates/template.routes.ts` exists. `src/modules/composition-layout/composition-layout.routes.ts` exists.
- **Frontend:** `TemplatesPage.tsx`, `TemplateMarketplace.tsx`, `CreateTemplateModal.tsx`, `TemplatePicker.tsx`, `TemplateDragDropProvider.tsx` — extensive UI exists
- **Gap:** The template system appears well-implemented, but the `customTemplates` feature flag is only `true` for Ultra Pro plan. Marketing doesn't clarify this is gated to the highest tier.

### 2.5 Social Sharing
- **Marketed on:** FeaturesPage "Coming Soon" section ("Secure share links, Engagement tracking")
- **Backend:** Full module at `src/modules/social-share/` with routes, controller, service
- **Frontend:** Share link generation exists (`/:id/share` route in thumbnail routes)
- **Gap:** Social media client implementations (Twitter, LinkedIn, Pinterest, Facebook) all have `TODO: Restore when implementing` comments — they're **stubs**. Share link generation works, but posting to social platforms does not.

---

## 3. MARKETED AS "COMING SOON" BUT ACTUALLY IMPLEMENTED 🎯

These features are listed under "Coming Soon" on FeaturesPage but have full or near-full implementations.

### 3.1 A/B Testing
- **FeaturesPage says:** Coming Soon
- **PricingPage says:** "Coming soon" badge on Starter, available on Pro+
- **Reality:** **Fully implemented.** Complete module at `src/modules/ab-testing/` with:
  - Full CRUD (create, get, list, delete)
  - Lifecycle (start, pause, complete)
  - Event recording
  - Feature-gated via `requireFeature('abTesting')` — Starter gets 2 tests, Pro+ unlimited
  - Service with Prisma + cache integration
- **Recommendation:** Remove "Coming Soon" label from FeaturesPage and PricingPage.

### 3.2 Brand Kit
- **FeaturesPage says:** Coming Soon ("Logo, color & font presets, AI brand wizard")
- **PricingPage says:** "Coming soon" on some plans
- **Reality:** **Extensively implemented.** `src/modules/brand-kit/` with 250+ lines of routes:
  - Full CRUD for logos, color palettes, fonts, photos, graphics, icons, styles
  - AI brand generation (`/generate-brand`)
  - Website brand extraction (`/extract-from-url`)
  - Brand voice management
  - Custom categories
  - Frontend: `BrandPage.tsx`, `BrandKitModal.tsx`, `BrandKitSetupWizard.tsx`
- **Recommendation:** Remove "Coming Soon" label — this is one of the most complete modules.

### 3.3 Trending Insights
- **FeaturesPage says:** Coming Soon ("Real-time trend data, Niche-specific insights")
- **Reality:** **Fully implemented.** `src/modules/youtube-trending/`:
  - YouTube Data API v3 integration
  - 20+ supported regions
  - 10+ video categories (gaming, music, sports, etc.)
  - Pagination support
  - Public API routes (no auth required)
- **Recommendation:** Remove "Coming Soon" label.

---

## 4. OVER-PROMISED / NOT IMPLEMENTED ❌

### 4.1 Expression Detection (Webcam)
- **Marketed on:** FeaturesPage "Coming Soon" ("Webcam-powered live expression feedback, 8 expression types scored")
- **Backend:** Only a basic `faceDetection.ts` service on the client side — no webcam integration, no 8-expression scoring
- **Frontend:** No dedicated Expression Detection page or component found
- **Status:** **Not implemented.** The service file exists for basic face detection but nothing close to the marketed webcam-based expression scoring tool.

### 4.2 "As fast as 3 seconds" Generation
- **Marketed on:** Landing page, comparison table
- **Reality:** Generation speed depends entirely on third-party AI providers. While Flash tier is faster, 3-second generation is an aspirational best-case, not guaranteed. No benchmarking or SLA enforcement exists in the code.
- **Risk level:** Low — this is marketing hyperbole common in the industry, but worth noting.

### 4.3 Batch Editing for Multiple Thumbnails
- **Marketed on:** FeaturesPage ("Batch editing for multiple thumbnails")
- **Backend:** `bulkMoveThumbnails()` exists for moving between projects, but no batch AI editing endpoint
- **Frontend:** No batch editing UI found
- **Status:** Bulk **move** is implemented, but bulk **editing** (applying AI tools to multiple thumbnails at once) is **not implemented**.

---

## 5. IMPLEMENTED BUT MISSING FROM MARKETING 📦

These features exist in the codebase but are not prominently featured (or mentioned at all) in marketing materials.

### 5.1 AI Segmentation (SAM 2) — Standalone
- **Implementation:** Full `POST /api/thumbnails/ai/segment` with auto and interactive modes
- **Marketing:** Only mentioned as part of "Auto-Layer Decompose" and "Object Removal"
- **Note:** SAM 2 segmentation is a powerful standalone feature that could be marketed separately

### 5.2 Collaboration / Team Features
- **Implementation:** `src/modules/collaboration/collaboration.routes.ts` with team management (add/remove members, update roles, team projects)
- **Marketing:** Not mentioned anywhere on FeaturesPage, PricingPage, or Landing Page

### 5.3 User Reviews System
- **Implementation:** `src/modules/review/` with public and admin routes. Landing page renders real reviews.
- **Marketing:** Reviews section exists on landing page, but "Reviews" as a feature is not promoted

### 5.4 Global Chat / Editor Chat
- **Implementation:** `src/modules/global-chat/` and `src/modules/editor-chat/` with routes and services
- **Marketing:** Not mentioned in any marketing material

### 5.5 Notification System
- **Implementation:** `src/modules/notification-sse/`, `src/modules/notification-config/`, `src/modules/user-notification/` — full SSE-based notification system
- **Marketing:** Not mentioned

### 5.6 Contact Form
- **Implementation:** `src/modules/contact/contact.routes.ts`
- **Marketing:** Footer links to `/contact` but no feature mention

### 5.7 Data Export (GDPR)
- **Implementation:** `src/modules/user/data-export.service.ts`
- **Marketing:** Not mentioned — could be a trust signal on privacy page

### 5.8 Admin System
- **Implementation:** Extensive admin modules: analytics, user management, system monitoring, content management, sitemap, admin notifications
- **Marketing:** Appropriately not marketed to end users, but notable for completeness

---

## 6. EDITOR COMPARISON ACCURACY

The FeaturesPage has a "Two Editors, One Goal" section comparing Quick Editor vs Full Canvas Editor.

### Quick Editor Claims:
| Claim | Status |
|---|---|
| 3 input paths: Paste Link, AI Generate, Upload | ✅ Verified in `QuickEditView.tsx` |
| AI Command Bar (Ctrl+K) | ✅ `AICommandBar.tsx` and `CommandPalette.tsx` exist |
| Remove Background (free) | ✅ Implemented |
| Face Swap | ✅ Implemented |
| Smart Text with AI suggestions | ✅ `AITextGenerator.tsx` integrated |
| Enhance & Recreate Better | ✅ Both implemented |
| Video frame extraction built in | ✅ Video proxy module |
| Session persistence | ✅ `useQuickEditCommandExecutor.ts` with localStorage |
| No layer management | ✅ Accurate (Quick Editor is flat) |
| No Smart Guides | ✅ Accurate |
| No platform preview overlay | ✅ Accurate |

### Full Canvas Editor Claims:
| Claim | Status |
|---|---|
| Layer-based editing with reorder & grouping | ✅ `ThumbnailStudio.tsx`, `LayersPanel.tsx`, `CanvasEngine.tsx` |
| AI Command Bar (Ctrl+K) | ✅ Shared component |
| Smart Guides for pixel-perfect alignment | ✅ `SmartGuides.tsx` component exists |
| Adjustments panel (brightness, contrast, etc.) | ✅ `AdjustmentsPanel.tsx` (52 matches) |
| Platform preview overlay (YouTube, TikTok) | ✅ `PlatformPreviewOverlay.tsx` exists |
| Contextual toolbar adapts to selected layer | ✅ `FloatingLayerToolbar.tsx` |
| All AI tools | ✅ `AIToolsPanel.tsx` in editor |
| Shapes, masks, and blending modes | ⚠️ Partially — need to verify shapes/blending modes specifically |
| No built-in video frame extraction | ✅ Accurate |
| No session persistence (project-based saves) | ✅ Accurate |

---

## 7. PRICING PAGE ACCURACY

### PricingPage Feature Claims vs. `subscription.config.ts`:

| Feature | Marketed | Config | Match? |
|---|---|---|---|
| Free: 150 credits | ✅ | `credits: 150` | ✅ |
| Free: 720p resolution | ✅ | `resolution: '720p'` | ✅ |
| Free: Watermarked | ✅ | `watermark: true` | ✅ |
| Free: 3 face swaps | ✅ | `faceSwap: 3` | ✅ |
| Free: 1 watermark-free export | ✅ | `watermarkFreeExports: 1` | ✅ |
| Starter: 750 credits | ✅ | `credits: 750` | ✅ |
| Starter: 1080p HD | ✅ | `resolution: '1080p HD'` | ✅ |
| Starter: No watermark | ✅ | `watermark: false` | ✅ |
| Starter: A/B testing (2 tests) | ✅ but says "Coming soon" | `abTesting: 2` | ⚠️ Misleading |
| Pro: 3000 credits | ✅ | `credits: 3000` | ✅ |
| Pro: 4K Ultra HD | ✅ | `resolution: '4K Ultra HD'` | ✅ |
| Pro: Unlimited A/B testing | ✅ but says "Coming soon" | `abTesting: true` | ⚠️ Misleading |
| Pro: Analytics | ✅ | `analytics: true` | ✅ |
| Ultra Pro: 9000 credits | ✅ | `credits: 9000` | ✅ |
| Ultra Pro: Custom templates | ✅ | `customTemplates: true` | ✅ |

---

## 8. ACTION ITEMS

### High Priority
1. **Remove "Coming Soon" from A/B Testing** — fully implemented with feature gating
2. **Remove "Coming Soon" from Brand Kit** — extensively implemented with AI wizard
3. **Remove "Coming Soon" from Trending Insights** — fully implemented with YouTube API
4. **Fix "vision-aware" claim on AI Smart Text** — either add image support to text generator or soften the claim

### Medium Priority
5. **Add Collaboration/Team features to marketing** — module exists but no marketing presence
6. **Clarify "Priority Processing"** — currently no per-user priority queue; either implement or soften claim
7. **Clarify "Batch Editing"** — only bulk move exists, not batch AI editing
8. **Update PricingPage A/B Testing labels** — remove "Coming soon" badge since it's implemented

### Low Priority
9. **Consider marketing SAM 2 Segmentation** as a standalone feature
10. **Add data export/GDPR compliance** to trust signals
11. **Evaluate Expression Detection roadmap** — currently only a stub; either develop or remove from Coming Soon
12. **Verify attention heatmap** rendering in VisionToolPage

---

## 9. FEATURE COVERAGE MATRIX

| Feature | Features Page | Landing Page | AI Tools Page | Pricing Page | Backend | Frontend |
|---|---|---|---|---|---|---|
| AI Image Generation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI Inpainting | ✅ | — | ✅ | — | ✅ | ✅ |
| Background Removal | ✅ | — | ✅ | — | ✅ | ✅ |
| Face Swap | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| AI Upscaling | ✅ | — | ✅ | — | ✅ | ✅ |
| AI Enhancement | ✅ | — | ✅ | — | ✅ | ✅ |
| AI Expand/Outpaint | ✅ | — | ✅ | — | ✅ | ✅ |
| Object Removal | ✅ | — | ✅ | — | ✅* | ✅ |
| Recreate Better | ✅ | — | ✅ | — | ✅* | ✅ |
| Auto-Layer Decompose | ✅ | — | — | — | ✅ | ✅ |
| AI Smart Text | ✅ | — | — | — | ✅ | ✅ |
| Vision & CTR Analysis | ✅ | — | — | — | ✅ | ✅ |
| Visual Similarity Search | ✅ | — | — | — | ✅ | ✅ |
| Video Frame Extraction | ✅ | — | — | — | ✅ | ✅ |
| Projects & Organization | ✅ | — | — | — | ✅ | ✅ |
| Multi-Format Export | ✅ | — | — | — | ✅ | ✅ |
| No Watermarks (Paid) | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| A/B Testing | ⚠️ "Coming Soon" | — | — | ⚠️ "Coming Soon" | ✅ | — |
| Brand Kit | ⚠️ "Coming Soon" | — | — | ⚠️ "Coming Soon" | ✅ | ✅ |
| Trending Insights | ⚠️ "Coming Soon" | — | — | — | ✅ | — |
| Social Sharing | ⚠️ "Coming Soon" | — | — | — | ⚠️ Partial | ⚠️ Partial |
| Expression Detection | ⚠️ "Coming Soon" | — | — | — | ❌ | ❌ |
| Collaboration/Teams | — | — | — | — | ✅ | — |
| Notifications (SSE) | — | — | — | — | ✅ | — |
| Global/Editor Chat | — | — | — | — | ✅ | ✅ |
| Data Export (GDPR) | — | — | — | — | ✅ | — |

*\* Uses composite of existing endpoints (segment + inpaint, vision + generate)*

---

**Bottom line:** The codebase is significantly more feature-complete than the marketing suggests. The three biggest discrepancies are features incorrectly labeled "Coming Soon" (A/B Testing, Brand Kit, Trending Insights) that are fully implemented and should be promoted. The over-promise risk is low — mainly around "priority processing" specifics and "batch editing."
