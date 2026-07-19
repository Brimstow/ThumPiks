# Template Marketplace Documentation

## Overview

The Template Marketplace is a feature that allows users to share their thumbnail configurations as templates and discover templates created by others. This creates a community-driven platform for sharing creative thumbnail designs.

## Architecture

The template marketplace follows a modular architecture with the following components:

1. **Database Model**:
   - Template model with relationships to Thumbnail and User models
   - Fields for template metadata, visibility control, and usage tracking

2. **Backend Services**:
   - TemplateService for handling template operations
   - TemplateController for API endpoints
   - Template routes for RESTful API access

3. **Frontend Components** (to be implemented):
   - Template marketplace browsing interface
   - Template creation and editing forms
   - Template preview functionality
   - User template management dashboard

## Database Schema

The Template model includes the following fields:

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Unique identifier for the template |
| name | String | Template name |
| description | String (optional) | Template description |
| thumbnailId | String | Reference to the source thumbnail |
| creatorId | String | Reference to the template creator |
| parameters | Json | Template parameters that can be applied to new thumbnails |
| tags | Json | Tags for categorization and search (stored as JSON array) |
| isPublic | Boolean | Whether this template is publicly available |
| downloads | Int | Number of times this template has been used |
| likes | Int | Number of likes for this template |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

## API Endpoints

### Get Templates

**GET** `/api/templates`

Retrieve templates with optional filtering.

#### Request

