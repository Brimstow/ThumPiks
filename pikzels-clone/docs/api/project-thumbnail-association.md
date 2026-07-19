# Project Thumbnail Association API

This document describes the API endpoints for associating thumbnails with projects and setting featured thumbnails.

## Set Featured Thumbnail

Sets a specific thumbnail as the featured thumbnail for a project.

### Endpoint

```
PUT /api/projects/:projectId/featured-thumbnail
```

### Authentication

Required. Include a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Parameters

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
| projectId | path | string | Yes | The ID of the project |
| thumbnailId | body | string | Yes | The ID of the thumbnail to set as featured |

### Request Body

```json
{
  "thumbnailId": "thumbnail-123"
}
```

### Responses

#### 200 OK

Successfully set the featured thumbnail.

```json
{
  "project": {
    "id": "project-123",
    "name": "My Project",
    "description": "A sample project",
    "userId": "user-123",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "featuredThumbnailId": "thumbnail-123",
    "featuredThumbnail": {
      "id": "thumbnail-123",
      "title": "Featured Thumbnail",
      "imageUrl": "https://example.com/image.png",
      "prompt": "A beautiful landscape",
      "parameters": {},
      "projectId": "project-123",
      "userId": "user-123",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

#### 400 Bad Request

Invalid request parameters.

```json
{
  "error": "Thumbnail does not belong to this project"
}
```

#### 401 Unauthorized

Missing or invalid authentication token.

```json
{
  "error": "Unauthorized"
}
```

#### 403 Forbidden

User does not have permission to modify this project.

```json
{
  "error": "Forbidden"
}
```

#### 404 Not Found

Project not found.

```json
{
  "error": "Project not found"
}
```

#### 500 Internal Server Error

An unexpected error occurred.

```json
{
  "error": "Internal server error"
}
```

## Get Project with Featured Thumbnail

When retrieving a project, the featured thumbnail is automatically included if one is set.

### Endpoint

```
GET /api/projects/:id
```

### Authentication

Required. Include a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Parameters

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
| id | path | string | Yes | The ID of the project |

### Responses

#### 200 OK

Successfully retrieved the project with featured thumbnail.

```json
{
  "project": {
    "id": "project-123",
    "name": "My Project",
    "description": "A sample project",
    "userId": "user-123",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "featuredThumbnailId": "thumbnail-123",
    "featuredThumbnail": {
      "id": "thumbnail-123",
      "title": "Featured Thumbnail",
      "imageUrl": "https://example.com/image.png",
      "prompt": "A beautiful landscape",
      "parameters": {},
      "projectId": "project-123",
      "userId": "user-123",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

#### 401 Unauthorized

Missing or invalid authentication token.

```json
{
  "error": "Unauthorized"
}
```

#### 403 Forbidden

User does not have permission to view this project.

```json
{
  "error": "Forbidden"
}
```

#### 404 Not Found

Project not found.

```json
{
  "error": "Project not found"
}
```

#### 500 Internal Server Error

An unexpected error occurred.

```json
{
  "error": "Internal server error"
}
```