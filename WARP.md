# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a full-stack TypeScript thumbnail generation and management platform with React frontend and Express.js backend. The architecture is modular, event-driven, and includes comprehensive admin functionality, social sharing, analytics, and AI-powered thumbnail generation.

## Development Commands

### Quick Start
```bash
# Setup from scratch (new environment)
cd pikzels-clone
npm install && cd client && npm install && cd ..

# Database setup (custom PostgreSQL on port 8560)
npx prisma migrate dev
npx prisma generate

# Start development (both frontend & backend)
npm run dev:all
```

### Common Development Tasks
```bash
# Backend only (Express server on port 8550)
npm run dev

# Frontend only (Vite server on port 8556)
npm run dev:frontend

# Database operations
npx prisma studio                # Visual database browser
npx prisma migrate dev          # Apply new migrations
npx prisma generate             # Regenerate client after schema changes

# Testing
npm test                        # Backend tests (Jest)
npm run test:coverage           # Backend tests with coverage
cd client && npm test           # Frontend tests

# Code quality
npm run check                   # Format and lint all code
npm run format:all             # Auto-format backend and frontend
npm run lint:all               # Fix linting issues

# Admin operations
npm run admin:create           # Create admin user
npm run admin:list            # List admin users

# Security and performance
npm run security:check        # Security audit and scan
npm run db:optimize           # Database optimization
npm run perf:test            # Performance testing
```

### Single Test Execution
```bash
# Backend - run specific test file
npx jest src/__tests__/user-api-routes.test.ts

# Backend - run specific test pattern
npx jest --testNamePattern="auth"

# Frontend - run specific test file
cd client && npx jest src/__tests__/ComponentName.test.tsx
```

## Architecture Overview

### Modular Backend Architecture
The backend follows a domain-driven modular structure with clear separation of concerns:

```
src/
├── modules/               # Domain modules (self-contained)
│   ├── auth/             # Authentication & JWT handling
│   ├── admin/            # Admin dashboard & user management  
│   ├── thumbnail/        # Core thumbnail generation & editing
│   ├── project/          # Project organization & hierarchy
│   ├── analytics/        # Event tracking & metrics
│   ├── social-share/     # Social media integration
│   ├── templates/        # Marketplace templates
│   └── collaboration/    # Team collaboration features
├── middleware/           # Cross-cutting middleware
├── services/            # Shared services (cache, JWT)
├── events/              # Event system for decoupled communication
├── types/               # Central TypeScript definitions
└── server.ts           # Application entry point
```

### Request Flow Pattern
All requests follow this consistent pattern:
1. **Route** → defines endpoints and HTTP methods
2. **Middleware** → security, validation, auth checks
3. **Controller** → request handling and response formatting
4. **Service** → business logic and data operations
5. **Events** → side effects (analytics, notifications)

### Database Architecture
- **Prisma ORM** with PostgreSQL (custom port 8560)
- **Hierarchical project structure** with parent-child relationships
- **Admin system** with role-based access control (RBAC)
- **Comprehensive audit logging** for security compliance
- **Team collaboration** with invitations and permissions
- **Template marketplace** with public/private templates

### Frontend Architecture
- **React + TypeScript** with Vite build system (port 8556)
- **Tailwind CSS** for styling with shadcn/ui components
- **Context-based state management** (Auth, Theme, Dashboard)
- **Custom hooks** for data fetching and real-time updates
- **Component-driven** with clear separation of business and presentation logic

### Event System
The project uses an event-driven architecture for decoupled communication:
- **Event Registry** - centralized event type management
- **Event Handlers** - domain-specific side effect processing
- **Analytics Events** - user behavior tracking
- **Social Share Events** - cross-platform sharing triggers

### Security Architecture
- **JWT-based authentication** with refresh tokens
- **Multi-factor authentication (MFA)** support
- **Role-based access control** with granular permissions
- **Input validation and sanitization** middleware
- **Rate limiting** for API protection
- **Comprehensive audit logging** for security monitoring

