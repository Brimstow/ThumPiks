# Database Schema

This document describes the database schema used in the Thumbnail Maker Studio application.

## Overview

The application uses SQLite with Prisma ORM for data persistence. The schema is defined in `prisma/schema.prisma` and includes the following models:

## Models

### User

Represents a registered user of the application.

```prisma
model User {
  id            String     @id @default(uuid())
  email         String     @unique
  passwordHash  String
  name          String?
  avatarUrl     String?
  isVerified    Boolean    @default(false)
  settings      Json?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  projects      Project[]
  thumbnails    Thumbnail[]
  subscriptions Subscription[]
}
```

**Fields:**
- `id` - Unique identifier (UUID)
- `email` - User's email address (unique)
- `passwordHash` - BCrypt hash of the user's password
- `name` - User's display name (optional)
- `avatarUrl` - URL to user's avatar image (optional)
- `isVerified` - Email verification status
- `settings` - JSON object containing user preferences
- `createdAt` - Timestamp when the user was created
- `updatedAt` - Timestamp when the user was last updated
- `projects` - Related projects (one-to-many)
- `thumbnails` - Related thumbnails (one-to-many)
- `subscriptions` - Related subscriptions (one-to-many)

### Project

Represents a project for organizing thumbnails.

```prisma
model Project {
  id            String      @id @default(uuid())
  name          String
  description   String?
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  thumbnails    Thumbnail[]
}
```

**Fields:**
- `id` - Unique identifier (UUID)
- `name` - Project name
- `description` - Project description (optional)
- `userId` - Foreign key to User
- `user` - Related user (many-to-one)
- `createdAt` - Timestamp when the project was created
- `updatedAt` - Timestamp when the project was last updated
- `thumbnails` - Related thumbnails (one-to-many)

### Thumbnail

Represents a generated thumbnail.

```prisma
model Thumbnail {
  id            String      @id @default(uuid())
  title         String
  imageUrl      String
  prompt        String
  parameters    Json
  projectId     String
  project       Project     @relation(fields: [projectId], references: [id])
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  createdAt     DateTime    @default(now())
}
```

**Fields:**
- `id` - Unique identifier (UUID)
- `title` - Thumbnail title
- `imageUrl` - URL to the thumbnail image
- `prompt` - AI prompt used to generate the thumbnail
- `parameters` - JSON object containing generation parameters
- `projectId` - Foreign key to Project
- `project` - Related project (many-to-one)
- `userId` - Foreign key to User
- `user` - Related user (many-to-one)
- `createdAt` - Timestamp when the thumbnail was created

### Subscription

Represents a user's subscription plan.

```prisma
model Subscription {
  id            String      @id @default(uuid())
  planType      String
  creditsBalance Int
  creditsUsed   Int         @default(0)
  periodStart   DateTime
  periodEnd     DateTime
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  createdAt     DateTime    @default(now())
}
```

**Fields:**
- `id` - Unique identifier (UUID)
- `planType` - Type of subscription plan
- `creditsBalance` - Number of credits remaining
- `creditsUsed` - Number of credits used
- `periodStart` - Start of billing period
- `periodEnd` - End of billing period
- `userId` - Foreign key to User
- `user` - Related user (many-to-one)
- `createdAt` - Timestamp when the subscription was created

## Migrations

Database migrations are stored in the `prisma/migrations` directory. Each migration contains:

1. A migration script (`migration.sql`)
2. A manifest file (`migration.json`)

### Recent Migrations

#### Add User Settings

Added the `settings` JSON field to the User model to store user preferences.

Migration file: `prisma/migrations/20250909081634_add_user_settings/migration.sql`

```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "settings" JSONB;
```

## Settings Structure

The `settings` field in the User model contains a JSON object with the following structure:

```json
{
  "theme": "light|dark",
  "language": "en|es|fr|de|ja",
  "notifications": {
    "email": true|false,
    "push": true|false
  },
  "thumbnailDefaults": {
    "width": number,
    "height": number,
    "style": "bold|minimalist|dramatic"
  },
  "privacy": {
    "profileVisible": true|false,
    "thumbnailsPublic": true|false
  }
}
```

## Database Commands

### Generate Client

```bash
npx prisma generate
```

### Run Migrations

```bash
npx prisma migrate dev
```

### View Database Studio

```bash
npx prisma studio
```

### Reset Database

```bash
npx prisma migrate reset
```