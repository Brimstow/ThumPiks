# Project Style Guide

## Overview

This document outlines the coding standards and style guidelines for the Thumbnail Maker Studio project to ensure consistency and maintainability across the codebase.

## TypeScript/JavaScript Style Guide

### Naming Conventions

#### Variables and Functions
- Use camelCase for variable and function names
```typescript
// Good
const userProfile = {};
function getUserProfile() {}

// Bad
const user_profile = {};
function getUser_Profile() {}
```

#### Classes and Interfaces
- Use PascalCase for class and interface names
```typescript
// Good
class UserController {}
interface UserProfile {}

// Bad
class userController {}
interface user_profile {}
```

#### Constants
- Use UPPER_SNAKE_CASE for constants
```typescript
// Good
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'http://localhost:8550/api';

// Bad
const maxRetryAttempts = 3;
const apiBaseUrl = 'http://localhost:8550/api';
```

#### Files
- Use kebab-case for file names
```typescript
// Good
user.controller.ts
auth.routes.ts

// Bad
userController.ts
authRoutes.ts
```

### Code Structure

#### Imports
- Group imports in the following order:
  1. External libraries
  2. Internal modules
  3. Relative imports
  4. Type imports
- Separate each group with a blank line
- Sort imports alphabetically within each group

```typescript
// Good
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

import { PrismaClient } from '@prisma/client';

import { AuthRequest } from '../types';
import { AuthService } from '../services';

import type { User } from '@prisma/client';
```

#### Function Length
- Keep functions small and focused (less than 50 lines)
- Break down large functions into smaller, reusable functions

#### Error Handling
- Always handle errors appropriately
- Use try/catch blocks for asynchronous operations
- Return appropriate HTTP status codes
- Log errors for debugging purposes

```typescript
// Good
async function getUserProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Comments and Documentation

#### Inline Comments
- Use inline comments sparingly
- Focus on explaining "why" rather than "what"
- Keep comments concise and clear

```typescript
// Good
// Hash password before storing
const hashedPassword = await bcrypt.hash(password, 10);

// Bad
// Hash the password with bcrypt with 10 rounds
const hashedPassword = await bcrypt.hash(password, 10);
```

#### Function Documentation
- Document all public functions with JSDoc
- Include parameter types, return types, and descriptions

```typescript
/**
 * Registers a new user with the provided credentials
 * @param email - User's email address
 * @param password - User's password
 * @param name - User's display name (optional)
 * @returns Object containing user data and authentication token
 */
async function register(email: string, password: string, name?: string) {
  // Implementation
}
```

## React/TypeScript Style Guide

### Component Structure

#### Functional Components
- Use functional components with hooks
- Define prop interfaces above the component
- Use descriptive names for components

```tsx
// Good
interface UserProfileProps {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  onUpdate: (user: Partial<User>) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate }) => {
  // Implementation
};

// Bad
const UserProfile = (props: any) => {
  // Implementation
};
```

#### State Management
- Use useState for simple state
- Use useEffect for side effects
- Use useReducer for complex state logic

```tsx
// Good
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string>('');

useEffect(() => {
  fetchUser();
}, []);

const fetchUser = async () => {
  try {
    setLoading(true);
    const userData = await api.getUser();
    setUser(userData);
  } catch (err) {
    setError('Failed to fetch user');
  } finally {
    setLoading(false);
  }
};
```

### Styling

#### Tailwind CSS
- Use Tailwind CSS classes for styling
- Combine similar classes logically
- Use responsive prefixes when needed

```tsx
// Good
<div className="flex flex-col md:flex-row items-center justify-between p-4 bg-white rounded-lg shadow">
  <h2 className="text-xl font-bold text-gray-800">User Profile</h2>
  <button className="mt-2 md:mt-0 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
    Edit Profile
  </button>
</div>
```

#### Conditional Styling
- Use template literals for conditional classes
- Keep conditional logic simple

```tsx
// Good
<button 
  className={`px-4 py-2 rounded-md ${
    isLoading 
      ? 'bg-gray-400 cursor-not-allowed' 
      : 'bg-indigo-600 hover:bg-indigo-700'
  } text-white`}
  disabled={isLoading}
>
  {isLoading ? 'Saving...' : 'Save Changes'}
