# Thumbnail Maker Studio Client

This is the frontend application for the Thumbnail Maker Studio, built with React, TypeScript, and Vite.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm start` - Starts the development server
- `npm run build` - Builds the production version
- `npm run serve` - Previews the production build
- `npm test` - Runs the test suite

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── Register.tsx
│   │   │   └── Login.tsx
│   │   ├── UserSettings.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ThumbnailEditor.tsx
│   │   └── BatchEditor.tsx
│   ├── App.tsx
│   └── index.tsx
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Features

- User registration and login forms
- Form validation and error handling
- JWT authentication
- Responsive design
- React Router for navigation
- User settings management
- Thumbnail editing capabilities
- Batch editing functionality

## API Integration

The frontend is configured to proxy API requests to the backend server running on `http://localhost:8550`. All requests to `/api/*` are automatically proxied to the backend.

## Documentation

For detailed documentation on components and APIs, see the [docs](../docs) directory:

- [User Settings Component](../docs/components/user-settings.md)
- [User Settings API](../docs/api/user-settings.md)
- [Extending User Settings Guide](../docs/guides/extending-user-settings.md)