```http
GET /api/templates?isPublic=true&tags=bold,modern&sortBy=downloads&sortOrder=desc
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search in template name or description |
| tags | string | Comma-separated list of tags to filter by |
| isPublic | boolean | Filter by public visibility |
| creatorId | string | Filter by template creator |
| sortBy | string | Sort field (createdAt, downloads, likes) |
| sortOrder | string | Sort order (asc, desc) |
| page | number | Page number for pagination |
| limit | number | Number of items per page |

#### Response

```json
[
  {
    "id": "template-123",
    "name": "Bold Modern Design",
    "description": "A bold and modern thumbnail template",
    "thumbnail": {
      "id": "thumbnail-456",
      "title": "Sample Thumbnail",
      "imageUrl": "/processed-images/sample.jpg"
    },
    "creator": {
      "id": "user-789",
      "name": "John Doe",
      "avatarUrl": "/avatars/john.jpg"
    },
    "parameters": {
      "style": "bold",
      "color": "#ff0000"
    },
    "tags": ["bold", "modern", "red"],
    "isPublic": true,
    "downloads": 42,
    "likes": 15,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Get Template by ID

**GET** `/api/templates/:id`

Retrieve a specific template by its ID.

#### Request

```http
GET /api/templates/template-123
Authorization: Bearer <token>
```

#### Response

```json
{
  "id": "template-123",
  "name": "Bold Modern Design",
  "description": "A bold and modern thumbnail template",
  "thumbnail": {
    "id": "thumbnail-456",
    "title": "Sample Thumbnail",
    "imageUrl": "/processed-images/sample.jpg"
  },
  "creator": {
    "id": "user-789",
    "name": "John Doe",
    "avatarUrl": "/avatars/john.jpg"
  },
  "parameters": {
    "style": "bold",
    "color": "#ff0000"
  },
  "tags": ["bold", "modern", "red"],
  "isPublic": true,
  "downloads": 42,
  "likes": 15,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### Create Template

**POST** `/api/templates`

Create a new template from an existing thumbnail.

#### Request

```http
POST /api/templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Template",
  "description": "A description of my template",
  "thumbnailId": "thumbnail-456",
  "parameters": {
    "style": "bold",
    "color": "#ff0000"
  },
  "tags": ["bold", "red", "modern"],
  "isPublic": true
}
```

#### Response

```json
{
  "id": "template-123",
  "name": "My Template",
  "description": "A description of my template",
  "thumbnailId": "thumbnail-456",
  "creatorId": "user-789",
  "parameters": {
    "style": "bold",
    "color": "#ff0000"
  },
  "tags": ["bold", "red", "modern"],
  "isPublic": true,
  "downloads": 0,
  "likes": 0,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### Update Template

**PUT** `/api/templates/:id`

Update an existing template.

#### Request

```http
PUT /api/templates/template-123
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Template Name",
  "description": "Updated description",
  "tags": ["updated", "tags"],
  "isPublic": false
}
```

#### Response

```json
{
  "id": "template-123",
  "name": "Updated Template Name",
  "description": "Updated description",
  "thumbnailId": "thumbnail-456",
  "creatorId": "user-789",
  "parameters": {
    "style": "bold",
    "color": "#ff0000"
  },
  "tags": ["updated", "tags"],
  "isPublic": false,
  "downloads": 0,
  "likes": 0,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-02T00:00:00.000Z"
}
```

### Delete Template

**DELETE** `/api/templates/:id`

Delete a template.

#### Request

```http
DELETE /api/templates/template-123
Authorization: Bearer <token>
```

#### Response

```http
HTTP/1.1 204 No Content
```

### Increment Template Downloads

**POST** `/api/templates/:id/download`

Increment the download count for a template (when a user uses a template).

#### Request

```http
POST /api/templates/template-123/download
Authorization: Bearer <token>
```

#### Response

```json
{
  "id": "template-123",
  "name": "Bold Modern Design",
  "downloads": 43,
  "likes": 15,
  // ... other fields
}
```

### Toggle Template Like

**POST** `/api/templates/:id/like`

Increment the like count for a template.

#### Request

```http
POST /api/templates/template-123/like
Authorization: Bearer <token>
```

#### Response

```json
{
  "id": "template-123",
  "name": "Bold Modern Design",
  "downloads": 42,
  "likes": 16,
  // ... other fields
}
```

## Implementation Details

### Backend Implementation

The backend implementation consists of:

1. **Template Service** (`src/modules/templates/template.service.ts`):
   - Handles all database operations for templates
   - Includes methods for creating, reading, updating, and deleting templates
   - Implements filtering, sorting, and pagination
   - Manages download and like counts

2. **Template Controller** (`src/modules/templates/template.controller.ts`):
   - Exposes RESTful API endpoints
   - Handles request validation and error responses
   - Implements authentication checks for protected endpoints

3. **Template Routes** (`src/modules/templates/template.routes.ts`):
   - Defines the API routes for template operations
   - Maps HTTP methods to controller functions
   - Applies authentication middleware to protected endpoints

### Frontend Implementation (To Be Implemented)

The frontend implementation will include:

1. **Template Marketplace Page**:
   - Browse public templates with search and filtering
   - Sort templates by popularity, downloads, or recency
   - Preview templates before applying them

2. **Template Creation Form**:
   - Convert existing thumbnails to templates
   - Add metadata (name, description, tags)
   - Set visibility (public/private)

3. **User Templates Dashboard**:
   - View and manage created templates
   - Edit template metadata
   - Track usage statistics (downloads, likes)

4. **Template Application**:
   - Apply templates to new thumbnails
   - Customize template parameters
   - Save as new thumbnail or update existing one

## Future Enhancements

Potential future enhancements for the template marketplace:

1. **Template Categories**:
   - Organize templates into categories (e.g., YouTube, Podcast, Blog)
   - Browse templates by category

2. **Template Rating System**:
   - Allow users to rate templates
   - Display average ratings and reviews

3. **Template Collections**:
   - Create and share collections of related templates
   - Follow other users' collections

4. **Advanced Search**:
   - Filter by color palette
   - Search by design elements
   - AI-powered template recommendations

5. **Template Versioning**:
   - Track changes to templates over time
   - Revert to previous versions

6. **Template Collaboration**:
   - Allow multiple users to contribute to templates
   - Comment and discuss template improvements

## Security Considerations

- All template operations (except public browsing) require authentication
- Users can only modify templates they created
- Input validation is performed on all user-provided data
- Database queries are parameterized to prevent injection attacks