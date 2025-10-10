# Getting Started

<cite>
**Referenced Files in This Document**   
- [README.md](file://pikzels-clone\README.md)
- [.env.example](file://pikzels-clone\.env.example)
- [package.json](file://pikzels-clone\package.json)
- [client/package.json](file://pikzels-clone\client\package.json)
- [DEVELOPMENT_WORKFLOW.md](file://pikzels-clone\DEVELOPMENT_WORKFLOW.md)
- [docs/guides/windows-permissions-and-server-issues.md](file://pikzels-clone\docs\guides\windows-permissions-and-server-issues.md)
- [prisma/schema.prisma](file://pikzels-clone\prisma\schema.prisma)
</cite>

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Repository Setup](#repository-setup)
4. [Dependency Installation](#dependency-installation)
5. [Environment Configuration](#environment-configuration)
6. [Database Initialization](#database-initialization)
7. [Development Servers](#development-servers)
8. [Production Build](#production-build)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)
11. [Verification](#verification)
12. [Development Workflow](#development-workflow)

## Prerequisites

Before setting up the Thumbnail Maker Studio development environment, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **SQLite** (for development database)

Verify your installations with these commands:
```bash
node --version
npm --version
```

**Section sources**
- [README.md](file://pikzels-clone\README.md#L65-L68)

## Environment Setup

Install Node.js and npm using one of these methods:

**Option 1: Node Version Manager (Recommended)**
```bash
# Install nvm (Node Version Manager)
# Then install and use the latest LTS version
nvm install --lts
nvm use --lts
```

**Option 2: Direct Download**
- Download Node.js from [nodejs.org](https://nodejs.org/)
- Choose the LTS (Long Term Support) version
- Run the installer with default settings

**Section sources**
- [README.md](file://pikzels-clone\README.md#L65-L68)

## Repository Setup

Clone the repository and navigate to the project directory:

```bash
git clone <repository-url>
cd pikzels-clone
```

The repository contains two main applications:
- **Backend**: Located in the root directory
- **Frontend**: Located in the `client/` directory

**Section sources**
- [README.md](file://pikzels-clone\README.md#L25-L28)

## Dependency Installation

Install dependencies for both the backend and frontend applications:

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

Alternatively, you can run both installations in sequence with a single command:
```bash
npm install && cd client && npm install && cd ..
```

**Section sources**
- [README.md](file://pikzels-clone\README.md#L29-L32)

## Environment Configuration

Configure environment variables by creating a `.env` file from the example:

```bash
# Copy the example environment file
cp .env.example .env
```

Edit the `.env` file with your preferred values. The updated environment configuration includes enhanced security settings:

```env
# Database
DATABASE_URL="file:./dev.db"

# JWT Security (MUST BE CHANGED IN PRODUCTION)
JWT_SECRET="your-secure-32-char-secret-key-here"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
JWT_RESET_EXPIRY="1h"

# Encryption Keys
ENCRYPTION_KEY="your-secure-32-char-encryption-key-"
REFRESH_TOKEN_SECRET="your-secure-32-char-refresh-token-"

# Security Features
ENABLE_RATE_LIMITING="true"
ENABLE_COMPRESSION="true"
ENABLE_CACHE="true"
ENABLE_PERFORMANCE_MONITORING="true"
ENABLE_SECURITY_HEADERS="true"
ENABLE_HTTPS_REDIRECT="false"

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS="900000"  # 15 minutes
RATE_LIMIT_MAX_REQUESTS="100"
AUTH_RATE_LIMIT_WINDOW_MS="900000"  # 15 minutes
AUTH_RATE_LIMIT_MAX_ATTEMPTS="5"

# CORS Configuration
CORS_ORIGIN="http://localhost:3000,http://localhost:8551"
CORS_CREDENTIALS="true"

# File Upload Security
MAX_FILE_SIZE="10485760"  # 10MB
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/webp"

# Application Configuration
NODE_ENV="development"
PORT=8550
CLIENT_URL="http://localhost:8551"
API_BASE_URL="http://localhost:8550"

# Session Security
SESSION_SECRET="your-session-secret-min-32-chars-890"
COOKIE_SECURE="false"
COOKIE_SAME_SITE="strict"
COOKIE_HTTP_ONLY="true"

# API Keys
OPENAI_API_KEY=your_openai_api_key
```

**Updated** The environment configuration has been updated with enhanced security settings including rate limiting, encryption keys, security headers, and session security configurations.

**Section sources**
- [.env.example](file://pikzels-clone\.env.example) - *Updated in recent commit*
- [README.md](file://pikzels-clone\README.md#L40-L42)

## Database Initialization

Initialize the database using Prisma ORM:

```bash
# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

These commands will:
1. Create the SQLite database file (`dev.db`)
2. Apply the schema from `prisma/schema.prisma`
3. Generate the Prisma Client for type-safe database access

**Section sources**
- [README.md](file://pikzels-clone\README.md#L43-L46)
- [DEVELOPMENT_WORKFLOW.md](file://pikzels-clone\DEVELOPMENT_WORKFLOW.md#L45-L47)

## Development Servers

Start the development servers using one of these methods:

**Option 1: Run both servers simultaneously**
```bash
npm run dev:all
```

**Option 2: Run servers separately**
```bash
# Start backend server
npm run dev

# In a separate terminal, start frontend server
cd client && npm run dev
```

The applications will be available at:
- **Frontend**: http://localhost:8551
- **Backend**: http://localhost:8550

**Section sources**
- [package.json](file://pikzels-clone\package.json#L7-L10)
- [README.md](file://pikzels-clone\README.md#L53-L58)

## Production Build

Build the application for production deployment:

```bash
# Build the frontend
cd client && npm run build && cd ..

# Start the production server
npm start
```

The built frontend will be served by the backend server in production mode.

**Section sources**
- [README.md](file://pikzels-clone\README.md#L59-L63)

## Testing

Run tests for both frontend and backend:

```bash
# Run backend tests
npm test

# Run frontend tests
cd client && npm test && cd ..

# Run tests with coverage report
npm run test:coverage
```

**Section sources**
- [package.json](file://pikzels-clone\package.json#L15-L18)
- [DEVELOPMENT_WORKFLOW.md](file://pikzels-clone\DEVELOPMENT_WORKFLOW.md#L51-L56)

## Troubleshooting

### Common Setup Issues

**Prisma Client Generation Failures**
- **Problem**: Prisma client generation fails with EPERM errors on Windows
- **Cause**: Files are locked by other processes (Node.js, TypeScript compiler, etc.)
- **Solution**:
  - Retry the operation after a short delay
  - Ensure no other processes are using the files
  - Check for running Node.js processes that might be locking files
  - Restart the development environment if needed

**Database Migration Issues**
- **Problem**: Migration fails due to locked database file
- **Solution**:
  - Close any applications using the database
  - Check for running server processes
  - Delete the `dev.db` file and retry the migration

**Dependency Installation Problems**
- **Problem**: npm install fails with permission errors
- **Solution**:
  - Run the command prompt as administrator (Windows)
  - Check write permissions in the project directory
  - Clear npm cache with `npm cache clean --force`

**Port Conflicts**
- **Problem**: Development servers fail to start due to port conflicts
- **Solution**:
  - Check for running processes on ports 8550 (backend) and 8551 (frontend)
  - Modify the PORT environment variable in `.env`
  - Use different ports for development

**Section sources**
- [docs/guides/windows-permissions-and-server-issues.md](file://pikzels-clone\docs\guides\windows-permissions-and-server-issues.md#L6-L68)
- [Project FAQ.md](file://pikzels-clone\Project FAQ.md#L82-L87)

## Verification

Verify your setup is working correctly:

1. **Check server status**: After running `npm run dev:all`, verify both servers start without errors
2. **Access the application**: Open http://localhost:8551 in your browser
3. **Test API endpoints**: Use tools like curl or Postman to test backend endpoints
4. **Run tests**: Ensure all tests pass with `npm test` and `cd client && npm test`

A successful setup will display the application interface and allow you to create an account and log in.

**Section sources**
- [README.md](file://pikzels-clone\README.md#L53-L58)

## Development Workflow

Refer to the [Development Workflow Guide](DEVELOPMENT_WORKFLOW.md) for quality assurance practices:

```bash
# Format all code
npm run format:all

# Lint all code
npm run lint:all

# Run all quality checks
npm run check

# Use guided commit tool
npm run commit
```

The workflow includes automated quality checks that run on every commit, ensuring code consistency and preventing issues before they reach the codebase.

**Section sources**
- [DEVELOPMENT_WORKFLOW.md](file://pikzels-clone\DEVELOPMENT_WORKFLOW.md#L1-L226)