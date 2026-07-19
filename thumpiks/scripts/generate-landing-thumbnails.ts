/**
 * Generate AI Thumbnails for Landing Page
 * 
 * This script uses OpenRouter to generate realistic YouTube-style thumbnails
 * for the landing page carousel.
 * 
 * Usage: npx ts-node scripts/generate-landing-thumbnails.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1';

// Row 1: Thumbnail prompts with BOLD TEXT overlays - designed to look like real clickbait YouTube thumbnails
const THUMBNAIL_PROMPTS_ROW1 = [
  {
    name: 'gaming-1',
    prompt: 'YouTube thumbnail, shocked gamer face with mouth open, wearing gaming headset, neon green and purple RGB lighting, large bold white text "I CANT BELIEVE THIS" with black outline, dark background, 16:9, ultra high contrast, MrBeast style thumbnail'
  },
  {
    name: 'tech-1',
    prompt: 'YouTube thumbnail, person holding iPhone with shocked surprised face, bold red text "DONT BUY THIS" overlaid, clean white background, tech reviewer style, arrow pointing at phone, 16:9 aspect ratio, MKBHD style thumbnail'
  },
  {
    name: 'cooking-1',
    prompt: 'YouTube thumbnail, chef with amazed expression holding golden crispy fried chicken, bold yellow text "SECRET RECIPE" with fire emojis, steam effects, warm kitchen background, 16:9, Gordon Ramsay style thumbnail'
  },
  {
    name: 'fitness-1',
    prompt: 'YouTube thumbnail, muscular fitness person flexing with intense face, before/after split screen effect, bold text "30 DAY RESULTS" in red, gym background, dramatic lighting, 16:9, transformation thumbnail style'
  },
  {
    name: 'travel-1',
    prompt: 'YouTube thumbnail, person standing arms wide at Santorini Greece blue domes sunset, amazed happy expression, bold white text "DREAM VACATION" with airplane emoji, golden hour, 16:9 travel vlog style'
  },
  {
    name: 'education-1',
    prompt: 'YouTube thumbnail, teacher pointing at camera with serious expression, chalkboard with complex equations behind, bold yellow text "LEARN THIS NOW" with arrow, educational channel style, 16:9 aspect ratio'
  },
  {
    name: 'music-1',
    prompt: 'YouTube thumbnail, singer with microphone on stage, colorful concert lights purple blue, crowd silhouettes, bold glowing text "LIVE PERFORMANCE" neon style, 16:9 music video thumbnail'
  },
  {
    name: 'lifestyle-1',
    prompt: 'YouTube thumbnail, influencer in luxury apartment with coffee, cozy aesthetic, bold pink text "MORNING ROUTINE" with sun emoji, warm soft lighting, plants visible, 16:9 lifestyle vlog style'
  }
];

// Row 2: Different thumbnails for bottom carousel - more variety
const THUMBNAIL_PROMPTS_ROW2 = [
  {
    name: 'gaming-2',
    prompt: 'YouTube thumbnail, gamer celebrating victory fist pump, RGB keyboard glowing, bold green text "WORLD RECORD" with trophy emoji, esports style, dark background with particles, 16:9'
  },
  {
    name: 'tech-2',
    prompt: 'YouTube thumbnail, unboxing scene hands opening box with glowing light coming out, bold text "FIRST LOOK" in blue, mystery reveal style, clean background, 16:9 tech unboxing style'
  },
  {
    name: 'cooking-2',
    prompt: 'YouTube thumbnail, delicious pizza close-up with cheese pull, chefs hands visible, bold red text "BEST EVER" with heart eyes emoji, Italian kitchen background, 16:9 food thumbnail'
  },
  {
    name: 'fitness-2',
    prompt: 'YouTube thumbnail, person doing impressive yoga pose on beach sunset, silhouette style, bold white text "IMPOSSIBLE CHALLENGE" 16:9 fitness motivation thumbnail'
  },
  {
    name: 'travel-2',
    prompt: 'YouTube thumbnail, person on tropical beach crystal clear water, surprised excited face, bold text "HIDDEN PARADISE" in turquoise, palm trees, drone view style, 16:9'
  },
  {
    name: 'education-2',
    prompt: 'YouTube thumbnail, person with lightbulb moment expression, cartoon lightbulb graphic above head, bold text "MIND BLOWN" in yellow, gradient background, 16:9 educational style'
  },
  {
    name: 'music-2',
    prompt: 'YouTube thumbnail, person wearing headphones eyes closed enjoying music, colorful sound wave graphics, bold text "TOP HITS 2026" rainbow colors, 16:9 music playlist style'
  },
  {
    name: 'lifestyle-2',
    prompt: 'YouTube thumbnail, person showing luxury shopping bags haul, excited happy face, bold pink text "I BOUGHT EVERYTHING" with money emoji, bright white background, 16:9 haul video style'
  }
];

const THUMBNAIL_PROMPTS = [...THUMBNAIL_PROMPTS_ROW1, ...THUMBNAIL_PROMPTS_ROW2];

async function generateImage(prompt: string, filename: string): Promise<void> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set in environment');
  }

  console.log(`Generating: ${filename}...`);

  try {
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://thumpiks.com',
        'X-Title': 'ThumPiks Landing Page Generator'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text'],
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    
    // Extract images from response (multiple formats)
    const images: string[] = [];
    const message = data.choices?.[0]?.message;
    
    if (message) {
      // Format 1: images array in message
      if (message.images && Array.isArray(message.images)) {
        for (const img of message.images) {
          if (img.image_url?.url) images.push(img.image_url.url);
          else if (img.url) images.push(img.url);
          else if (typeof img === 'string' && img.startsWith('data:image')) images.push(img);
        }
      }
      
      // Format 2: content as array (multimodal)
      if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === 'image_url' && part.image_url?.url) {
            images.push(part.image_url.url);
          } else if (part.type === 'image' && part.url) {
            images.push(part.url);
          } else if (part.inline_data?.data) {
            // Gemini format: inline_data with base64
            images.push(`data:${part.inline_data.mime_type || 'image/png'};base64,${part.inline_data.data}`);
          }
        }
      }
      
      // Format 3: base64 embedded in string content
      if (typeof message.content === 'string') {
        const base64Matches = message.content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g);
        if (base64Matches) images.push(...base64Matches);
      }
    }

    if (images.length > 0 && images[0]) {
      const base64Data = images[0].replace(/^data:image\/\w+;base64,/, '');
      const outputPath = path.join(__dirname, '../client/public/images/thumbnails', filename);
      fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
      console.log(`✅ Saved: ${filename}`);
      return;
    }

    console.log(`⚠️ No image in response for ${filename}`);
    console.log('Response structure:', JSON.stringify(Object.keys(data), null, 2));
    console.log('Message keys:', message ? JSON.stringify(Object.keys(message), null, 2) : 'no message');

  } catch (error) {
    console.error(`❌ Error generating ${filename}:`, error);
  }
}

async function main() {
  console.log('🎨 Generating Landing Page Thumbnails\n');
  
  // Ensure output directory exists
  const outputDir = path.join(__dirname, '../client/public/images/thumbnails');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate each thumbnail with a delay to avoid rate limiting
  for (let i = 0; i < THUMBNAIL_PROMPTS.length; i++) {
    const item = THUMBNAIL_PROMPTS[i];
    if (!item) continue;
    const { name, prompt } = item;
    await generateImage(prompt, `thumbnail-${name}.png`);
    
    // Wait 2 seconds between requests
    if (i < THUMBNAIL_PROMPTS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n✨ Done! Update ThumPiksLanding.tsx to use the new images.');
}

main().catch(console.error);
