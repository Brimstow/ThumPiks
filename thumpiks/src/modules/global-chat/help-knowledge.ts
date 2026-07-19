// ============================================================================
// Help Knowledge Base — Injected into global chat system prompt
// Keep in sync with client/src/components/dashboard/help/helpData.ts
// ============================================================================

export const HELP_KNOWLEDGE_BASE = `You have access to the ThumPiks knowledge base. When a user asks a question that matches these topics, use this information to answer accurately. Reference the Help Center (/dashboard/help) for more details when appropriate.

## Getting Started

Q: How do I create my first thumbnail?
A: Click "Create" in the left sidebar. Choose AI Image Generation (describe your thumbnail in text), Quick Edit (paste a YouTube URL), blank canvas, or a template. For AI generation, type a descriptive prompt, choose 16:9 aspect ratio, and click Generate. Then click "Edit in Studio" to add text, swap faces, remove backgrounds, etc. Export as PNG when done.

Q: How do I navigate my workspace?
A: The Dashboard shows recent projects, usage stats, and quick actions. The left sidebar has all features: Create, My Thumbnails, Quick Edit, Editor, Templates, AI Tools. Use Ctrl+K / Cmd+K for global search. Projects help you organize thumbnails into groups.

Q: How do I use templates?
A: Click "Templates" in the sidebar. Filter by category, style, or aspect ratio. Click a template to open it in the editor — all elements are fully editable. To save your own template, click the three-dot menu on any thumbnail and select "Save as Template."

Q: Can I extract frames from videos?
A: Yes. Go to Quick Edit and paste a video URL (supports YouTube, Vimeo, Twitch, and 1000+ platforms). ThumPiks will extract key frames for you to choose from. Selected frames open in the editor for further enhancement.

## Billing & Plans

Q: How do credits work?
A: Each plan includes a monthly credit allocation that renews on your billing date. Credits do not roll over. AI Image Generation, Face Swap, Background Removal, Upscaling, Inpainting, and Vision Analysis each cost 1 credit per use. Check your balance in the top-right corner or under Account > Billing.

Q: What are the plan differences?
A: Free plan: small credit allocation, basic features, standard resolution. Pro plan: more credits, all AI tools, high-res exports, no watermarks, priority processing. Business plan: everything in Pro plus unlimited team members, batch editing, API access, priority support, highest credits. All paid plans have a 7-day money-back guarantee.

Q: How do I manage payment methods?
A: Go to Account > Billing > Payment Methods. You can add/remove cards, set a default, and view/download invoices from Invoice History. If payment fails, we retry and notify you by email. Your thumbnails are never deleted if payment lapses.

## Editor Tools

Q: How do I swap faces in my thumbnails?
A: Open thumbnail in editor > AI Tools > Face Swap. Upload a clear, front-facing photo. Click the face you want to replace in the thumbnail. Click "Swap." The AI blends the new face naturally. You can swap multiple faces per image (1 credit per swap).

Q: How do I remove or change backgrounds?
A: In the editor, select your image > AI Tools > Remove Background. The AI creates a transparent background. Add a new background layer underneath (solid color, gradient, image, or AI-generated). You can also use "Blur Background" for a depth-of-field effect.

Q: How does AI text generation work?
A: Access via the Text tool or AI Tools > Smart Text (powered by GPT-4.1). Describe your video and the AI suggests click-optimized titles. Smart Text auto-handles placement, sizing, and effects based on your thumbnail's composition. Customize with fonts, colors, outlines, shadows.

Q: What is AI inpainting?
A: Inpainting lets you select and regenerate specific areas. In the editor: AI Tools > Inpaint. Paint over the area to change, describe what you want ("remove person" or "replace with mountain"). The AI generates new content that blends with surrounding pixels.

## Account Settings

Q: How do I update my profile?
A: Go to Account > Profile. Change display name, email, avatar, notification preferences, language, and timezone. Email changes require verification via a link sent to the new address.

Q: How do I change my password?
A: Account > Profile > Security. Enter current password, then new password twice. Minimum 12 characters required. All other sessions are signed out after a password change. Use "Forgot Password" on the login page if you've lost access.

Q: How do team members work?
A: Business plan feature. Go to Account > Team > Invite Member. Roles: Viewer (view only), Editor (create/edit), Admin (full access including billing). Each member gets their own login. Usage is tracked per member in Analytics.

Q: Can I use my own fonts and branding?
A: Yes, through the Brand Kit feature (sidebar > Brand Kit or Account > Brand Kit). Upload custom fonts (TTF, OTF, WOFF2), add brand colors as hex codes, upload logos and other assets. Everything appears in the editor's asset panel and color pickers.

## Troubleshooting

Q: AI generation is failing or timing out. What do I do?
A: Check credit balance first (need at least 1). Try simplifying your prompt (under 500 chars). Timeouts can occur during peak demand — retry after a moment. Credits are not consumed for failed generations. Clear browser cache if issues persist. Check the status page for service issues.

Q: What browsers are supported?
A: Latest Chrome, Firefox, Safari, and Edge. Chrome/Edge recommended for best performance. WebGL required for the canvas editor (enable hardware acceleration). Minimum 4GB RAM recommended. Known issues: Safari has occasional text rendering differences; Firefox may be slower with many layers.

Q: I'm having export/download problems.
A: Check pop-up blockers. For YouTube: use PNG at 1280x720 (select "YouTube Thumbnail" preset). If export looks different from editor, view at 100% zoom. Large 4K exports may take extra time. If stuck for 30+ seconds, reduce resolution and retry.

Q: What are the optimal YouTube thumbnail settings?
A: 1280x720 pixels, 16:9 ratio, minimum 640px width, max 2MB file size. Use the "YouTube Thumbnail" export preset for optimal settings. PNG for best quality with text; JPEG at 90% if file size is an issue.`;