</button>
```

### Event Handling

#### Event Handler Naming
- Prefix event handlers with "handle"
- Use descriptive names for the action

```tsx
// Good
const handleSaveChanges = () => {};
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {};
const handleDeleteUser = async () => {};

// Bad
const save = () => {};
const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {};
const deleteUser = async () => {};
```

## API Design Guidelines

### RESTful Endpoints

#### Naming
- Use plural nouns for collections
- Use hyphens to separate words
- Use consistent naming patterns

```http
// Good
GET /api/users
POST /api/users
GET /api/users/:id
PUT /api/users/:id
DELETE /api/users/:id

GET /api/thumbnails
POST /api/thumbnails/:id/edit
POST /api/thumbnails/:id/download

// Bad
GET /api/user
POST /api/createUser
GET /api/getUserById/:id
```

#### HTTP Methods
- Use appropriate HTTP methods:
  - GET for retrieving data
  - POST for creating resources or actions
  - PUT for updating resources
  - DELETE for removing resources

#### Status Codes
- Use standard HTTP status codes:
  - 200 OK - Successful GET, PUT, DELETE
  - 201 Created - Successful POST
  - 400 Bad Request - Invalid request data
  - 401 Unauthorized - Missing or invalid authentication
  - 403 Forbidden - Authenticated but not authorized
  - 404 Not Found - Resource not found
  - 500 Internal Server Error - Server error

#### Error Responses
- Return consistent error response format
- Include descriptive error messages

```json
{
  "error": "User not found"
}
```

## Database Design Guidelines

### Prisma Schema

#### Model Naming
- Use PascalCase for model names
- Use singular form for model names

```prisma
// Good
model User {
  id String @id @default(uuid())
}

model Thumbnail {
  id String @id @default(uuid())
}

// Bad
model users {
  id String @id @default(uuid())
}

model thumbnails {
  id String @id @default(uuid())
}
```

#### Field Naming
- Use camelCase for field names
- Be descriptive with field names

```prisma
// Good
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// Bad
model User {
  id       String   @id @default(uuid())
  mail     String   @unique
  pass     String
  created  DateTime @default(now())
  updated  DateTime @updatedAt
}
```

## Testing Guidelines

### Unit Tests

#### Test Structure
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern
- Test one behavior per test

```typescript
// Good
describe('AuthService', () => {
  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const name = 'Test User';
      
      // Act
      const result = await authService.register(email, password, name);
      
      // Assert
      expect(result.user.email).toBe(email);
      expect(result.user.name).toBe(name);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, expect.any(String));
    });
  });
});
```

#### Mocking
- Mock external dependencies
- Reset mocks between tests
- Use realistic mock data

```typescript
// Good
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: {
        findUnique: jest.fn(),
        create: jest.fn()
      }
    }))
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});
```

## Documentation Guidelines

### Markdown Formatting

#### Headers
- Use ATX-style headers (# Header)
- Use proper header hierarchy
- Keep headers concise

```markdown
# Main Title
## Section
### Subsection
```

#### Lists
- Use hyphens for unordered lists
- Use numbers for ordered lists
- Indent nested items with 2 spaces

```markdown
- Item 1
- Item 2
  - Nested item
  - Another nested item

1. First step
2. Second step
3. Third step
```

#### Code Blocks
- Specify language for syntax highlighting
- Use appropriate indentation
- Keep code blocks concise

```markdown
```typescript
const greeting = 'Hello, world!';
console.log(greeting);
```
```

## Git Workflow

### Commit Messages
- Use present tense
- Be concise but descriptive
- Start with a capital letter
- No period at the end

```git
// Good
Add user registration endpoint
Fix thumbnail download bug
Update documentation for API endpoints

// Bad
Added user registration endpoint
fixed bug
updated docs
```

### Branch Naming
- Use kebab-case
- Prefix with feature, bugfix, or hotfix
- Be descriptive

```git
// Good
feature/user-settings
bugfix/thumbnail-download-error
hotfix/security-patch

// Bad
user-settings
fix
patch
```

## Conclusion

Following these style guidelines will help maintain consistency and readability across the Thumbnail Maker Studio project. All team members should adhere to these standards to ensure a high-quality, maintainable codebase.