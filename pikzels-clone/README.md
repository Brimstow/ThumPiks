# Pikzels Clone - Thumbnail Maker Studio
# 🎨 Thumbnail Maker Studio

A full-featured thumbnail creation and editing platform with AI-powered tools and automated quality assurance.

[![Code Quality](https://github.com/your-username/pikzels-clone/workflows/Code%20Quality%20&%20Tests/badge.svg)](https://github.com/your-username/pikzels-clone/actions)
[![Security](https://github.com/your-username/pikzels-clone/workflows/Security%20&%20Dependency%20Checks/badge.svg)](https://github.com/your-username/pikzels-clone/actions)

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd pikzels-clone
npm install && cd client && npm install && cd ..

# Setup database
npx prisma migrate dev
npx prisma generate

# Start development (both frontend & backend)
npm run dev:all
```

**🎯 New to the project?** Check out our [Development Workflow Guide](DEVELOPMENT_WORKFLOW.md) and [Contributing Guidelines](CONTRIBUTING.md).

## Overview

This project is a clone of Pikzels, a thumbnail maker platform that allows users to create, edit, and manage thumbnails for their content. The application includes features for user authentication, thumbnail generation, editing tools, sharing capabilities, and user preferences management.

## Features

### Core Features
- User registration and authentication
- Password recovery system
- Thumbnail creation and AI-powered generation
- Advanced editing tools (filters, text overlays, drawing tools)
- Batch editing for multiple thumbnails
- Thumbnail sharing with public links
- Download functionality
- Project organization

### User Settings
- Theme preferences (light/dark mode)
- Language selection
- Notification controls
- Default thumbnail parameters
- Privacy settings

### Technical Features
- Responsive web design
- RESTful API architecture
- JWT-based authentication
- Database persistence with Prisma ORM
- Image processing with Sharp
- Comprehensive test coverage

## Project Structure

```
pikzels-clone/
├── client/             # Frontend React application
├── src/                # Backend Node.js/Express server
├── prisma/             # Database schema and migrations
├── docs/               # Documentation
├── processed-images/   # Generated thumbnail storage
├── .env                # Environment variables
├── package.json        # Backend dependencies
└── tsconfig.json       # TypeScript configuration
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- SQLite (for development)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd pikzels-clone
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd client
   npm install
   cd ..
   ```

4. Set up environment variables:
   Copy `.env.example` to `.env` and configure the required variables.

5. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

6. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

### Development

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. Start the frontend development server:
   ```bash
   cd client
   npm start
   ```

3. Open your browser to `http://localhost:8551`

### Production

1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```

2. Start the production server:
   ```bash
   cd ..
   npm start
   ```

## API Documentation

See [docs/api](docs/api) for detailed API documentation.

## 🛠️ Development Commands

### Code Quality (Automated)
```bash
npm run format:all         # Auto-format all code
npm run lint:all          # Fix linting issues
npm run check             # Run all quality checks
npm run commit            # Guided commit with conventional format
```

### Development Servers
```bash
npm run dev               # Backend only
npm run dev:frontend      # Frontend only  
npm run dev:all          # Both servers
```

### Testing
```bash
npm test                  # Backend tests
cd client && npm test     # Frontend tests
npm run test:coverage     # With coverage report
```

## 🤖 Automated Quality Assurance

This project includes automated code quality tools:

- **✨ Pre-commit hooks**: Auto-format and lint staged files
- **📝 Conventional commits**: Enforced commit message format
- **🎨 Prettier**: Consistent code formatting
- **🔍 ESLint**: Code quality and convention checking
- **🚀 CI/CD**: Automated testing and quality gates

**🎬 Demo Workflow:**
```
Code Change → Pre-commit Hook → Quality Checks → Commit → CI/CD → Deploy
     ↓              ↓               ↓            ↓        ↓         ↓
   Edit File → Format/Lint → Tests Pass → Git Commit → Build → Success! ✅
```

## 📚 Documentation

- **[🛠️ Development Workflow](DEVELOPMENT_WORKFLOW.md)** - Complete development guide
- **[🤝 Contributing Guidelines](CONTRIBUTING.md)** - How to contribute
- **[Client README](client/README.md)** - Frontend documentation
- **[Server README](src/README.md)** - Backend documentation
- **[API Documentation](docs/api)** - API endpoints and schemas

## Changelog

See [CHANGELOG.md](docs/changelog.md) for release history.

## License

This project is licensed under the MIT License.