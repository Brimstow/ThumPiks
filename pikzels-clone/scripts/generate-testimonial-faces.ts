/**
 * Generate AI Faces for Testimonials
 * 
 * Generates gender and age-appropriate faces matching the testimonial names
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1';

// Face prompts for Reviews PAGE testimonials (different from landing page)
const FACE_PROMPTS = [
  {
    name: 'review1', // Marcus Rivera - Tech Channel
    prompt: 'Professional headshot photo of a Hispanic man in his late 20s, confident friendly smile, tech YouTuber look, short dark hair, casual professional style, neutral background, high quality portrait, realistic photo'
  },
  {
    name: 'review2', // Sarah Chen - Gaming Channel
    prompt: 'Professional headshot photo of an Asian American woman in her mid-20s, energetic smile, gaming streamer look, long dark hair, casual style, neutral background, high quality portrait, realistic photo'
  },
  {
    name: 'review3', // David Kim - Fitness Channel
    prompt: 'Professional headshot photo of a Korean American man in his early 30s, athletic confident smile, fitness influencer look, short hair, athletic build visible, neutral background, high quality portrait, realistic photo'
  },
  {
    name: 'review4', // Emily Rodriguez - Cooking Channel
    prompt: 'Professional headshot photo of a Hispanic woman in her early 30s, warm genuine smile, chef or food content creator look, dark wavy hair, natural makeup, neutral background, high quality portrait, realistic photo'
  },
  {
    name: 'review5', // James Thompson - Auto Reviews
    prompt: 'Professional headshot photo of a Caucasian man in his mid-30s, confident professional smile, automotive expert look, short brown hair, well-groomed stubble, neutral background, high quality portrait, realistic photo'
  },
  {
    name: 'review6', // Olivia Martinez - Vlogs
    prompt: 'Professional headshot photo of a Hispanic woman in her late 20s, warm approachable smile, lifestyle vlogger influencer look, long dark hair, stylish casual look, neutral background, high quality portrait, realistic photo'
  }
];

async function generateFace(prompt: string, filename: string): Promise<void> {
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
        'X-Title': 'ThumPiks Testimonial Faces'
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
      const outputPath = path.join(__dirname, '../client/public/images/testimonials', filename);
      fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
      console.log(`✅ Saved: ${filename}`);
      return;
    }

    console.log(`⚠️ No image in response for ${filename}`);

  } catch (error) {
    console.error(`❌ Error generating ${filename}:`, error);
  }
}

async function main() {
  console.log('👤 Generating Testimonial Faces\n');
  
  // Ensure output directory exists
  const outputDir = path.join(__dirname, '../client/public/images/testimonials');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate each face with a delay to avoid rate limiting
  for (let i = 0; i < FACE_PROMPTS.length; i++) {
    const item = FACE_PROMPTS[i];
    if (!item) continue;
    const { name, prompt } = item;
    await generateFace(prompt, `${name}.png`);
    
    // Wait 2 seconds between requests
    if (i < FACE_PROMPTS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n✨ Done! Update testimonials to use .png files if needed.');
}

main().catch(console.error);
