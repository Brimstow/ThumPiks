import type { LucideIcon } from 'lucide-react';
import {
  Rocket,
  CreditCard,
  Wand2,
  UserCircle,
  MessageCircleQuestion,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

export interface HelpCategory {
  slug: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

export interface HelpArticle {
  slug: string;
  categorySlug: string;
  title: string;
  summary: string;
  content: string[];
  relatedSlugs: string[];
  popular?: boolean;
}

// ── Categories ──────────────────────────────────────────────────────────────

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    slug: 'getting-started',
    icon: Rocket,
    title: 'Getting Started',
    description: 'Everything you need to know to create your first thumbnail and set up your account.',
    color: 'text-blue-400',
  },
  {
    slug: 'billing',
    icon: CreditCard,
    title: 'Billing & Plans',
    description: 'Manage your subscription, credit usage, payment methods and invoices.',
    color: 'text-emerald-400',
  },
  {
    slug: 'editor-tools',
    icon: Wand2,
    title: 'Editor Tools',
    description: 'Deep dive into face swapping, text generation, background removal and more.',
    color: 'text-purple-400',
  },
  {
    slug: 'account',
    icon: UserCircle,
    title: 'Account Settings',
    description: 'Update your profile, change password, manage team members and notifications.',
    color: 'text-orange-400',
  },
  {
    slug: 'troubleshooting',
    icon: MessageCircleQuestion,
    title: 'Troubleshooting',
    description: 'Solutions to common errors, generation failures, and export issues.',
    color: 'text-rose-400',
  },
];

// ── Articles ────────────────────────────────────────────────────────────────