## Port Configuration

The project uses a custom port range to avoid conflicts:
- **Backend API**: 8550
- **Frontend Dev**: 8556  
- **PostgreSQL**: 8560
- **Reserved**: 8565-8595 (for Redis, monitoring, etc.)

## Database Setup

### Environment Variables Required
```env
DATABASE_URL="postgresql://username:password@localhost:8560/thumbnail_maker"
JWT_SECRET="your-secure-jwt-secret"
JWT_REFRESH_SECRET="your-secure-refresh-secret"
ENCRYPTION_KEY="your-32-char-encryption-key"
```

### Migration Commands
```bash
# Apply migrations (development)
npx prisma migrate dev

# Apply migrations (production)  
npx prisma migrate deploy

# Reset database (WARNING: destroys data)
npx prisma migrate reset
```

## Testing Strategy

### Test Organization
- **Backend Tests**: `src/__tests__/` and module-specific `__tests__/` folders
- **Frontend Tests**: `client/src/__tests__/` and component-local tests
- **Integration Tests**: Full request-response cycle with middleware
- **Security Tests**: Authentication, authorization, and input validation

### Test Patterns
```bash
# Run all backend tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test pattern
npx jest --testNamePattern="auth|security"

# Run tests in watch mode
npm run test:watch
```

### Key Test Scenarios
- Authentication flows (login, register, MFA)
- Authorization (role-based access control)
- Input validation and security middleware
- Event system functionality
- Database operations and migrations

## Important Implementation Details

### Admin Dashboard
- **Separate admin routes** under `/api/admin/`
- **Role-based permissions** with granular controls
- **System monitoring** and health checks
- **User management** with audit trails
- **Analytics dashboard** with real-time metrics

### Image Processing
- **Sharp.js** for high-performance image processing
- **Custom thumbnail generation** with AI integration
- **Batch processing** capabilities
- **Quality optimization** and format conversion

### Social Integration
- **Multi-platform sharing** (Twitter, Facebook, LinkedIn, Pinterest)
- **Engagement tracking** with platform-specific metrics
- **Share URL management** with analytics
- **Error handling** and retry logic

### Performance Optimizations
- **Caching service** with Redis integration planned
- **Database query optimization** with proper indexing
- **Compression middleware** for response optimization
- **Rate limiting** to prevent abuse
- **Performance monitoring** middleware

## Development Workflow

1. **Feature Development**: Create in appropriate `src/modules/` directory
2. **Add Tests**: Include unit and integration tests
3. **Update Types**: Add TypeScript definitions to `src/types/`
4. **Add Events**: Register new event types if needed
5. **Update Documentation**: Keep API docs current
6. **Security Review**: Ensure proper validation and auth checks

## Common Issues and Solutions

### Database Connection Issues
```bash
# Test database connection
npx prisma db pull

# Check database status
npm run db:check
```

### Port Conflicts
```bash
# Check port usage (Windows)
netstat -ano | findstr :8550
netstat -ano | findstr :8556

# Kill processes by port
taskkill /F /PID [PID_NUMBER]
```

### Migration Issues
```bash
# Check migration status
npx prisma migrate status

# Fix migration state
npx prisma migrate resolve --applied [MIGRATION_NAME]
```

## Security Considerations

- All routes require appropriate authentication/authorization
- Input validation is enforced at the middleware level
- Sensitive data is encrypted using environment-specific keys
- Audit trails are maintained for all admin actions
- Rate limiting protects against abuse
- CORS is configured for specific origins only

## File Structure Notes

- **Module boundaries** are strictly maintained
- **Shared utilities** live in `src/services/` and `src/utils/`
- **Type definitions** are centralized in `src/types/`
- **Environment configuration** follows `.env.example` template
- **Migration files** track all database schema changes