# API Reference

<cite>
**Referenced Files in This Document**
- [server.ts](file://src/server.ts)
- [auth.routes.ts](file://src/modules/auth/auth.routes.ts)
- [thumbnail.routes.ts](file://pikzels-clone/src/modules/thumbnail/thumbnail.routes.ts)
- [thumbnail.controller.ts](file://pikzels-clone/src/modules/thumbnail/thumbnail.controller.ts)
- [openrouter-ai.service.ts](file://pikzels-clone/src/modules/thumbnail/openrouter-ai.service.ts)
- [ai-service-manager.ts](file://pikzels-clone/src/modules/thumbnail/ai-service-manager.ts)
- [ai-provider-load-balancer.ts](file://pikzels-clone/src/modules/thumbnail/ai-provider-load-balancer.ts)
- [project.routes.ts](file://src/modules/project/project.routes.ts)
- [analytics.routes.ts](file://src/modules/analytics/analytics.routes.ts)
- [social-share.routes.ts](file://src/modules/social-share/social-share.routes.ts)
- [template.routes.ts](file://src/modules/templates/template.routes.ts)
- [collaboration.routes.ts](file://src/modules/collaboration/collaboration.routes.ts)
- [auth.middleware.ts](file://src/middleware/auth.middleware.ts)
- [package.json](file://package.json)
- [.env.example](file://pikzels-clone/.env.example)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive documentation for new AI-powered thumbnail endpoints
- Documented AI tool operations: inpaint, face-swap, upscale, remove-background, enhance
- Added OpenRouter AI service integration details and model configurations
- Updated authentication requirements to include AI service configuration validation
- Enhanced error handling documentation for AI operations
- Added rate limiting and service availability considerations for AI endpoints
- Documented environment variable configuration for AI tool models

## Table of Contents
1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Thumbnails API](#thumbnails-api)
4. [AI Tools API](#ai-tools-api)
5. [Projects API](#projects-api)
6. [Analytics API](#analytics-api)
7. [Social Share API](#social-share-api)
8. [Templates API](#templates-api)
9. [Collaboration API](#collaboration-api)
10. [Error Handling](#error-handling)
11. [Rate Limiting and Versioning](#rate-limiting-and-versioning)
12. [Security Considerations](#security-considerations)
13. [Code Examples](#code-examples)
14. [Troubleshooting Guide](#troubleshooting-guide)

## Introduction
This document provides comprehensive reference documentation for the RESTful API endpoints of Thumbnail Maker Studio. The API enables users to manage thumbnails, projects, templates, analytics, social sharing, team collaboration, and AI-powered image manipulation tools. All endpoints follow REST conventions and return JSON responses.

The base URL for all API endpoints is `http://localhost:8550/api`. The API uses standard HTTP methods and status codes. Authentication is required for most endpoints using JWT tokens.

**Section sources**
- [server.ts](file://src/server.ts#L1-L58)

## Authentication

### Overview
The authentication system uses JWT (JSON Web Tokens) for secure access to protected resources. Users must first register or log in to obtain a token, which must be included in the `Authorization` header for subsequent requests.

### Endpoints
- `POST /api/auth/register` - Create a new user account
- `POST /api/auth/login` - Authenticate and receive JWT token
- `POST /api/auth/request-password-reset` - Initiate password reset
- `POST /api/auth/reset-password` - Complete password reset

### Authentication Requirements
All protected endpoints require a valid JWT token in the `Authorization` header using the Bearer scheme:
```
Authorization: Bearer <token>
```

If no token is provided or the token is invalid, the server returns a 401 Unauthorized status.

**Section sources**
- [auth.routes.ts](file://src/modules/auth/auth.routes.ts#L1-L17)
- [auth.middleware.ts](file://src/middleware/auth.middleware.ts#L1-L55)

## Thumbnails API

### Overview
The Thumbnails API provides full CRUD operations for managing thumbnail images, including AI-powered enhancements, sharing, and styling.

### Base URL
`/api/thumbnails`

### Endpoints

#### Create Thumbnail
- **Method**: POST
- **URL**: `/api/thumbnails`
- **Authentication**: Required
- **Request Body**: Thumbnail creation parameters
- **Response**: Created thumbnail object

#### Generate Thumbnail
- **Method**: POST
- **URL**: `/api/thumbnails/generate`
- **Authentication**: Required
- **Request Body**: Generation parameters
- **Response**: Generated thumbnail object

#### List Thumbnails
- **Method**: GET
- **URL**: `/api/thumbnails`
- **Authentication**: Required
- **Query Parameters**: Pagination and filtering options
- **Response**: Array of thumbnail objects

#### Get Thumbnail by ID
- **Method**: GET
- **URL**: `/api/thumbnails/:id`
- **Authentication**: Required
- **Response**: Thumbnail object

#### Update Thumbnail
- **Method**: PUT
- **URL**: `/api/thumbnails/:id`
- **Authentication**: Required
- **Request Body**: Updated thumbnail data
- **Response**: Updated thumbnail object

#### Delete Thumbnail
- **Method**: DELETE
- **URL**: `/api/thumbnails/:id`
- **Authentication**: Required
- **Response**: Success confirmation

#### Download Thumbnail
- **Method**: GET
- **URL**: `/api/thumbnails/:id/download`
- **Authentication**: Required
- **Response**: File download

#### Apply Edits
- **Method**: POST
- **URL**: `/api/thumbnails/:id/edit`
- **Authentication**: Required
- **Request Body**: Edit operations
- **Response**: Edited thumbnail object

#### Share Thumbnail
- **Method**: POST
- **URL**: `/api/thumbnails/:id/share`
- **Authentication**: Required
- **Response**: Share token and link

#### Access Shared Thumbnail
- **Method**: GET
- **URL**: `/api/thumbnails/share/:token`
- **Authentication**: Not required
- **Response**: Shared thumbnail data

#### Revoke Share Link
- **Method**: DELETE
- **URL**: `/api/thumbnails/:id/share`
- **Authentication**: Required
- **Response**: Success confirmation

#### Set as Featured
- **Method**: POST
- **URL**: `/api/thumbnails/:id/featured`
- **Authentication**: Required
- **Response**: Success confirmation

#### AI Style Transfer
- **Method**: POST
- **URL**: `/api/thumbnails/:id/style-transfer`
- **Authentication**: Required
- **Request Body**: Style transfer parameters
- **Response**: Styled thumbnail

#### Image Enhancement
- **Method**: POST
- **URL**: `/api/thumbnails/:id/image-enhancement`
- **Authentication**: Required
- **Request Body**: Enhancement parameters
- **Response**: Enhanced thumbnail

#### Get Available Styles
- **Method**: GET
- **URL**: `/api/thumbnails/ai/styles`
- **Authentication**: Required
- **Response**: List of available AI styles

#### Get Available Enhancements
- **Method**: GET
- **URL**: `/api/thumbnails/ai/enhancements`
- **Authentication**: Required
- **Response**: List of available enhancement options

**Section sources**
- [thumbnail.routes.ts](file://pikzels-clone/src/modules/thumbnail/thumbnail.routes.ts#L1-L56)

## AI Tools API

### Overview
The AI Tools API provides advanced image manipulation capabilities powered by OpenRouter AI services. These endpoints enable users to perform sophisticated image editing operations including inpainting, face swapping, upscaling, background removal, and quality enhancement.

### Base URL
`/api/thumbnails/ai`

### Endpoints

#### Get AI Tool Models
- **Method**: GET
- **URL**: `/api/thumbnails/ai/models`
- **Authentication**: Required
- **Response**: Object containing model configurations for each AI tool type

#### Inpaint Image
- **Method**: POST
- **URL**: `/api/thumbnails/ai/inpaint`
- **Authentication**: Required
- **Request Body**: `{ image: base64, mask?: base64, prompt: string }`
- **Response**: `{ success: boolean, images: string[], model: string }`

#### Face Swap
- **Method**: POST
- **URL**: `/api/thumbnails/ai/face-swap`
- **Authentication**: Required
- **Request Body**: `{ sourceImage: base64, targetImage: base64, prompt?: string }`
- **Response**: `{ success: boolean, images: string[], model: string }`

#### Upscale Image
- **Method**: POST
- **URL**: `/api/thumbnails/ai/upscale`
- **Authentication**: Required
- **Request Body**: `{ image: base64, scale?: '2x' | '4x' }`
- **Response**: `{ success: boolean, images: string[], model: string, scale: string }`

#### Remove Background
- **Method**: POST
- **URL**: `/api/thumbnails/ai/remove-background`
- **Authentication**: Required
- **Request Body**: `{ image: base64, backgroundColor?: string }`
- **Response**: `{ success: boolean, images: string[], model: string }`

#### Enhance Image
- **Method**: POST
- **URL**: `/api/thumbnails/ai/enhance`
- **Authentication**: Required
- **Request Body**: `{ image: base64, enhancementType?: 'auto' | 'color' | 'sharpen' | 'denoise' | 'hdr' }`
- **Response**: `{ success: boolean, images: string[], model: string, enhancementType: string }`

### AI Tool Model Configurations
The system uses specialized models optimized for each operation:

- **Generate**: `google/gemini-2.5-flash-image` (primary), `black-forest-labs/flux.2-pro` (fallback)
- **Inpaint**: `google/gemini-3-pro-image-preview` (primary), `black-forest-labs/flux.2-flex` (fallback)
- **Face Swap**: `bytedance-seed/seedream-4.5` (primary), `google/gemini-3-pro-image-preview` (fallback)
- **Upscale**: `black-forest-labs/flux.2-max` (primary), `sourceful/riverflow-v2-max-preview` (fallback)

### Environment Variables
- `OPENROUTER_API_KEY`: Required for AI operations
- `OPENROUTER_MODEL_GENERATE`: Override default generate model
- `OPENROUTER_MODEL_INPAINT`: Override default inpaint model
- `OPENROUTER_MODEL_FACESWAP`: Override default face swap model
- `OPENROUTER_MODEL_UPSCALE`: Override default upscale model

### Error Handling
AI operations may encounter various errors:
- **503 Service Unavailable**: AI service not configured or unavailable
- **400 Bad Request**: Invalid request parameters or unsupported enhancement type
- **429 Too Many Requests**: OpenRouter rate limit exceeded

**Section sources**
- [thumbnail.routes.ts](file://pikzels-clone/src/modules/thumbnail/thumbnail.routes.ts#L64-L99)
- [thumbnail.controller.ts](file://pikzels-clone/src/modules/thumbnail/thumbnail.controller.ts#L933-L1245)
- [openrouter-ai.service.ts](file://pikzels-clone/src/modules/thumbnail/openrouter-ai.service.ts#L53-L80)
- [openrouter-ai.service.ts](file://pikzels-clone/src/modules/thumbnail/openrouter-ai.service.ts#L533-L551)
- [.env.example](file://pikzels-clone/.env.example#L93-L104)

## Projects API

### Overview
The Projects API manages user projects, which can contain multiple thumbnails and have a featured thumbnail.

### Base URL
`/api/projects`

### Endpoints

#### Create Project
- **Method**: POST
- **URL**: `/api/projects`
- **Authentication**: Required
- **Request Body**: Project creation data
- **Response**: Created project object

#### List Projects
- **Method**: GET
- **URL**: `/api/projects`
- **Authentication**: Required
- **Query Parameters**: Pagination options
- **Response**: Array of project objects

#### Get Project by ID
- **Method**: GET
- **URL**: `/api/projects/:id`
- **Authentication**: Required
- **Response**: Project object with thumbnails

#### Update Project
- **Method**: PUT
- **URL**: `/api/projects/:id`
- **Authentication**: Required
- **Request Body**: Updated project data
- **Response**: Updated project object

#### Delete Project
- **Method**: DELETE
- **URL**: `/api/projects/:id`
- **Authentication**: Required
- **Response**: Success confirmation

#### Set Featured Thumbnail
- **Method**: PUT
- **URL**: `/api/projects/:projectId/featured-thumbnail`
- **Authentication**: Required
- **Request Body**: Thumbnail ID
- **Response**: Success confirmation

**Section sources**
- [project.routes.ts](file://src/modules/project/project.routes.ts#L1-L31)

## Analytics API

### Overview
The Analytics API provides insights into thumbnail performance, usage patterns, and trends.

### Base URL
`/api/analytics`

### Endpoints

#### Dashboard Data
- **Method**: GET
- **URL**: `/api/analytics/dashboard`
- **Authentication**: Required
- **Response**: Summary analytics data

#### Advanced Analytics
- **Method**: GET
- **URL**: `/api/analytics/advanced`
- **Authentication**: Required
- **Response**: Comprehensive analytics data

#### Detailed Analytics
- **Method**: GET
- **URL**: `/api/analytics/detailed`
- **Authentication**: Required
- **Query Parameters**: Timeframe filters
- **Response**: Detailed analytics with filtering

#### Comparative Analytics
- **Method**: GET
- **URL**: `/api/analytics/comparative`
- **Authentication**: Required
- **Response**: Current vs previous period comparison

#### Thumbnail Trends
- **Method**: GET
- **URL**: `/api/analytics/trends`
- **Authentication**: Required
- **Response**: Trending thumbnail data

#### Style Distribution
- **Method**: GET
- **URL**: `/api/analytics/styles`
- **Authentication**: Required
- **Response**: Distribution of styles used

#### Project Usage
- **Method**: GET
- **URL**: `/api/analytics/projects`
- **Authentication**: Required
- **Response**: Project usage statistics

**Section sources**
- [analytics.routes.ts](file://src/modules/analytics/analytics.routes.ts#L1-L47)

## Social Share API

### Overview
The Social Share API manages sharing of thumbnails to social media platforms and tracks share statistics.

### Base URL
`/api/social-share`

### Endpoints

#### Share Thumbnail
- **Method**: POST
- **URL**: `/api/social-share/share`
- **Authentication**: Required
- **Request Body**: Share parameters including platform and thumbnail ID
- **Response**: Share confirmation and statistics

#### List Social Shares
- **Method**: GET
- **URL**: `/api/social-share`
- **Authentication**: Required
- **Response**: Array of social share records

#### Get Share Statistics
- **Method**: GET
- **URL**: `/api/social-share/stats`
- **Authentication**: Required
- **Response**: Aggregated share statistics

#### Get Shares for Thumbnail
- **Method**: GET
- **URL**: `/api/social-share/thumbnail/:thumbnailId`
- **Authentication**: Required
- **Response**: Share records for specific thumbnail

#### Delete Social Share
- **Method**: DELETE
- **URL**: `/api/social-share/:id`
- **Authentication**: Required
- **Response**: Success confirmation

**Section sources**
- [social-share.routes.ts](file://src/modules/social-share/social-share.routes.ts#L1-L27)

## Templates API

### Overview
The Templates API manages template creation, retrieval, and user interactions like downloads and likes.

### Base URL
`/api/templates`

### Endpoints

#### List Templates
- **Method**: GET
- **URL**: `/api/templates`
- **Authentication**: Not required
- **Query Parameters**: Filtering and sorting options
- **Response**: Array of template objects

#### Get Template by ID
- **Method**: GET
- **URL**: `/api/templates/:id`
- **Authentication**: Not required
- **Response**: Template object

#### Create Template
- **Method**: POST
- **URL**: `/api/templates`
- **Authentication**: Required
- **Request Body**: Template creation data
- **Response**: Created template object

#### Update Template
- **Method**: PUT
- **URL**: `/api/templates/:id`
- **Authentication**: Required
- **Request Body**: Updated template data
- **Response**: Updated template object

#### Delete Template
- **Method**: DELETE
- **URL**: `/api/templates/:id`
- **Authentication**: Required
- **Response**: Success confirmation

#### Increment Template Downloads
- **Method**: POST
- **URL**: `/api/templates/:id/download`
- **Authentication**: Not required
- **Response**: Updated download count

#### Toggle Template Like
- **Method**: POST
- **URL**: `/api/templates/:id/like`
- **Authentication**: Required
- **Response**: Updated like status

**Section sources**
- [template.routes.ts](file://src/modules/templates/template.routes.ts#L1-L27)

## Collaboration API

### Overview
The Collaboration API enables team-based workflows with team management, invitations, and project collaboration.

### Base URL
`/api/collaboration`

### Endpoints

#### Create Team
- **Method**: POST
- **URL**: `/api/collaboration/teams`
- **Authentication**: Required
- **Request Body**: Team creation data
- **Response**: Created team object

#### List User Teams
- **Method**: GET
- **URL**: `/api/collaboration/teams`
- **Authentication**: Required
- **Response**: Array of team objects

#### Get Team by ID
- **Method**: GET
- **URL**: `/api/collaboration/teams/:id`
- **Authentication**: Required
- **Response**: Team object with members

#### Update Team
- **Method**: PUT
- **URL**: `/api/collaboration/teams/:id`
- **Authentication**: Required
- **Request Body**: Updated team data
- **Response**: Updated team object

#### Delete Team
- **Method**: DELETE
- **URL**: `/api/collaboration/teams/:id`
- **Authentication**: Required
- **Response**: Success confirmation

#### Invite User to Team
- **Method**: POST
- **URL**: `/api/collaboration/teams/:teamId/invite`
- **Authentication**: Required
- **Request Body**: Invitation data (email, role)
- **Response**: Invitation record

#### Remove Team Member
- **Method**: DELETE
- **URL**: `/api/collaboration/teams/:teamId/members/:memberId`
- **Authentication**: Required
- **Response**: Success confirmation

#### Update Member Role
- **Method**: PUT
- **URL**: `/api/collaboration/teams/:teamId/members/:memberId/role`
- **Authentication**: Required
- **Request Body**: New role
- **Response**: Updated member record

#### List User Invitations
- **Method**: GET
- **URL**: `/api/collaboration/invitations`
- **Authentication**: Required
- **Response**: Array of pending invitations

#### Respond to Invitation
- **Method**: POST
- **URL**: `/api/collaboration/invitations/:id/respond`
- **Authentication**: Required
- **Request Body**: Response (accept/reject)
- **Response**: Updated invitation status

#### List Team Projects
- **Method**: GET
- **URL**: `/api/collaboration/teams/:teamId/projects`
- **Authentication**: Required
- **Response**: Array of projects associated with team

**Section sources**
- [collaboration.routes.ts](file://src/modules/collaboration/collaboration.routes.ts#L1-L47)

## Error Handling

### Error Response Format
All error responses follow a consistent JSON format:
```json
{
  "error": "Error message describing the issue"
}
```

### Common Status Codes
- **400 Bad Request**: Invalid request parameters or body
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Valid token but insufficient permissions
- **404 Not Found**: Requested resource does not exist
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected server error
- **503 Service Unavailable**: AI service not configured or unavailable

### Specific Error Scenarios
- Authentication errors return 401 or 403 status codes
- Validation errors return 400 with descriptive messages
- Resource not found errors return 404
- Rate limiting returns 429 with retry-after header
- AI service configuration errors return 503 with specific error messages

**Section sources**
- [auth.middleware.ts](file://src/middleware/auth.middleware.ts#L1-L55)

## Rate Limiting and Versioning

### Rate Limiting
The API implements rate limiting to prevent abuse and ensure service availability:
- **Limit**: 100 requests per 15-minute window per user
- **Headers**: Responses include rate limit information
- **Exemptions**: Certain public endpoints have higher limits

When the rate limit is exceeded, the API returns a 429 status code with a `Retry-After` header indicating when the client can retry.

### AI Service Rate Limits
AI operations are subject to additional rate limits from OpenRouter:
- **Default timeout**: 120 seconds for image generation operations
- **Retry attempts**: Up to 2 automatic retries with 3-second delays
- **Model-specific limits**: Vary by AI provider and model type

### Versioning Strategy
The current API uses URL-based versioning:
- Base path: `/api/v1/` (current version)
- Backward compatibility is maintained for at least 6 months
- Deprecation notices are provided 3 months before endpoint removal

Version information is also available in the response headers:
```
API-Version: 1.0
API-Deprecated: false
```

### Deprecation Notices
Deprecated endpoints include a warning in the response:
```json
{
  "warning": "This endpoint is deprecated and will be removed on YYYY-MM-DD"
}
```

**Section sources**
- [server.ts](file://src/server.ts#L1-L58)

## Security Considerations

### API Keys
The system uses JWT tokens instead of traditional API keys. Tokens are generated upon successful authentication and should be stored securely by clients.

### CORS Policies
The API implements strict CORS policies:
- Allowed origins: Registered application domains
- Allowed methods: GET, POST, PUT, DELETE
- Allowed headers: Authorization, Content-Type, Accept
- Credentials: Allowed for trusted origins

### Data Validation
All input data is validated:
- Request bodies are validated against schemas
- Path parameters are validated for format and existence
- Query parameters are sanitized and validated
- File uploads are scanned for malware

### AI Service Security
AI operations include additional security measures:
- API key validation for OpenRouter services
- Request timeout protection (120 seconds default)
- Model capability verification
- Prompt content validation

### Security Headers
The API includes security headers:
- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options
- Content-Security-Policy

**Section sources**
- [server.ts](file://src/server.ts#L1-L58)
- [auth.middleware.ts](file://src/middleware/auth.middleware.ts#L1-L55)

## Code Examples

### JavaScript (Fetch API)
```javascript
// Login and get token
fetch('http://localhost:8550/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
})
.then(response => response.json())
.then(data => {
  const token = data.token;
  // Use token for authenticated requests
  fetch('http://localhost:8550/api/thumbnails', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
});

// AI Enhance Example
fetch('http://localhost:8550/api/thumbnails/ai/enhance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    enhancementType: 'auto'
  })
})
.then(response => response.json())
.then(data => console.log('Enhanced image URL:', data.images[0]));
```

### Python (requests)
```python
import requests

# Login and get token
response = requests.post(
    'http://localhost:8550/api/auth/login',
    json={
        'email': 'user@example.com',
        'password': 'password'
    }
)
token = response.json()['token']

# Make authenticated request
headers = {'Authorization': f'Bearer {token}'}
response = requests.get(
    'http://localhost:8550/api/thumbnails',
    headers=headers
)
print(response.json())

# AI Face Swap Example
ai_response = requests.post(
    'http://localhost:8550/api/thumbnails/ai/face-swap',
    headers=headers,
    json={
        'sourceImage': 'data:image/png;base64,...',
        'targetImage': 'data:image/png;base64,...',
        'prompt': 'Maintain natural lighting and skin tone'
    }
)
print(ai_response.json())
```

**Section sources**
- [auth.routes.ts](file://src/modules/auth/auth.routes.ts#L1-L17)
- [thumbnail.routes.ts](file://pikzels-clone/src/modules/thumbnail/thumbnail.routes.ts#L1-L56)

## Troubleshooting Guide

### Common Issues

#### Authentication Failures
- **Symptom**: 401 Unauthorized responses
- **Solution**: Verify token is included in Authorization header
- **Debug**: Check token expiration and validity

#### CORS Errors
- **Symptom**: Browser blocks API requests
- **Solution**: Ensure origin is whitelisted
- **Debug**: Check browser developer console for CORS errors

#### Rate Limiting
- **Symptom**: 429 Too Many Requests
- **Solution**: Implement exponential backoff
- **Debug**: Check Retry-After header value

#### AI Service Configuration
- **Symptom**: 503 Service Unavailable for AI endpoints
- **Solution**: Set OPENROUTER_API_KEY environment variable
- **Debug**: Verify AI service is properly configured

#### Invalid Request Parameters
- **Symptom**: 400 Bad Request
- **Solution**: Validate request body against documentation
- **Debug**: Check error message for specific validation failures

#### Resource Not Found
- **Symptom**: 404 Not Found
- **Solution**: Verify resource ID exists
- **Debug**: List resources to confirm ID

### Debugging Techniques
- Use the health check endpoint (`/health`) to verify API availability
- Check response headers for rate limiting and version information
- Validate JWT tokens using standard libraries
- Test endpoints with curl or Postman before integration
- Monitor AI service availability and model configurations
- Check OpenRouter API key validity and credits balance

**Section sources**
- [server.ts](file://src/server.ts#L1-L58)
- [auth.middleware.ts](file://src/middleware/auth.middleware.ts#L1-L55)