export const HELP_ARTICLES: HelpArticle[] = [
  // ─── Getting Started ────────────────────────────────────────────────────
  {
    slug: 'create-first-thumbnail',
    categorySlug: 'getting-started',
    title: 'How do I create my first thumbnail?',
    summary: 'A step-by-step guide to generating your very first AI thumbnail in ThumPiks.',
    popular: true,
    relatedSlugs: ['face-swap', 'export-youtube'],
    content: [
      'Creating your first thumbnail in ThumPiks takes just a few steps. Start by clicking "Create" in the left sidebar or the "New Thumbnail" button on your dashboard.',
      'You\'ll be presented with several creation options: AI Image Generation lets you describe your thumbnail in plain text and our AI will generate it. Quick Edit lets you paste a YouTube URL and instantly get a starting point. You can also start from a blank canvas or choose from our template library.',
      'For AI generation, type a descriptive prompt like "A surprised person reacting to a gaming moment with bold text EPIC WIN." Choose your preferred aspect ratio (16:9 is standard for YouTube) and click Generate. The AI will produce several variations for you to choose from.',
      'Once you have your base image, click "Edit in Studio" to open the full canvas editor. Here you can add text layers, swap faces, remove backgrounds, add overlays, and fine-tune every detail.',
      'When you\'re happy with the result, click Export in the top-right corner. Choose your format (PNG recommended for YouTube) and resolution, then download your thumbnail.',
    ],
  },
  {
    slug: 'workspace-overview',
    categorySlug: 'getting-started',
    title: 'Understanding your workspace',
    summary: 'Navigate the dashboard, projects, and organization features.',
    relatedSlugs: ['create-first-thumbnail', 'templates'],
    content: [
      'Your ThumPiks workspace is organized around a few key areas. The Dashboard is your home base showing recent projects, usage stats, and quick actions.',
      'The left sidebar provides navigation to all major features: Create (new thumbnails), My Thumbnails (your library), Quick Edit (fast YouTube-based editing), Editor (full canvas), Templates, AI Tools, and more.',
      'Projects help you organize thumbnails into groups. You might create a project per YouTube channel, per video series, or per client. Click "Projects" in the sidebar to create and manage them.',
      'The top navigation bar gives you access to your account settings, billing, and this help center. You\'ll also find the global search (Ctrl+K / Cmd+K) for quickly finding anything in your workspace.',
    ],
  },
  {
    slug: 'templates',
    categorySlug: 'getting-started',
    title: 'Using templates to get started quickly',
    summary: 'Browse, customize, and save templates for consistent thumbnail branding.',
    relatedSlugs: ['workspace-overview', 'brand-assets'],
    content: [
      'Templates are pre-designed thumbnail layouts that you can customize with your own content. They\'re the fastest way to create professional thumbnails without starting from scratch.',
      'Browse templates by clicking "Templates" in the sidebar. You can filter by category (gaming, tech, cooking, etc.), style, or aspect ratio. Each template shows a preview and description.',
      'Click any template to open it in the editor. All text, images, and layers are fully editable. Replace the placeholder text with your title, swap in your own face or images, and adjust colors to match your brand.',
      'To save your own templates, create a thumbnail you\'re happy with, then click the menu (three dots) and select "Save as Template." Your custom templates appear in the "My Templates" tab for quick reuse.',
    ],
  },
  {
    slug: 'video-frame-extraction',
    categorySlug: 'getting-started',
    title: 'Extracting frames from videos',
    summary: 'Pull frames from YouTube or other video platforms to use as thumbnail bases.',
    relatedSlugs: ['create-first-thumbnail', 'export-youtube'],
    content: [
      'ThumPiks can extract frames from videos on over 1,000 platforms including YouTube, Vimeo, Twitch, and more. This is perfect for creating thumbnails that feature actual moments from your video.',
      'To extract frames, go to Quick Edit and paste your video URL. ThumPiks will analyze the video and present key frames for you to choose from. You can also scrub through the video timeline to pick the exact moment you want.',
      'Once you\'ve selected a frame, it opens in the editor where you can enhance it with AI tools, add text overlays, swap faces, remove or change the background, and more.',
      'Extracted frames are automatically saved to your project library so you can come back to them later or use them across multiple thumbnail variations.',
    ],
  },

  // ─── Billing & Plans ───────────────────────────────────────────────────
  {
    slug: 'credit-usage',
    categorySlug: 'billing',
    title: 'Understanding credit usage and renewal cycles',
    summary: 'Learn how credits work, what each AI tool costs, and when they renew.',
    popular: true,
    relatedSlugs: ['plan-differences', 'payment-methods'],
    content: [
      'ThumPiks uses a credit-based system for AI operations. Each plan comes with a monthly credit allocation that renews on your billing date. Unused credits do not roll over to the next month.',
      'Different AI tools consume different amounts of credits: AI Image Generation uses 1 credit per generation. Face Swap uses 1 credit per swap. Background Removal, Upscaling, and Inpainting each use 1 credit. Vision Analysis (CTR scoring) uses 1 credit per analysis.',
      'You can check your remaining credits at any time in the top-right corner of the dashboard or under Account > Billing. The usage breakdown shows which tools consumed the most credits.',
      'If you run out of credits before your renewal date, you can upgrade your plan for immediate access to more credits, or wait for your monthly renewal. We\'ll notify you when you\'re running low.',
    ],
  },
  {
    slug: 'plan-differences',
    categorySlug: 'billing',
    title: 'Comparing plans: Free, Pro, and Business',
    summary: 'Feature and credit differences across all subscription tiers.',
    relatedSlugs: ['credit-usage', 'payment-methods'],
    content: [
      'ThumPiks offers three main plans to fit different needs. The Free plan gives you a small credit allocation to try out the platform with basic features and standard resolution exports.',
      'The Pro plan is designed for active creators. You get significantly more credits per month, access to all AI tools including face swap and vision analysis, high-resolution exports without watermarks, and priority processing.',
      'The Business plan is for teams and heavy users. It includes everything in Pro plus unlimited team members, batch editing, API access, priority support, and the highest credit allocation.',
      'All paid plans include a 7-day money-back guarantee. You can upgrade, downgrade, or cancel at any time from your Account > Billing page. Downgrades take effect at the end of your current billing period.',
    ],
  },
  {
    slug: 'payment-methods',
    categorySlug: 'billing',
    title: 'Managing payment methods and invoices',
    summary: 'Add, update, or remove payment methods and download invoices.',
    relatedSlugs: ['plan-differences', 'credit-usage'],
    content: [
      'ThumPiks accepts all major credit and debit cards through our payment processor. You can manage your payment methods from Account > Billing > Payment Methods.',
      'To add a new payment method, click "Add Payment Method" and enter your card details. You can set any card as your default payment method. The default card will be charged on your next billing date.',
      'Invoices are automatically generated for each payment. You can view and download all your invoices from Account > Billing > Invoice History. Each invoice includes a detailed breakdown of your plan and any add-ons.',
      'If a payment fails, we\'ll retry it a few times over the next several days and notify you by email. If the payment continues to fail, your account may be downgraded to the Free plan. Your thumbnails and projects are never deleted.',
    ],
  },

  // ─── Editor Tools ──────────────────────────────────────────────────────
  {
    slug: 'face-swap',
    categorySlug: 'editor-tools',
    title: 'How do I swap faces in my thumbnails?',
    summary: 'Step-by-step guide to using AI face swap in the thumbnail editor.',
    popular: true,
    relatedSlugs: ['background-removal', 'create-first-thumbnail'],
    content: [
      'Face Swap lets you replace faces in your thumbnail with your own photo or any other face. This is one of the most popular features for YouTube creators who want to show expressive reactions.',
      'To use Face Swap, open your thumbnail in the editor and click "AI Tools" in the left panel, then select "Face Swap." Upload a clear, front-facing photo of the face you want to use. For best results, use a well-lit photo with the face clearly visible.',
      'Click on the face in your thumbnail that you want to replace. ThumPiks will automatically detect faces in the image. Select the target face, then click "Swap." The AI will blend the new face naturally into the existing image, matching lighting and angle.',
      'You can swap multiple faces in a single image by repeating the process for each face. Each swap costs 1 credit. After swapping, you can fine-tune the result with the editor\'s adjustment tools.',
    ],
  },
  {
    slug: 'background-removal',
    categorySlug: 'editor-tools',
    title: 'Removing and changing backgrounds',
    summary: 'Use AI to remove, replace, or blur backgrounds in your thumbnails.',
    relatedSlugs: ['face-swap', 'inpainting'],
    content: [
      'Background Removal uses AI to separate the subject from the background in your thumbnail. This is useful for placing subjects on new backgrounds, creating clean cutouts, or adding dramatic effects.',
      'In the editor, select your image layer and click "AI Tools" > "Remove Background." The AI will process the image and create a transparent background around your subject. This typically takes a few seconds.',
      'Once the background is removed, you can add a new background layer underneath. Use a solid color, gradient, another image, or an AI-generated background. You can also use the "Expand" tool to extend the background beyond the original image boundaries.',
      'For more subtle effects, try "Blur Background" which keeps the background but applies a professional-looking depth-of-field effect that makes your subject pop.',
    ],
  },
  {
    slug: 'text-generation',
    categorySlug: 'editor-tools',
    title: 'AI-powered text and title generation',
    summary: 'Generate catchy titles, overlay text, and smart text placement.',
    relatedSlugs: ['brand-assets', 'create-first-thumbnail'],
    content: [
      'ThumPiks includes AI text generation powered by GPT-4.1 to help you create compelling thumbnail text. Access it through the editor\'s Text tool or via AI Tools > Smart Text.',
      'Describe what your video is about and the AI will suggest multiple title options optimized for click-through rate. You can specify the tone (dramatic, funny, informative) and length preferences.',
      'Smart Text automatically handles text placement, sizing, and effects. It analyzes your thumbnail composition and places text where it\'ll have maximum visual impact without obscuring important elements.',
      'You can customize the generated text with different fonts, colors, outlines, shadows, and effects. ThumPiks includes a library of YouTube-optimized fonts, or you can upload your own through the Brand Kit feature.',
    ],
  },
  {
    slug: 'inpainting',
    categorySlug: 'editor-tools',
    title: 'Editing specific areas with AI inpainting',
    summary: 'Select and regenerate parts of your thumbnail while keeping the rest intact.',
    relatedSlugs: ['background-removal', 'face-swap'],
    content: [
      'AI Inpainting lets you select a specific area of your thumbnail and regenerate just that portion. This is perfect for removing unwanted objects, changing specific elements, or fixing imperfections.',
      'To use inpainting, open your thumbnail in the editor and select "AI Tools" > "Inpaint." Use the brush tool to paint over the area you want to change. You can adjust the brush size for precision.',
      'After selecting the area, describe what you want to appear there. For example, "remove the person in the background" or "replace with a mountain landscape." The AI will generate new content that blends seamlessly with the surrounding image.',
      'For best results, make your selection slightly larger than the area you want to change. This gives the AI more context to create natural-looking transitions. You can undo and retry as many times as needed.',
    ],
  },

  // ─── Account Settings ──────────────────────────────────────────────────
  {
    slug: 'profile-settings',
    categorySlug: 'account',
    title: 'Updating your profile and preferences',
    summary: 'Change your display name, email, avatar, and notification preferences.',
    relatedSlugs: ['change-password', 'team-members'],
    content: [
      'Your profile settings control how you appear in ThumPiks and what notifications you receive. Access them from the top-right avatar menu > Account Settings, or navigate to Account > Profile.',
      'You can update your display name, email address, and profile avatar. If you change your email, we\'ll send a verification link to the new address. Your old email remains active until you confirm the change.',
      'Notification preferences let you control which emails you receive: billing alerts, credit usage warnings, product updates, and tips. You can also manage browser notifications for real-time alerts.',
      'Your profile settings also include language preferences and timezone settings, which affect how dates and times are displayed throughout the app.',
    ],
  },
  {
    slug: 'change-password',
    categorySlug: 'account',
    title: 'Changing your password',
    summary: 'Update your password or reset it if you\'ve forgotten it.',
    relatedSlugs: ['profile-settings'],
    content: [
      'To change your password, go to Account > Profile > Security. Enter your current password, then your new password twice to confirm. Your new password must be at least 12 characters long.',
      'For a strong password, use a mix of uppercase and lowercase letters, numbers, and symbols. We recommend using a password manager to generate and store secure passwords.',
      'If you\'ve forgotten your password, click "Forgot Password" on the login page. We\'ll send a password reset link to your registered email address. The link expires after 1 hour for security.',
      'After changing your password, all other active sessions will be signed out. You\'ll need to log in again on any other devices or browsers.',
    ],
  },
  {
    slug: 'team-members',
    categorySlug: 'account',
    title: 'Managing team members',
    summary: 'Invite collaborators, assign roles, and manage team access.',
    relatedSlugs: ['profile-settings', 'plan-differences'],
    content: [
      'Team features are available on the Business plan. You can invite team members to collaborate on thumbnails, share templates, and work on projects together.',
      'To invite a team member, go to Account > Team and click "Invite Member." Enter their email address and select their role: Viewer (can view only), Editor (can create and edit), or Admin (full access including billing).',
      'Each team member gets their own login credentials and workspace view. Projects can be shared across the team, and you can control who has access to specific projects.',
      'Team usage is tracked per member in the Analytics section. The account owner and admins can see credit usage breakdowns by team member to manage resource allocation.',
    ],
  },

  // ─── Troubleshooting ───────────────────────────────────────────────────
  {
    slug: 'generation-failures',
    categorySlug: 'troubleshooting',
    title: 'AI generation is failing or timing out',
    summary: 'Common causes and fixes for thumbnail generation errors.',
    popular: true,
    relatedSlugs: ['browser-compatibility', 'credit-usage'],
    content: [
      'If your AI thumbnail generation is failing, there are several common causes. First, check your credit balance — generation requires at least 1 credit. You can see your balance in the top-right corner of the dashboard.',
      'If you have credits but generation still fails, try simplifying your prompt. Very long or complex prompts can sometimes cause issues. Keep prompts under 500 characters and focus on describing the visual elements you want.',
      'Timeouts can occur during high-demand periods. If a generation times out, wait a moment and try again. Your credits are not consumed for failed generations — only successful completions deduct credits.',
      'If the problem persists, try clearing your browser cache and refreshing the page. You can also check the ThumPiks status page for any ongoing service issues. If none of these steps help, contact support through the chat widget or the Contact page.',
    ],
  },
  {
    slug: 'browser-compatibility',
    categorySlug: 'troubleshooting',
    title: 'Browser compatibility and requirements',
    summary: 'Supported browsers, minimum requirements, and known issues.',
    relatedSlugs: ['generation-failures', 'export-issues'],
    content: [
      'ThumPiks works best on modern browsers. We officially support the latest versions of Chrome, Firefox, Safari, and Edge. For the best experience, we recommend Chrome or Edge on desktop.',
      'The canvas editor requires WebGL support, which is available in all modern browsers. If you see a blank editor or rendering issues, check that hardware acceleration is enabled in your browser settings.',
      'For optimal performance, we recommend at least 4GB of RAM and a stable internet connection. Working with high-resolution images (4K+) may require more memory. If the editor feels sluggish, try closing other browser tabs.',
      'Known issues: Safari has occasional rendering differences with certain text effects. Firefox may show slower canvas performance with many layers. If you encounter any browser-specific issue, please report it through the feedback widget.',
    ],
  },
  {
    slug: 'export-issues',
    categorySlug: 'troubleshooting',
    title: 'Export and download problems',
    summary: 'Fix issues with downloading, file formats, and resolution.',
    relatedSlugs: ['export-youtube', 'browser-compatibility'],
    content: [
      'If your export or download isn\'t working, first check that pop-up blockers aren\'t preventing the download. Some browsers block automatic downloads — look for a blocked download notification in the address bar.',
      'For YouTube thumbnails, use PNG format at 1280x720 resolution (the YouTube recommended size). You can set this in the Export dialog under Format and Resolution. JPEG is also supported for smaller file sizes.',
      'If your exported image looks different from the editor preview, ensure you\'re viewing it at 100% zoom. Some image viewers apply their own scaling which can make the image look blurry.',
      'Large exports (4K resolution) may take a few seconds to process. If the export dialog shows a spinner for more than 30 seconds, try reducing the resolution or closing and reopening the export dialog.',
    ],
  },
  {
    slug: 'export-youtube',
    categorySlug: 'troubleshooting',
    title: 'Exporting high-resolution thumbnails for YouTube',
    summary: 'Optimal settings and formats for YouTube thumbnail uploads.',
    popular: true,
    relatedSlugs: ['export-issues', 'create-first-thumbnail'],
    content: [
      'YouTube recommends thumbnails at 1280x720 pixels (16:9 aspect ratio) with a minimum width of 640 pixels. The maximum file size is 2MB. ThumPiks is pre-configured with these optimal settings.',
      'When exporting, click the Export button in the top-right corner of the editor. Select "YouTube Thumbnail" from the preset dropdown — this automatically sets 1280x720 PNG format with optimized compression.',
      'PNG format preserves the highest quality and is recommended for thumbnails with text overlays and sharp graphics. If your file is over 2MB, switch to JPEG at 90% quality — the visual difference is negligible at thumbnail sizes.',
      'After downloading, upload the thumbnail directly to YouTube Studio. Go to your video > Details > Thumbnail > Upload Thumbnail. YouTube may take a few minutes to process and display the new thumbnail across all devices.',
    ],
  },
  {
    slug: 'brand-assets',
    categorySlug: 'account',
    title: 'Can I use my own fonts and branding assets?',
    summary: 'Upload custom fonts, logos, and color palettes to maintain brand consistency.',
    popular: true,
    relatedSlugs: ['templates', 'text-generation'],
    content: [
      'Yes! ThumPiks supports custom branding through the Brand Kit feature. Access it from the sidebar under Brand Kit, or from Account > Brand Kit.',
      'You can upload custom fonts in TTF, OTF, or WOFF2 format. Once uploaded, your fonts appear alongside the built-in font library in the editor\'s text tool. There\'s no limit to how many custom fonts you can upload.',
      'Add your brand colors by entering hex codes or using the color picker. Brand colors appear as swatches in every color picker throughout the editor, making it easy to stay on-brand.',
      'Upload your logo and other brand assets (watermarks, badges, common graphics) to the Brand Kit. These assets are accessible from the editor\'s asset panel and can be dragged directly onto the canvas.',
    ],
  },
];

