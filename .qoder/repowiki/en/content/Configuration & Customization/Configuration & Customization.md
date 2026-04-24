# Configuration & Customization

<cite>
**Referenced Files in This Document**
- [.env.example](file://pikzels-clone/.env.example)
- [ThemeContext.tsx](file://pikzels-clone/client/src/contexts/ThemeContext.tsx)
- [UserSettings.tsx](file://pikzels-clone/client/src/components/UserSettings.tsx)
- [dark-mode.css](file://pikzels-clone/client/src/styles/dark-mode.css)
- [netlify.toml](file://pikzels-clone/client/netlify.toml)
- [railway.json](file://pikzels-clone/railway.json)
- [server.ts](file://pikzels-clone/src/server.ts)
- [package.json](file://pikzels-clone/client/package.json)
</cite>

## Update Summary
**Changes Made**
- Added new section for Static Site Deployment with Netlify configuration
- Updated Environment Configuration section to include deployment-specific variables
- Enhanced deployment pipeline documentation with Railway integration
- Added API routing configuration for production deployments
- Updated deployment workflow to support modern static site hosting

## Table of Contents
1. [Introduction](#introduction)
2. [Environment Configuration](#environment-configuration)
3. [Static Site Deployment](#static-site-deployment)
4. [User Customization Options](#user-customization-options)
5. [Theming System Implementation](#theming-system-implementation)
6. [AI Processing and Image Quality Settings](#ai-processing-and-image-quality-settings)
7. [Social Media Defaults](#social-media-defaults)
8. [Configuration Loading and Persistence](#configuration-loading-and-persistence)
9. [Secure Configuration Management](#secure-configuration-management)
10. [Deployment Pipeline](#deployment-pipeline)
11. [Troubleshooting Configuration Issues](#troubleshooting-configuration-issues)

## Introduction
This document provides comprehensive guidance on the configuration and customization capabilities of the Thumbnail Maker application. It covers environment-specific settings, user preferences, theming implementation, secure configuration practices, and modern deployment strategies. The system supports flexible personalization including theme selection, language preferences, default thumbnail parameters, and privacy settings, all designed to enhance user experience while maintaining security and performance. The application now includes integrated deployment configurations for both development and production environments.

## Environment Configuration
The application utilizes environment variables through `.env` files to manage configuration across development and production environments. These variables control API endpoints, feature flags, service integrations, and critical security parameters. The `.env.example` file includes comprehensive security configuration options such as JWT settings, encryption keys, rate limiting, CORS policies, and security headers. Environment-specific overrides allow different behaviors in development versus production, such as enabling debug logging or connecting to staging versus production databases.

**Updated** Added deployment-specific configuration variables for API base URLs, client URLs, and production environment settings.

**Section sources**
- [.env.example](file://pikzels-clone/.env.example#L1-L97)
- [server.ts](file://pikzels-clone/src/server.ts#L54-L57)

## Static Site Deployment
The application supports modern static site deployment through Netlify configuration. The `netlify.toml` file defines the build process and API routing for production deployments. The configuration specifies that the frontend should be built using Vite and published from the `dist` directory. API requests are automatically routed to the production backend hosted on Railway, ensuring seamless integration between the static frontend and dynamic backend services.

**New Section** Added comprehensive documentation for static site deployment configuration.

```mermaid
flowchart TD
A[Netlify Build] --> B[Vite Build Process]
B --> C[dist Directory]
C --> D[Static Site Hosting]
D --> E[Client Requests]
E --> F[API Redirects]
F --> G[Railway Production API]
E --> H[SPA Routing]
H --> I[Single Page Application]
```

**Diagram sources**
- [netlify.toml](file://pikzels-clone/client/netlify.toml#L1-L15)

**Section sources**
- [netlify.toml](file://pikzels-clone/client/netlify.toml#L1-L15)

## User Customization Options
Users can personalize their experience through several configurable options accessible via the User Settings interface. These include theme preferences (light/dark mode), language selection from multiple supported languages, notification preferences (email and push), and default thumbnail parameters such as dimensions and style templates. Privacy settings allow users to control profile visibility and default sharing behavior for newly created thumbnails.

```mermaid
flowchart TD
A[User Settings] --> B[Appearance]
A --> C[Language]
A --> D[Notifications]
A --> E[Thumbnail Defaults]
A --> F[Privacy]
B --> B1[Light Mode]
B --> B2[Dark Mode]
C --> C1[English]
C --> C2[Spanish]
C --> C3[French]
C --> C4[German]
C --> C5[Japanese]
D --> D1[Email Notifications]
D --> D2[Push Notifications]
E --> E1[Default Width]
E --> E2[Default Height]
E --> E3[Default Style]
F --> F1[Profile Visibility]
F --> F2[Thumbnails Public by Default]
```

**Diagram sources**
- [UserSettings.tsx](file://pikzels-clone/client/src/components/UserSettings.tsx#L21-L661)

**Section sources**
- [UserSettings.tsx](file://pikzels-clone/client/src/components/UserSettings.tsx#L21-L661)

## Theming System Implementation
The theming system is implemented using React Context through the `ThemeContext` provider, which manages the current theme state and provides a toggle function to switch between light and dark modes. The system checks user preferences stored in the backend, falling back to system preferences via `prefers-color-scheme` if no user setting exists. CSS variables are not used; instead, the application applies a "dark" class to the document element, which triggers corresponding styles defined in `dark-mode.css`. This approach enables seamless theme switching with immediate visual feedback.

```mermaid
sequenceDiagram
participant User
participant UI as UserSettings UI
participant Context as ThemeContext
participant API as Backend API
participant DOM as Document Element
User->>UI : Changes theme preference
UI->>Context : handleThemeChange()
Context->>API : Save theme to user settings
API-->>Context : Confirmation
Context->>DOM : Apply/Remove 'dark' class
DOM-->>User : Visual theme update
```

**Diagram sources**
- [ThemeContext.tsx](file://pikzels-clone/client/src/contexts/ThemeContext.tsx#L13-L122)
- [UserSettings.tsx](file://pikzels-clone/client/src/components/UserSettings.tsx#L21-L661)
- [dark-mode.css](file://pikzels-clone/client/src/styles/dark-mode.css#L1-L250)

**Section sources**
- [ThemeContext.tsx](file://pikzels-clone/client/src/contexts/ThemeContext.tsx#L13-L122)
- [dark-mode.css](file://pikzels-clone/client/src/styles/dark-mode.css#L1-L250)

## AI Processing and Image Quality Settings
While specific AI processing configuration options are not exposed in the current User Settings interface, the system architecture supports AI-driven thumbnail enhancement features. Image quality settings such as default dimensions (1280x720) and style templates (Bold, Minimalist, Dramatic) serve as foundational parameters for AI processing pipelines. These defaults can be extended to include AI-specific options like enhancement intensity, object detection sensitivity, or automatic caption generation in future iterations.

**Section sources**
- [UserSettings.tsx](file://pikzels-clone/client/src/components/UserSettings.tsx#L21-L661)

## Social Media Defaults
The application includes social media sharing capabilities with platform-specific clients for Facebook, LinkedIn, Pinterest, and Twitter. While default sharing parameters are not currently exposed in the User Settings UI, the system is designed to support default message templates, platform selection preferences, and sharing schedules. The social sharing functionality integrates with the thumbnail creation workflow, allowing users to publish directly to multiple platforms with consistent formatting.

**Section sources**
- [UserSettings.tsx](file://pikzels-clone/client/src/components/UserSettings.tsx#L21-L661)

## Configuration Loading and Persistence
Configuration loading follows a hierarchical approach: user-specific settings are fetched from the backend API upon login, with fallback to system preferences if unavailable. The `ThemeProvider` initializes theme state during application startup by checking both user settings and the browser's `prefers-color-scheme` media query. User preferences are persisted through API calls to `/api/user/settings` using PUT requests, with proper error handling and loading states managed through React hooks. The system implements optimistic UI updates where appropriate, providing immediate feedback while asynchronously saving changes.

```mermaid
sequenceDiagram
participant App as Application
participant ThemeProvider
participant API as Backend API
participant User as User
App->>ThemeProvider : Initialize
ThemeProvider->>API : GET /api/user/settings
alt Settings Available
API-->>ThemeProvider : Return theme preference
ThemeProvider->>App : Set theme
else No Settings
ThemeProvider->>Browser : Check prefers-color-scheme
Browser-->>ThemeProvider : Return system preference
ThemeProvider->>App : Set theme
end
User->>UserSettings : Modify setting
UserSettings->>API : PUT /api/user/settings
API-->>UserSettings : Confirmation
UserSettings->>UI : Show success message
```

**Diagram sources**
- [ThemeContext.tsx](file://pikzels-clone/client/src/contexts/ThemeContext.tsx#L13-L122)
- [UserSettings.tsx](file://pikzels-clone/client/src/components/UserSettings.tsx#L21-L661)

**Section sources**
- [ThemeContext.tsx](file://pikzels-clone/client/src/contexts/ThemeContext.tsx#L13-L122)
- [UserSettings.tsx](file://pikzels-clone/client/src/components/UserSettings.tsx#L21-L661)

## Secure Configuration Management
The application implements secure configuration management practices by storing sensitive authentication tokens in localStorage with proper HTTP-only and secure flags where applicable. Environment variables are used to separate configuration from code, preventing accidental exposure of credentials. The `.env.example` file reveals comprehensive security measures including JWT configuration with access, refresh, and reset expiry times; encryption keys; rate limiting with configurable windows and request limits; CORS policies; and security headers like Content Security Policy. The API enforces authentication via Bearer tokens for all user settings operations, ensuring only authorized access to configuration data. Sensitive settings such as database credentials, API keys, and encryption secrets are properly isolated in environment variables.

**Updated** Enhanced security configuration with deployment-specific considerations for production environments.

**Section sources**
- [.env.example](file://pikzels-clone/.env.example#L1-L97)
- [UserSettings.tsx](file://pikzels-clone/client/src/components/UserSettings.tsx#L21-L661)
- [server.ts](file://pikzels-clone/src/server.ts#L63-L107)

## Deployment Pipeline
The application uses a modern deployment pipeline combining Netlify for frontend hosting and Railway for backend services. The deployment process is automated through configuration files that define build commands, environment variables, and routing rules. The `railway.json` file configures the backend deployment with RAILPACK builder, automated database migrations, and health check endpoints. The `netlify.toml` file handles frontend build processes and API routing for production deployments.

**New Section** Added comprehensive documentation for the modern deployment pipeline.

```mermaid
flowchart TD
A[Source Code] --> B[Netlify Build]
B --> C[Vite Build]
C --> D[dist Output]
D --> E[Static Hosting]
E --> F[Client Requests]
F --> G[API Redirects]
G --> H[Railway Backend]
H --> I[Database]
H --> J[Cache Service]
```

**Diagram sources**
- [railway.json](file://pikzels-clone/railway.json#L1-L15)
- [netlify.toml](file://pikzels-clone/client/netlify.toml#L1-L15)

**Section sources**
- [railway.json](file://pikzels-clone/railway.json#L1-L15)
- [netlify.toml](file://pikzels-clone/client/netlify.toml#L1-L15)
- [server.ts](file://pikzels-clone/src/server.ts#L261-L264)

## Troubleshooting Configuration Issues
Common configuration issues include failed settings saves due to authentication token expiration, theme persistence problems across sessions, and incorrect fallback behavior when user preferences are not available. The system provides error messages for failed API calls and includes loading states to indicate when settings are being fetched. For troubleshooting, developers should verify the authentication token is present in localStorage, check network requests to the settings API, and ensure the "dark" class is properly applied to the document element. Users experiencing issues should try refreshing the page or clearing their browser cache. When deploying to production, ensure all security-related environment variables are properly configured and that sensitive values from `.env.example` have been replaced with secure, production-grade secrets.

**Updated** Added troubleshooting guidance for deployment-specific issues including API routing and static site hosting.

**Section sources**
- [UserSettings.tsx](file://pikzels-clone/client/src/components/UserSettings.tsx#L21-L661)
- [ThemeContext.tsx](file://pikzels-clone/client/src/contexts/ThemeContext.tsx#L13-L122)
- [netlify.toml](file://pikzels-clone/client/netlify.toml#L5-L14)
- [railway.json](file://pikzels-clone/railway.json#L7-L13)