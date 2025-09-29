# Extending AI Integration

## Overview

This guide provides instructions for extending and customizing the AI thumbnail generation functionality. The current implementation uses OpenAI's DALL-E 3 API, but the architecture is designed to support other AI services as well.

## Architecture

The AI integration follows a modular architecture:

1. **AIService** - Handles communication with the AI provider
2. **ThumbnailController** - Integrates AI service with thumbnail generation
3. **Frontend Components** - Provide user interface for AI generation
4. **Configuration** - Environment-based configuration management

## Adding New AI Providers

To add support for a new AI provider, follow these steps:

### 1. Create a New Service Class

Create a new service class that implements the same interface as AIService:

```typescript
// src/modules/thumbnail/ai-providers/new-provider.service.ts
import fetch from 'node-fetch';

export class NewProviderService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.NEW_PROVIDER_API_KEY || '';
    this.apiUrl = 'https://api.newprovider.com/v1/images/generations';
  }

  async generateThumbnails(prompt: string, style: string, count: number = 3): Promise<string[]> {
    // Implementation specific to the new provider
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
```

### 2. Update the Thumbnail Controller

Modify the thumbnail controller to support the new provider:

```typescript
// In thumbnail.controller.ts
import { NewProviderService } from './ai-providers/new-provider.service';

const newProviderService = new NewProviderService();

// In generateThumbnail method:
if (newProviderService.isConfigured()) {
  try {
    const imageUrls = await newProviderService.generateThumbnails(prompt, style, 3);
    // Process results...
  } catch (error) {
    // Handle errors...
  }
}
```

### 3. Update Environment Configuration

Add the new provider's API key to the environment configuration:

```env
# .env.example
NEW_PROVIDER_API_KEY=your_new_provider_api_key_here
```

## Customizing Prompt Engineering

The current implementation includes basic prompt engineering for different styles. You can enhance this by:

### 1. Adding More Styles

Extend the style mapping in AIService:

```typescript
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
  case 'vibrant':
    styledPrompt = `Vibrant thumbnail: ${prompt}. Bright colors, dynamic composition, energetic feel.`;
    break;
  case 'professional':
    styledPrompt = `Professional thumbnail: ${prompt}. Clean layout, corporate colors, business-oriented.`;
    break;
  default:
    styledPrompt = prompt;
}
```

### 2. Advanced Prompt Templates

Create more sophisticated prompt templates:

```typescript
const promptTemplates = {
  youtube: (basePrompt: string) => `YouTube thumbnail: ${basePrompt}. Bold text, clear subject, high contrast, attention-grabbing.`,
  instagram: (basePrompt: string) => `Instagram post: ${basePrompt}. Square format, aesthetically pleasing, good lighting.`,
  blog: (basePrompt: string) => `Blog header image: ${basePrompt}. Professional, clean, text-readable.`
};

// Use in AIService:
const template = promptTemplates[styleType] || ((p: string) => p);
styledPrompt = template(prompt);
```

## Adding New Image Sizes

To support different image sizes:

### 1. Update AIService

```typescript
async generateThumbnails(prompt: string, style: string, count: number = 3, size: string = '1024x1024'): Promise<string[]> {
  // Add size parameter to the API request
  body: JSON.stringify({
    model: 'dall-e-3',
    prompt: styledPrompt,
    n: Math.min(count, 10),
    size: size, // Add this line
    quality: quality
  })
}
```

### 2. Update Frontend

Add size selection to the CreateThumbnail component:

```jsx
<div>
  <label htmlFor="size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
    Size
  </label>
  <select
    id="size"
    value={size}
    onChange={(e) => setSize(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
  >
    <option value="1024x1024">1024×1024 (Square)</option>
    <option value="1792x1024">1792×1024 (Landscape)</option>
    <option value="1024x1792">1024×1792 (Portrait)</option>
  </select>
</div>
```

## Performance Optimization

### 1. Caching

Implement caching for frequently requested prompts:

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