// ── Helper Functions ────────────────────────────────────────────────────────

export function getCategoryBySlug(slug: string): HelpCategory | undefined {
  return HELP_CATEGORIES.find((c) => c.slug === slug);
}

export function getArticlesByCategory(categorySlug: string): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.categorySlug === categorySlug);
}

export function getArticleBySlug(
  categorySlug: string,
  articleSlug: string
): HelpArticle | undefined {
  return HELP_ARTICLES.find(
    (a) => a.categorySlug === categorySlug && a.slug === articleSlug
  );
}

export function getRelatedArticles(article: HelpArticle): HelpArticle[] {
  return article.relatedSlugs
    .map((slug) => HELP_ARTICLES.find((a) => a.slug === slug))
    .filter((a): a is HelpArticle => a !== undefined);
}

export function getPopularArticles(): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.popular);
}

export interface HelpSearchResult {
  categories: HelpCategory[];
  articles: HelpArticle[];
}

export function searchHelp(query: string): HelpSearchResult {
  const q = query.toLowerCase().trim();
  if (!q) {
    return { categories: HELP_CATEGORIES, articles: [] };
  }

  const categories = HELP_CATEGORIES.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
  );

  const articles = HELP_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.content.some((p) => p.toLowerCase().includes(q))
  );

  return { categories, articles };
}
