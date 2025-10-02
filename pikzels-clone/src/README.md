# Server Documentation

This directory contains the backend server implementation for the Thumbnail Maker Studio.

## Project Structure

```
src/
├── modules/
│   ├── auth/           # Authentication and user management
│   ├── thumbnail/      # Thumbnail generation and management
│   └── project/        # Project organization
├── middleware/         # Express middleware
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── server.ts           # Main server entry point
```

## Modules

### Auth Module

Handles user authentication, registration, profile management, and user settings.

Key features:

- User registration and login
- JWT-based authentication
- Profile management
- User settings management

See [auth/README.md](modules/auth/README.md) for detailed documentation.

### Thumbnail Module

Handles thumbnail generation, editing, sharing, and management.

Key features:

- Thumbnail generation
- Image editing capabilities
- Batch editing
- Thumbnail sharing
- Download functionality

### Project Module

Handles project organization for thumbnails.

Key features:

- Project creation and management
- Thumbnail grouping
- Project-based permissions

## Middleware

- Authentication middleware for protecting routes
- Error handling middleware
- CORS configuration

## API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### User Management

- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/settings` - Get user settings
- `PUT /api/user/settings` - Update user settings

### Thumbnails

- `GET /api/thumbnails` - List user thumbnails
- `POST /api/thumbnails/:id/edit` - Edit thumbnail
- `POST /api/thumbnails/:id/download` - Download thumbnail
- `POST /api/thumbnails/:id/share` - Generate share link
- `DELETE /api/thumbnails/:id/share` - Revoke share link

### Projects

- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project

## Database

The application uses Prisma ORM with SQLite for data persistence.

Key models:

- User - User accounts and profiles
- Thumbnail - Generated thumbnails
- Project - Thumbnail organization
- Subscription - User subscription information

## Documentation

For detailed documentation on specific features, see:

- [User Settings API](../docs/api/user-settings.md)
- [Extending User Settings Guide](../docs/guides/extending-user-settings.md)
