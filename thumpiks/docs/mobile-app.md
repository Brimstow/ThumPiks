# Mobile Application Documentation

## Overview

The mobile application for Thumbnail Maker provides a native mobile experience for creating and managing thumbnails on the go. Built with React Native and Expo, the mobile app shares core functionality with the web application through a shared codebase.

## Architecture

The mobile application follows a modular architecture with the following components:

1. **Shared Services**:
   - Authentication service for user management
   - Thumbnail service for thumbnail operations
   - Common interfaces and types

2. **Mobile Components**:
   - Login screen for user authentication
   - Registration screen for new users
   - Dashboard for viewing and managing thumbnails
   - Native mobile UI components

3. **Backend Integration**:
   - RESTful API communication with the main backend
   - Authentication token management
   - Real-time data synchronization

## Technology Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Built-in React state management
- **Networking**: Fetch API
- **UI Components**: React Native built-in components
- **Navigation**: Stack-based navigation
- **Build Tools**: Expo CLI

## Project Structure

```
mobile/
├── App.tsx                 # Main application component
├── components/             # Reusable UI components
│   ├── LoginScreen.tsx     # Login screen component
│   ├── RegisterScreen.tsx  # Registration screen component
│   └── Dashboard.tsx       # Main dashboard component
├── package.json            # Mobile app dependencies
└── tsconfig.json           # TypeScript configuration

shared/
├── auth.service.ts         # Authentication service
├── thumbnail.service.ts    # Thumbnail service
├── index.ts                # Shared exports
└── package.json            # Shared package configuration
```

## Key Features

### Authentication
- User registration with email and password
- User login with email and password
- Token-based authentication
- Secure credential storage

### Thumbnail Management
- View all thumbnails created by the user
- Refresh thumbnail list with pull-to-refresh
- Delete thumbnails with confirmation
- Error handling for all operations

### User Experience
- Native mobile interface optimized for touch
- Responsive design for different screen sizes
- Loading states and error feedback
- Intuitive navigation between screens

## API Integration

The mobile app communicates with the same backend API as the web application:

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile

### Thumbnail Endpoints
- `GET /api/thumbnails` - Get user thumbnails
- `GET /api/thumbnails/:id` - Get specific thumbnail
- `POST /api/thumbnails/generate` - Generate new thumbnails
- `PUT /api/thumbnails/:id` - Update thumbnail
- `DELETE /api/thumbnails/:id` - Delete thumbnail

### Project Endpoints
- `GET /api/projects` - Get user projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

## Development Setup

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn
- Expo CLI
- Mobile device or emulator

### Installation
1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Running on Devices
- **iOS**: Press `i` in the terminal after starting the server
- **Android**: Press `a` in the terminal after starting the server
- **Web**: Press `w` in the terminal after starting the server

### Building for Production
To build the app for production, follow the Expo documentation for:
- iOS App Store deployment
- Android Play Store deployment
- Web deployment

## Shared Codebase

The mobile application shares core business logic with the web application through the `shared/` directory:

### AuthService
Handles user authentication including login, registration, and token management.

### ThumbnailService
Manages all thumbnail-related operations including fetching, creating, updating, and deleting thumbnails.

## UI Components

### LoginScreen
- Email and password input fields
- Login button with loading state
- Navigation to registration screen
- Form validation and error handling

### RegisterScreen
- Name, email, and password input fields
- Password confirmation
- Register button with loading state
- Navigation to login screen
- Form validation and error handling

### Dashboard
- Header with logout button
- Scrollable list of thumbnails
- Pull-to-refresh functionality
- Thumbnail cards with images and metadata
- Delete action with confirmation dialog

## Future Enhancements

Potential future enhancements for the mobile application:

1. **Advanced Features**:
   - Thumbnail creation directly from the mobile app
   - Image editing tools
   - Template marketplace integration
   - Social sharing from mobile

2. **UI/UX Improvements**:
   - Dark mode support
   - Customizable dashboard layouts
   - Offline support with local caching
   - Push notifications for thumbnail generation completion

3. **Performance Optimizations**:
   - Image caching and compression
   - Lazy loading for thumbnail images
   - Background sync for data updates
   - Memory management improvements

4. **Platform-Specific Features**:
   - Camera integration for custom images
   - Biometric authentication
   - Native sharing capabilities
   - Device-specific optimizations

## Troubleshooting

### Common Issues
1. **Network Errors**:
   - Ensure the backend server is running
   - Check that the API URL is correctly configured
   - Verify network connectivity on the device

2. **Authentication Issues**:
   - Clear app data and cache
   - Ensure credentials are correct
   - Check for token expiration

3. **Build Issues**:
   - Update Expo CLI to the latest version
   - Clear npm cache
   - Reinstall dependencies

### Debugging
- Use Expo DevTools for debugging
- Check console logs in the terminal
- Use React Developer Tools for component inspection
- Monitor network requests with debugging tools

## Security Considerations

- All API requests use HTTPS in production
- Authentication tokens are stored securely
- Passwords are never stored in plain text
- Input validation is performed on all user data
- Rate limiting is implemented on the backend