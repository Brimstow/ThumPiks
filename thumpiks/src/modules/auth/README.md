# Authentication Module

This module handles user authentication and profile management, including the new user settings feature.

## Features

1. **User Registration** - Create new user accounts
2. **User Login** - Authenticate existing users
3. **Password Recovery** - Reset forgotten passwords
4. **Profile Management** - View and update user profile information
5. **User Settings** - Manage user preferences and default settings

## Components

### Controllers

- [AuthController](file:///b:/Thumbnail_maker/thumpiks/src/modules/auth/auth.controller.ts#L11-L57) - Handles registration, login, and password recovery
- [ProfileController](file:///b:/Thumbnail_maker/thumpiks/src/modules/auth/profile.controller.ts#L13-L106) - Handles profile and settings management

### Routes

- [auth.routes.ts](file:///b:/Thumbnail_maker/thumpiks/src/modules/auth/auth.routes.ts#L1-L16) - Registration, login, and password recovery endpoints
- [profile.routes.ts](file:///b:/Thumbnail_maker/thumpiks/src/modules/auth/profile.routes.ts#L1-L14) - Profile and settings endpoints

### Services

- [AuthService](file:///b:/Thumbnail_maker/thumpiks/src/modules/auth/auth.service.ts#L8-L76) - Authentication business logic
- [EmailService](file:///b:/Thumbnail_maker/thumpiks/src/modules/auth/email.service.ts#L5-L57) - Email sending simulation
- [ProfileService](file:///b:/Thumbnail_maker/thumpiks/src/modules/auth/profile.service.ts#L5-L38) - Profile management business logic

## Password Recovery

The password recovery feature allows users to reset their passwords if they forget them.

### How It Works

1. User navigates to the "Forgot Password" page
2. User enters their email address
3. System generates a JWT-based reset token (valid for 1 hour)
4. System simulates sending an email with a reset link
5. User clicks the link and is directed to the reset password page
6. User enters a new password and confirms it
7. System validates the token and updates the password
8. User is redirected to login with a success message

### API Endpoints

- `POST /api/auth/request-password-reset` - Request a password reset
- `POST /api/auth/reset-password` - Reset password with token

### Security Features

- JWT-based tokens with 1-hour expiration
- No information disclosure about email existence
- Password strength validation (minimum 6 characters)
- Token validation and expiration handling

## User Settings

The user settings feature allows users to customize their experience with the application.

### Settings Structure

```json
{
  "theme": "light|dark",
  "language": "en|es|fr|de|ja",
  "notifications": {
    "email": true|false,
    "push": true|false
  },
  "thumbnailDefaults": {
    "width": number,
    "height": number,
    "style": "bold|minimalist|dramatic"
  },
  "privacy": {
    "profileVisible": true|false,
    "thumbnailsPublic": true|false
  }
}
```

### API Endpoints

- `GET /api/user/settings` - Retrieve user settings
- `PUT /api/user/settings` - Update user settings

### Database

Settings are stored in the `settings` JSON column of the `User` table.

## Documentation

For detailed documentation, see:

- [User Settings API](../../../docs/api/user-settings.md)
- [Password Recovery API](../../../docs/api/password-recovery.md)
- [Extending User Settings Guide](../../../docs/guides/extending-user-settings.md)
- [Extending Password Recovery Guide](../../../docs/guides/extending-password-recovery.md)
