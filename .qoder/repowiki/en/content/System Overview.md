# System Overview

<cite>
**Referenced Files in This Document**
- [server.ts](file://pikzels-clone\src\server.ts)
- [package.json](file://pikzels-clone\package.json)
- [client/package.json](file://pikzels-clone\client\package.json)
- [netlify.toml](file://netlify.toml)
- [client/netlify.toml](file://pikzels-clone\client\netlify.toml)
- [client/scripts/netlify-build.sh](file://pikzels-clone\client\scripts\netlify-build.sh)
- [src/services/cache.service.ts](file://pikzels-clone\src\services\cache.service.ts)
- [src/middleware/security.middleware.ts](file://pikzels-clone\src\middleware\security.middleware.ts)
- [src/modules/auth/auth.controller.ts](file://pikzels-clone\src\modules\auth\auth.controller.ts)
- [src/modules/video-proxy/video-proxy.routes.ts](file://pikzels-clone\src\modules\video-proxy\video-proxy.routes.ts)
- [railway.json](file://railway.json)
- [start.sh](file://pikzels-clone\start.sh)
- [Project Roadmap.md](file://pikzels-clone\Project Roadmap.md)
- [Project Glossary.md](file://pikzels-clone\Project Glossary.md)
- [README.md](file://pikzels-clone\README.md)
- [auth.middleware.ts](file://pikzels-clone\src\middleware\auth.middleware.ts)
- [auth.routes.ts](file://pikzels-clone\src\modules\auth\auth.routes.ts)
- [thumbnail.routes.ts](file://pikzels-clone\src\modules\thumbnail\thumbnail.routes.ts)
- [analytics.routes.ts](file://pikzels-clone\src\modules\analytics\analytics.routes.ts)
- [social-share.routes.ts](file://pikzels-clone\src\modules\social-share\social-share.routes.ts)
- [migration.sql](file://pikzels-clone\prisma\migrations\20250829072650_init\migration.sql)
- [add_social_shares.sql](file://pikzels-clone\prisma\migrations\20250911134004_add_social_shares\migration.sql)
</cite>

## Update Summary
**Changes Made**
- Updated infrastructure section to reflect Netlify API proxy implementation resolving Safari authentication issues
- Added cookie policy adjustments and CSRF vulnerability mitigation details
- Enhanced cache service documentation with Railpack cache clobbering solutions
- Updated security middleware to include cross-origin isolation headers
- Added deployment configuration improvements for production stability

## Table of Contents
1. [Introduction](#introduction)
2. [Core Features](#core-features)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Infrastructure Improvements](#infrastructure-improvements)
6. [User Workflows](#user-workflows)
7. [Integration Points](#integration-points)
8. [Key Technical Decisions](#key-technical-decisions)
9. [Use Cases](#use-cases)
10. [Roadmap and Glossary](#roadmap-and-glossary)

## Introduction

Thumbnail Maker Studio is an AI-powered platform designed for creating, editing, and managing YouTube thumbnails with integrated social sharing, analytics, and collaboration capabilities. The system enables content creators to generate professional-quality thumbnails through AI assistance, customize them with advanced editing tools, share across social platforms, and track performance metrics. Built as a full-stack application, the platform follows a modular architecture that supports user authentication, project organization, and extensible feature development.

**Section sources**
- [README.md](file://pikzels-clone\README.md)
- [Project Roadmap.md](file://pikzels-clone\Project Roadmap.md)

## Core Features

The platform offers a comprehensive suite of features for thumbnail creation and management:

- **AI-Powered Thumbnail Generation**: Automated creation of thumbnails using AI algorithms based on user prompts and style preferences
- **Advanced Editing Tools**: Comprehensive editing capabilities including filters, text overlays, drawing tools, and batch editing
- **Social Sharing**: Direct sharing of thumbnails to multiple social media platforms with engagement tracking
- **Analytics Dashboard**: Performance tracking of thumbnails with metrics on views, clicks, and engagement
- **Collaboration Features**: Team-based workflows for shared projects and feedback
- **Template Marketplace**: Access to pre-designed templates and community-shared designs
- **User Settings Management**: Customizable preferences including theme (light/dark mode), language, and notification settings
- **Project Organization**: Structured management of thumbnails within projects for better workflow organization

**Section sources**
- [README.md](file://pikzels-clone\README.md)
- [Project Roadmap.md](file://pikzels-clone\Project Roadmap.md)

## Technology Stack

The application employs a modern technology stack with TypeScript as the primary language across both frontend and backend:

- **Frontend**: React with TypeScript, Vite build tool, and Tailwind CSS for styling
- **Backend**: Node.js with Express.js framework and TypeScript
- **Database**: SQLite with Prisma ORM for database operations and migrations
- **Authentication**: JWT (JSON Web Token) based authentication system
- **Image Processing**: Sharp library for image manipulation and optimization
- **AI Integration**: TensorFlow.js for client-side AI operations and potential integration with external AI services
- **Testing**: Jest for unit and integration testing, React Testing Library for frontend tests
- **Development Tools**: ESLint, Prettier, and Husky for code quality assurance
- **Deployment**: Netlify for frontend hosting with API proxy, Railway for backend deployment

```mermaid
graph TB
subgraph "Frontend"
A[React]
B[TypeScript]
C[Vite]
D[Tailwind CSS]
E[Netlify Proxy]
end
subgraph "Backend"
F[Node.js]
G[Express]
H[TypeScript]
I[Prisma ORM]
J[Cache Service]
end
subgraph "Database"
K[SQLite]
L[Redis Cache]
end
subgraph "Security"
M[JWT Authentication]
N[Security Middleware]
O[COOP/COEP Headers]
end
subgraph "Deployment"
P[Railway Platform]
Q[Netlify Hosting]
R[Railpack Builder]
end
A --> F
E --> F
F --> I
F --> J
J --> L
M --> F
N --> F
O --> E
P --> F
Q --> E
R --> P
```

**Diagram sources**
- [package.json](file://pikzels-clone\package.json)
- [client/package.json](file://pikzels-clone\client\package.json)
- [netlify.toml](file://netlify.toml)
- [railway.json](file://railway.json)
- [README.md](file://pikzels-clone\README.md)

## System Architecture

The system follows a monolithic architecture with clearly defined modules and RESTful API design principles. The backend exposes a comprehensive API surface with authentication-protected endpoints for all core functionality.

**Updated** Enhanced with Netlify API proxy architecture for improved Safari compatibility and CSRF protection

```mermaid
graph TD
A[Client Application] --> B[Netlify API Proxy]
B --> C[API Gateway]
C --> D[Authentication Service]
C --> E[Thumbnail Service]
C --> F[Analytics Service]
C --> G[Social Sharing Service]
C --> H[Project Service]
C --> I[Template Service]
D --> J[Database]
E --> J
F --> J
G --> J
H --> J
I --> J
J --> K[Prisma ORM]
L[Cache Service] --> M[Redis Cache]
L --> N[In-Memory Cache]
C --> L
O[Security Middleware] --> C
P[Railway Deployment] --> C
Q[Cross-Origin Isolation] --> B
style A fill:#3B82F6,stroke:#2563EB,color:white
style B fill:#10B981,stroke:#059669,color:white
style C fill:#8B5CF6,stroke:#7C3AED,color:white
style D fill:#EF4444,stroke:#DC2626,color:white
style L fill:#F59E0B,stroke:#D97706,color:white
style O fill:#EC4899,stroke:#DB2777,color:white
style P fill:#06B6D4,stroke:#0891B2,color:white
style Q fill:#8B5CF6,stroke:#7C3AED,color:white
```

**Diagram sources**
- [server.ts](file://pikzels-clone\src\server.ts)
- [auth.routes.ts](file://pikzels-clone\src\modules\auth\auth.routes.ts)
- [thumbnail.routes.ts](file://pikzels-clone\src\modules\thumbnail\thumbnail.routes.ts)
- [analytics.routes.ts](file://pikzels-clone\src\modules\analytics\analytics.routes.ts)
- [social-share.routes.ts](file://pikzels-clone\src\modules\social-share\social-share.routes.ts)
- [netlify.toml](file://netlify.toml)
- [client/netlify.toml](file://pikzels-clone\client\netlify.toml)

## Infrastructure Improvements

**Updated** Major infrastructure enhancements for production stability and browser compatibility

### Netlify API Proxy Implementation

The system now implements a comprehensive API proxy architecture through Netlify to resolve critical Safari authentication issues and CSRF vulnerabilities:

- **Safari ITP Compatibility**: All API requests route through Netlify proxy, making cookies first-party and resolving third-party cookie blocking
- **CSRF Protection**: SameSite=Lax cookies with Netlify proxy eliminate cross-site request forgery vectors
- **Cross-Origin Isolation**: COOP/COEP headers enable SharedArrayBuffer for multi-threaded FFmpeg processing
- **Environment-Specific Configuration**: Separate proxy targets for production, preview, and staging environments

### Cookie Policy Adjustments

Enhanced cookie security with environment-aware configurations:

- **Production**: Secure cookies with SameSite=Lax for CSRF protection
- **Development**: Strict cookies for local development testing
- **Fallback Mechanisms**: LocalStorage support for Safari Private Browsing mode compatibility

### Railpack Cache Clobbering Solutions

Railway's RAILPACK builder can clobber the built server.js file during deployments. The system implements automatic recovery:

- **Build Detection**: Startup script checks for missing server.js and rebuilds if necessary
- **Prisma Integration**: Automatic Prisma client regeneration during rebuild process
- **Deployment Resilience**: Graceful handling of cache misses without manual intervention

### Cross-Origin Isolation Headers

Implemented COOP (Cross-Origin-Opener-Policy) and COEP (Cross-Origin-Embedder-Policy) headers:

- **Same-Origin**: Ensures proper cross-origin isolation for SharedArrayBuffer
- **Credentialless Mode**: Allows cross-origin resource loading without credentials
- **Browser Compatibility**: Chrome 110+/Firefox 119+ support with Safari fallback

**Section sources**
- [netlify.toml](file://netlify.toml)
- [client/netlify.toml](file://pikzels-clone\client\netlify.toml)
- [client/scripts/netlify-build.sh](file://pikzels-clone\client\scripts\netlify-build.sh)
- [src/modules/auth/auth.controller.ts](file://pikzels-clone\src\modules\auth\auth.controller.ts)
- [src/services/cache.service.ts](file://pikzels-clone\src\services\cache.service.ts)
- [start.sh](file://pikzels-clone\start.sh)

## User Workflows

The platform supports end-to-end workflows from user registration to performance tracking:

### Registration and Authentication
1. User registration with email and password
2. JWT token generation upon successful login
3. Token storage in localStorage for session persistence
4. Protected route access through authentication middleware
5. **Updated** Enhanced with Netlify proxy for seamless Safari authentication

### Thumbnail Creation and Editing
1. Creation of new thumbnails through AI generation or manual design
2. Application of editing tools including filters, text overlays, and drawing
3. Batch editing capabilities for multiple thumbnails
4. Saving and organizing thumbnails within projects

### Sharing and Analytics
1. Generation of shareable links for thumbnails
2. Direct posting to social media platforms
3. Tracking of engagement metrics through analytics dashboard
4. Performance comparison between different thumbnail variations

```mermaid
flowchart TD
A[User Registration] --> B[Netlify Proxy Authentication]
B --> C[Login with Enhanced Security]
C --> D[Dashboard]
D --> E[Create Thumbnail]
E --> F[Edit Thumbnail]
F --> G[Save to Project]
G --> H[Generate Share Link]
H --> I[Post to Social Media]
I --> J[Track Analytics]
J --> K[Optimize Future Thumbnails]
style A fill:#3B82F6,stroke:#2563EB,color:white
style K fill:#10B981,stroke:#059669,color:white
```

**Diagram sources**
- [auth.middleware.ts](file://pikzels-clone\src\middleware\auth.middleware.ts)
- [thumbnail.routes.ts](file://pikzels-clone\src\modules\thumbnail\thumbnail.routes.ts)
- [analytics.routes.ts](file://pikzels-clone\src\modules\analytics\analytics.routes.ts)
- [netlify.toml](file://netlify.toml)

## Integration Points

The system integrates with various external services and platforms:

- **Social Media Platforms**: Facebook, Twitter, LinkedIn, and Pinterest through dedicated client implementations
- **AI Services**: Extensible architecture for integrating with external AI thumbnail generation services
- **Analytics Services**: Collection and reporting of engagement metrics from shared thumbnails
- **Authentication Providers**: Support for third-party authentication beyond email/password
- **Video Processing**: yt-dlp and FFmpeg integration for video thumbnail extraction

The integration architecture follows a factory pattern for social media clients, allowing for easy addition of new platforms:

```mermaid
classDiagram
class SocialMediaClient {
<<interface>>
+share(thumbnail : Thumbnail, message : string) SocialShareResult
+getAnalytics(shareId : string) EngagementMetrics
}
class FacebookClient {
+share(thumbnail : Thumbnail, message : string) SocialShareResult
+getAnalytics(shareId : string) EngagementMetrics
}
class TwitterClient {
+share(thumbnail : Thumbnail, message : string) SocialShareResult
+getAnalytics(shareId : string) EngagementMetrics
}
class LinkedInClient {
+share(thumbnail : Thumbnail, message : string) SocialShareResult
+getAnalytics(shareId : string) EngagementMetrics
}
class PinterestClient {
+share(thumbnail : Thumbnail, message : string) SocialShareResult
+getAnalytics(shareId : string) EngagementMetrics
}
class SocialMediaFactory {
+createClient(platform : string) SocialMediaClient
}
SocialMediaClient <|-- FacebookClient
SocialMediaClient <|-- TwitterClient
SocialMediaClient <|-- LinkedInClient
SocialMediaClient <|-- PinterestClient
SocialMediaFactory --> SocialMediaClient
```

**Diagram sources**
- [social-share.routes.ts](file://pikzels-clone\src\modules\social-share\social-share.routes.ts)
- [Project Roadmap.md](file://pikzels-clone\Project Roadmap.md)

## Key Technical Decisions

### JWT Authentication with Enhanced Security

The system implements JWT-based authentication with middleware protection for all API routes, enhanced with Netlify proxy architecture:

**Updated** Improved Safari compatibility and CSRF protection through proxy-based cookie handling

```mermaid
sequenceDiagram
participant Client
participant NetlifyProxy
participant Server
participant Database
Client->>NetlifyProxy : POST /api/auth/login
NetlifyProxy->>Server : Forward with First-Party Cookies
Server->>Database : Verify credentials
Database-->>Server : User data
Server->>Server : Generate JWT token
Server-->>NetlifyProxy : Return token
NetlifyProxy-->>Client : Set SameSite=Lax Cookie
Client->>NetlifyProxy : Request with Authorization header
NetlifyProxy->>Server : Forward authenticated request
Server->>Server : Verify token
Server-->>NetlifyProxy : Process request or return 401
NetlifyProxy-->>Client : Return response
```

**Diagram sources**
- [auth.middleware.ts](file://pikzels-clone\src\middleware\auth.middleware.ts)
- [auth.routes.ts](file://pikzels-clone\src\modules\auth\auth.routes.ts)
- [netlify.toml](file://netlify.toml)

### RESTful API Design

The backend follows RESTful principles with resource-based endpoints and proper HTTP status codes:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/thumbnails` - Retrieve user's thumbnails
- `POST /api/thumbnails/generate` - AI thumbnail generation
- `POST /api/thumbnails/:id/share` - Share thumbnail
- `GET /api/analytics/dashboard` - Analytics data

### Monorepo Structure

The project follows a monorepo structure with clear separation of concerns:

```mermaid
graph TD
A[pikzels-clone] --> B[client]
A --> C[src]
A --> D[prisma]
A --> E[docs]
A --> F[shared]
B --> G[React Components]
B --> H[UI Elements]
B --> I[Netlify Configuration]
C --> J[Modules]
C --> K[Middleware]
C --> L[Security]
D --> M[Migrations]
D --> N[Schema]
F --> O[Shared Services]
P[railway.json] --> Q[Railpack Deployment]
R[start.sh] --> S[Cache Recovery]
style A fill:#059669,stroke:#047857,color:white
style B fill:#3B82F6,stroke:#2563EB,color:white
style C fill:#3B82F6,stroke:#2563EB,color:white
style D fill:#10B981,stroke:#059669,color:white
style E fill:#8B5CF6,stroke:#7C3AED,color:white
style F fill:#F59E0B,stroke:#D97706,color:white
style P fill:#EF4444,stroke:#DC2626,color:white
style R fill:#10B981,stroke:#059669,color:white
```

**Diagram sources**
- [README.md](file://pikzels-clone\README.md)
- [package.json](file://pikzels-clone\package.json)
- [railway.json](file://railway.json)
- [start.sh](file://pikzels-clone\start.sh)

## Use Cases

### Content Creator Workflow
A YouTuber creates a new video and needs an engaging thumbnail. They log in to Thumbnail Maker Studio, use the AI generator with a prompt describing their video content, select the best variation, enhance it with text overlay and filters, save it to their "Tech Reviews" project, and share it directly to Twitter and Facebook before publishing their video.

### Marketing Team Collaboration
A marketing team collaborates on a product launch campaign. Multiple team members access the shared project, create different thumbnail variations for A/B testing, use the analytics dashboard to compare performance of published thumbnails, and iterate on designs based on engagement data.

### Social Media Manager
A social media manager schedules content across multiple platforms. They use the batch editing feature to apply consistent branding to a series of thumbnails, generate platform-specific versions with optimal dimensions, and track engagement metrics through the integrated analytics dashboard.

## Roadmap and Glossary

The project follows a structured roadmap with three main phases:

- **Phase 1 (Completed)**: Foundation with user authentication, thumbnail management, and basic editing
- **Phase 2 (In Progress)**: Advanced features including sharing, analytics, and user preferences
- **Phase 3 (Planned)**: Advanced integration with AI services, enhanced analytics, and collaboration features

The platform's glossary defines key terms such as:
- **Thumbnail**: A small image representation used for content identification
- **Project**: A container for organizing related thumbnails
- **JWT**: JSON Web Token used for authentication
- **Prisma**: ORM used for database operations
- **Vite**: Build tool for the frontend application
- **Netlify Proxy**: API proxy layer resolving Safari authentication issues
- **COOP/COEP**: Cross-origin isolation headers enabling SharedArrayBuffer
- **Railpack**: Railway's optimized build system with cache management

**Section sources**
- [Project Roadmap.md](file://pikzels-clone\Project Roadmap.md)
- [Project Glossary.md](file://pikzels-clone\Project Glossary.md)