async generateThumbnails(prompt: string, style: string, count: number = 3): Promise<string[]> {
  const cacheKey = `${prompt}-${style}-${count}`;
  const cachedResult = cache.get<string[]>(cacheKey);
  
  if (cachedResult) {
    return cachedResult;
  }
  
  // Generate thumbnails...
  cache.set(cacheKey, result);
  return result;
}
```

### 2. Batch Processing

For generating multiple thumbnails efficiently:

```typescript
async generateBatchThumbnails(prompts: {prompt: string, style: string}[]): Promise<string[][]> {
  // Implement batch processing logic
}
```

## Monitoring and Analytics

### 1. Usage Tracking

Add usage tracking to monitor AI service consumption:

```typescript
// In AIService
async generateThumbnails(prompt: string, style: string, count: number = 3): Promise<string[]> {
  const startTime = Date.now();
  
  try {
    // Generate thumbnails...
    const duration = Date.now() - startTime;
    
    // Log usage
    console.log(`AI Generation: ${duration}ms, ${count} images`);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`AI Generation Failed: ${duration}ms`, error);
    throw error;
  }
}
```

### 2. Error Rate Monitoring

Track error rates to identify issues:

```typescript
private errorCount = 0;
private totalCount = 0;

getSuccessRate(): number {
  return this.totalCount > 0 ? (this.totalCount - this.errorCount) / this.totalCount : 1;
}
```

## Security Considerations

### 1. Input Validation

Enhance input validation:

```typescript
private validatePrompt(prompt: string): boolean {
  // Check for inappropriate content
  // Check length limits
  // Check for special characters
  return true;
}
```

### 2. Rate Limiting

Implement server-side rate limiting:

```typescript
import rateLimit from 'express-rate-limit';

const aiGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many thumbnail generation requests, please try again later."
});
```

## Testing

### 1. Unit Tests

Add unit tests for the AI service:

```typescript
// ai.service.test.ts
describe('AIService', () => {
  describe('generateThumbnails', () => {
    it('should generate thumbnails with valid input', async () => {
      // Test implementation
    });
    
    it('should handle API errors gracefully', async () => {
      // Test implementation
    });
  });
});
```

### 2. Integration Tests

Add integration tests for the full flow:

```typescript
// thumbnail.controller.test.ts
describe('ThumbnailController', () => {
  describe('generateThumbnail', () => {
    it('should generate AI thumbnails when configured', async () => {
      // Test implementation
    });
    
    it('should fall back to placeholders when AI is not configured', async () => {
      // Test implementation
    });
  });
});
```

## Deployment Considerations

### 1. Environment Configuration

Ensure proper environment configuration in production:

```env
# Production .env
OPENAI_API_KEY=your_production_api_key
NODE_ENV=production
```

### 2. Monitoring

Set up monitoring for production:

```typescript
// In AIService
if (process.env.NODE_ENV === 'production') {
  // Enable detailed logging
  // Send metrics to monitoring service
}
```

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Verify the API key is correct
   - Check if the key has the required permissions
   - Ensure the key is not expired

2. **Rate Limiting Errors**
   - Implement exponential backoff
   - Add user-facing rate limit information
   - Consider caching frequent requests

3. **Network Issues**
   - Implement retry logic with backoff
   - Add timeout handling
   - Provide clear error messages to users

### Debugging Tips

1. Enable debug logging:
   ```env
   DEBUG=ai-service,thumbnail-controller
   ```

2. Check the application logs for detailed error information

3. Use the OpenAI API dashboard to monitor usage and errors

## Future Enhancements

### 1. Image Editing Integration

Integrate AI-powered image editing:
```typescript
async editImage(imageUrl: string, editInstruction: string): Promise<string> {
  // Implementation for AI-powered image editing
}
```

### 2. Style Transfer

Add style transfer capabilities:
```typescript
async applyStyle(baseImage: string, styleReference: string): Promise<string> {
  // Implementation for style transfer
}
```

### 3. Content Moderation

Add AI-powered content moderation:
```typescript
async moderateContent(imageUrl: string): Promise<boolean> {
  // Implementation for content moderation
}
```