# Pikzels Clone - Thumbnail Maker Studio

A full-featured thumbnail creation and editing platform with AI-powered tools.

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## Testing

### Backend Tests
```bash
npm test
```

### Frontend Tests
```bash
cd client
npm test
```

## Documentation

- [Client README](client/README.md) - Frontend documentation
- [Server README](src/README.md) - Backend documentation
- [Auth Module README](src/modules/auth/README.md) - Authentication documentation
- [User Settings API](docs/api/user-settings.md) - API documentation for user settings
- [Password Recovery API](docs/api/password-recovery.md) - API documentation for password recovery
- [User Settings Component](docs/components/user-settings.md) - Frontend component documentation
- [Password Recovery Components](docs/components/password-recovery.md) - Frontend component documentation
- [Extending User Settings Guide](docs/guides/extending-user-settings.md) - Developer guide for extending settings
- [Extending Password Recovery Guide](docs/guides/extending-password-recovery.md) - Developer guide for extending password recovery

## Changelog

See [CHANGELOG.md](docs/changelog.md) for release history.

## License

This project is licensed under the MIT License.