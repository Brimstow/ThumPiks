# User Settings API

## Overview

The User Settings API allows authenticated users to manage their account preferences and default settings for the application.

## Endpoints

### Get User Settings

**GET** `/api/user/settings`

Retrieve the current user's settings.

#### Request

```http
GET /api/user/settings
Authorization: Bearer <token>
```

#### Response

```json
{
  "settings": {
    "theme": "dark",
    "language": "en",
    "notifications": {
      "email": true,
      "push": false
    },
    "thumbnailDefaults": {
      "width": 1920,
      "height": 1080,
      "style": "minimalist"
    },
    "privacy": {
      "profileVisible": true,
      "thumbnailsPublic": false
    }
  }
}
```

#### Response Codes

- `200` - Success
- `401` - Unauthorized
- `500` - Internal Server Error

### Update User Settings

**PUT** `/api/user/settings`

Update the current user's settings.

#### Request

```http
PUT /api/user/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "settings": {
    "theme": "light",
    "language": "es",
    "notifications": {
      "email": false,
      "push": true
    },
    "thumbnailDefaults": {
      "width": 1280,
      "height": 720,
      "style": "bold"
    },
    "privacy": {
      "profileVisible": false,
      "thumbnailsPublic": true
    }
  }
}
```

#### Response

```json
{
  "settings": {
    "theme": "light",
    "language": "es",
    "notifications": {
      "email": false,
      "push": true
    },
    "thumbnailDefaults": {
      "width": 1280,
      "height": 720,
      "style": "bold"
    },
    "privacy": {
      "profileVisible": false,
      "thumbnailsPublic": true
    }
  }
}
```

#### Response Codes

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `500` - Internal Server Error

## Settings Object

The settings object contains the following properties:

| Property | Type | Description |
|----------|------|-------------|
| theme | string | Application theme ('light' or 'dark') |
| language | string | Preferred language ('en', 'es', 'fr', 'de', 'ja') |
| notifications | object | Notification preferences |
| thumbnailDefaults | object | Default thumbnail parameters |
| privacy | object | Privacy settings |

### Notifications Object

| Property | Type | Description |
|----------|------|-------------|
| email | boolean | Receive email notifications |
| push | boolean | Receive push notifications |

### Thumbnail Defaults Object

| Property | Type | Description |
|----------|------|-------------|
| width | number | Default thumbnail width in pixels |
| height | number | Default thumbnail height in pixels |
| style | string | Default thumbnail style ('bold', 'minimalist', 'dramatic') |

### Privacy Object

| Property | Type | Description |
|----------|------|-------------|
| profileVisible | boolean | Make profile visible to other users |
| thumbnailsPublic | boolean | Make new thumbnails public by default |