# Project FAQ

## Overview

This document answers frequently asked questions about the Thumbnail Maker Studio project.

## General Questions

### What is the Thumbnail Maker Studio?
The Thumbnail Maker Studio is a web application that allows users to create, edit, and manage thumbnails for their content. It provides tools for generating thumbnails with AI, editing images with various tools, and organizing thumbnails into projects.

### What technologies are used in this project?
The project uses:
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Authentication**: JWT (JSON Web Tokens)
- **Image Processing**: Sharp library
- **Testing**: Jest, React Testing Library

### How do I set up the development environment?
1. Clone the repository
2. Install dependencies with `npm install` in both root and client directories
3. Set up environment variables in `.env` file
4. Run database migrations with `npx prisma migrate dev`
5. Generate Prisma client with `npx prisma generate`
6. Start the development server with `npm run dev`

### How do I run the application?
- **Backend**: Run `npm run dev` in the root directory
- **Frontend**: Run `npm start` in the client directory
- **Both**: Run `npm run dev:all` in the root directory

### How do I run tests?
- **Backend**: Run `npm test` in the root directory
- **Frontend**: Run `npm test` in the client directory

## Development Questions

### How is the project structured?
The project follows a monorepo structure:
- **Root directory**: Backend server, database configuration, documentation
- **client/**: Frontend React application
- **src/**: Backend source code organized by modules
- **prisma/**: Database schema and migrations

### How do I add a new API endpoint?
1. Create a new method in the appropriate controller
2. Add a new route in the corresponding routes file
3. Update the server.ts file to include the new routes
4. Add unit tests for the new endpoint
5. Document the endpoint in the API documentation

### How do I add a new database field?
1. Update the Prisma schema in `prisma/schema.prisma`
2. Create a migration with `npx prisma migrate dev --name migration_name`
3. Generate the Prisma client with `npx prisma generate`
4. Update the relevant controller and service files
5. Update any frontend components that use the data

### How do I create a new React component?
1. Create a new file in the appropriate directory under `client/src/components/`
2. Define the component with TypeScript interfaces for props
3. Implement the component logic and JSX
4. Add Tailwind CSS classes for styling
5. Create unit tests for the component
6. Document the component if it's a major feature

### How do I add a new user setting?
1. Update the UserSettings interface in `client/src/components/UserSettings.tsx`
2. Add the new setting to the UI in the same file
3. Add a handler function for the new setting
4. Update the backend ProfileController if needed
5. Test the new setting functionality
6. Document the new setting

## Troubleshooting

### I'm getting "EADDRINUSE" error when starting the server
This means the port is already in use. Either:
1. Stop the existing process using that port, or
2. Change the PORT in your `.env` file to a different port

### Prisma generate is failing
Try these solutions:
1. Delete the `node_modules` folder and run `npm install`
2. Check that you have the correct version of Prisma installed
3. Ensure you have write permissions in the project directory

### Tests are failing
1. Make sure all dependencies are installed
2. Check that the database is running and accessible
3. Verify that environment variables are set correctly
4. Look at the specific error message for more details

### Frontend is not connecting to the backend
1. Check that the backend server is running
2. Verify the proxy configuration in `client/vite.config.ts`
3. Ensure the API_BASE_URL is set correctly
4. Check that CORS is configured properly

## Feature-Specific Questions

### How does the thumbnail editing work?
The thumbnail editor provides:
- CSS filter controls (brightness, contrast, saturation, blur)
- Text overlay functionality with positioning controls
- Drawing tools for freehand drawing
- Layers support for multiple text overlays
- History/undo functionality
- Keyboard shortcuts for editing actions

### How does the sharing feature work?
1. Users can generate share links for their thumbnails
2. Share links are random UUID tokens for security
3. Anyone with the share link can view the thumbnail
4. Share links can be revoked at any time
5. Share links only grant view access, not edit permissions

### How does the user settings feature work?
The user settings feature allows users to:
- Choose between light and dark themes
- Select their preferred language
- Control notification preferences
- Set default thumbnail parameters
- Manage privacy settings
- Settings are stored in the database and persisted between sessions

### How does batch editing work?
Batch editing allows users to:
- Select multiple thumbnails at once
- Apply the same edits to all selected thumbnails
- See a preview of the changes before applying
- Process large numbers of thumbnails efficiently

## Security Questions

### How is user authentication handled?
- Users register with email and password
- Passwords are hashed with bcrypt before storage
- JWT tokens are used for authentication
- Tokens expire after 7 days
- All protected endpoints require valid authentication

### How secure are share links?
- Share links use random UUID tokens
- Tokens are stored securely in the database
- Links can be revoked at any time
- Links only grant view access, not edit permissions
- Tokens are unique per thumbnail

### How is user data protected?
- Passwords are hashed with bcrypt
- JWT tokens are used for authentication
- All communication should use HTTPS in production
- Database fields are properly validated
- Input is sanitized to prevent injection attacks

## Deployment Questions

### How do I deploy this application?
The application can be deployed using:
1. Traditional hosting with Node.js support
2. Docker containers
3. Cloud platforms like Heroku, Vercel, or AWS
4. Container orchestration platforms like Kubernetes

### What environment variables are needed?
- DATABASE_URL: Connection string for the database
- JWT_SECRET: Secret key for JWT token generation
- PORT: Port for the server to listen on (default: 8550)

### How do I set up the database for production?
1. Update DATABASE_URL in the environment variables
2. Run migrations with `npx prisma migrate deploy`
3. Generate the Prisma client with `npx prisma generate`
4. Ensure the database user has proper permissions

## Contributing Questions

### How can I contribute to this project?
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for your changes
5. Update documentation as needed
6. Submit a pull request

### What are the coding standards?
See the [Project Style Guide](Project%20Style%20Guide.md) for detailed coding standards.

### How do I report a bug?
1. Check if the bug has already been reported
2. Create a new issue in the GitHub repository
3. Include steps to reproduce the bug
4. Include expected vs actual behavior
5. Include any relevant error messages or logs

## Future Development Questions

### What features are planned for future releases?
See the [Project Roadmap](Project%20Roadmap.md) for planned features.

### How can I request a new feature?
1. Create a new issue in the GitHub repository
2. Describe the feature you'd like to see
3. Explain why this feature would be useful
4. Include any implementation ideas if you have them

### How can I stay updated on project progress?
1. Watch the GitHub repository
2. Join the project's communication channels if available
3. Check the project roadmap regularly
4. Review release notes for new versions

## Conclusion

This FAQ covers the most common questions about the Thumbnail Maker Studio project. If you have additional questions, please check the documentation or create an issue in the GitHub repository.