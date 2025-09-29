import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

export class AIService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiUrl = 'https://api.openai.com/v1/images/generations';
    
    if (!this.apiKey) {
      console.warn('OPENAI_API_KEY not found in environment variables. AI thumbnail generation will not work.');
    }
  }

  /**
   * Generate thumbnails using OpenAI's DALL-E 3 API
   * @param prompt Text prompt for image generation
   * @param style Style of the thumbnail (bold, minimalist, dramatic)
   * @param count Number of thumbnails to generate (1-10)
   * @returns Array of image URLs
   */
  async generateThumbnails(prompt: string, style: string, count: number = 3): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Validate inputs
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    if (count < 1 || count > 10) {
      throw new Error('Count must be between 1 and 10');
    }

    // Map our style options to DALL-E parameters
    const quality = 'hd'; // Always use high quality
    const size = '1024x1024'; // Standard size for thumbnails
    
    // Modify the prompt based on style for better results
    let styledPrompt = prompt;
    switch (style.toLowerCase()) {
      case 'bold':
        styledPrompt = `Bold, eye-catching thumbnail: ${prompt}. High contrast, vibrant colors, clear focal point.`;
        break;
      case 'minimalist':
        styledPrompt = `Minimalist thumbnail design: ${prompt}. Clean, simple, lots of white space, minimal elements.`;
        break;
      case 'dramatic':
        styledPrompt = `Dramatic thumbnail: ${prompt}. Strong lighting, high contrast, cinematic feel, emotional impact.`;
        break;
      default:
        styledPrompt = prompt;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: styledPrompt,
          n: Math.min(count, 10), // DALL-E 3 supports up to 10 images
          size: size,
          quality: quality
        })
      });

      // Handle different types of errors
      if (!response.ok) {
        let errorMessage = `OpenAI API error (${response.status}): `;
        
        try {
          const errorData: any = await response.json();
          errorMessage += errorData.error?.message || response.statusText;
          
          // Handle specific error cases
          if (response.status === 401) {
            errorMessage = 'Invalid OpenAI API key. Please check your API key configuration.';
          } else if (response.status === 400) {
            errorMessage = `Invalid request: ${errorData.error?.message || 'Bad request'}`;
          } else if (response.status === 429) {
            errorMessage = 'Rate limit exceeded. Please try again later.';
          } else if (response.status >= 500) {
            errorMessage = 'OpenAI service is temporarily unavailable. Please try again later.';
          }
        } catch (parseError) {
          // If we can't parse the error response, use the status text
          errorMessage += response.statusText;
        }
        
        throw new Error(errorMessage);
      }

      const data: any = await response.json();
      
      // Validate response structure
      if (!data || !data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response from OpenAI API');
      }
      
      // Extract image URLs from the response
      return data.data.map((item: any) => {
        if (!item || !item.url) {
          throw new Error('Invalid image data in OpenAI API response');
        }
        return item.url;
      });
    } catch (error) {
      // Handle network errors and other exceptions
      if (error instanceof Error) {
        // Re-throw with more context if it's already an Error object
        throw new Error(`Failed to generate thumbnails: ${error.message}`);
      } else {
        // Handle non-Error objects
        throw new Error(`Failed to generate thumbnails: ${String(error)}`);
      }
    }
  }

  /**
   * Validate if the AI service is properly configured
   * @returns Boolean indicating if the service is ready to use
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}