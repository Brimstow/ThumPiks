# AI Thumbnail Generation API

## Overview

The AI Thumbnail Generation API allows users to create thumbnails using OpenAI's DALL-E 3 image generation model. This API provides a seamless integration with the AI service while maintaining backward compatibility through placeholder image generation when the AI service is not configured.

## Endpoints

### Generate Thumbnails

**POST** `/api/thumbnails/generate`

Generate thumbnails using AI or fallback to placeholder images.

#### Request

```json
{
  "prompt": "A beautiful landscape with mountains and sunset",
  "style": "bold",
  "projectId": "project-id-123"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prompt | string | Yes | Text description of the desired thumbnail |
| style | string | No | Style of the thumbnail (bold, minimalist, dramatic) |
| projectId | string | Yes | ID of the project to associate with the thumbnails |

#### Response

**Success (201 Created):**

```json
{
  "message": "Thumbnails generated successfully with AI",
  "thumbnails": [
    {
      "id": "thumbnail-id-1",
      "title": "A beautiful landscape with mountains and sunset 1",
      "imageUrl": "https://example.com/generated-image-1.png",
      "prompt": "A beautiful landscape with mountains and sunset",
      "parameters": {
        "style": "bold",
        "variation": 1,
        "aiGenerated": true
      },
      "projectId": "project-id-123",
      "userId": "user-id-123",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
    // ... additional thumbnails
  ]
}
```

**Error (400 Bad Request):**

```json
{
  "error": "Prompt and projectId are required"
}
```

**Error (500 Internal Server Error):**

```json
{
  "error": "Internal server error"
}
```

## Style Options

The API supports three different styles for thumbnail generation:

1. **Bold** - High contrast, vibrant colors, clear focal point
2. **Minimalist** - Clean, simple, lots of white space, minimal elements
3. **Dramatic** - Strong lighting, high contrast, cinematic feel, emotional impact

## Error Handling

The API provides comprehensive error handling for various scenarios:

1. **Missing Configuration** - When the OpenAI API key is not configured, the service falls back to generating placeholder images
2. **Invalid API Key** - Returns a clear error message when the API key is invalid
3. **Rate Limiting** - Handles rate limiting from the OpenAI API
4. **Network Issues** - Gracefully handles network connectivity issues
5. **Invalid Parameters** - Validates input parameters and returns appropriate error messages

## Configuration

To enable AI thumbnail generation, you need to configure the OpenAI API key in your environment variables:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

If the API key is not configured, the service will automatically fall back to generating placeholder images.

## Fallback Mechanism

When the AI service is not available or encounters an error, the system automatically generates placeholder images with the following format:

```
https://placehold.co/1280x720/{random_color}/FFFFFF?text={encoded_prompt}
```

This ensures that users can always generate thumbnails, even when the AI service is not available.

## Rate Limiting

The OpenAI API has rate limits that may affect thumbnail generation. The service handles rate limiting gracefully and will return an appropriate error message when limits are exceeded.

## Security

All API endpoints are protected with JWT authentication. Users must be authenticated to generate thumbnails.