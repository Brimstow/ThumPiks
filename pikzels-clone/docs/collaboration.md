# Collaboration Feature Documentation

## Overview

The Collaboration feature enables team-based thumbnail creation, allowing multiple users to work together on projects. This feature introduces teams, team memberships, and project sharing capabilities to facilitate collaborative workflows.

## Architecture

The collaboration feature follows a modular architecture with the following components:

1. **Database Models**:
   - Team model for organizing users into groups
   - TeamMember model for managing team memberships
   - TeamInvitation model for inviting users to teams
   - Extended Project model to support team ownership

2. **Backend Services**:
   - CollaborationService for handling team operations
   - CollaborationController for API endpoints
   - Collaboration routes for RESTful API access

3. **Frontend Components** (to be implemented):
   - Team management interface
   - Team member management
   - Invitation system
   - Team project dashboard

## Database Schema

### Team Model

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Unique identifier for the team |
| name | String | Team name |
| description | String (optional) | Team description |
| ownerId | String | Reference to the team owner (User) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### TeamMember Model

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Unique identifier for the membership |
| teamId | String | Reference to the team |
| userId | String | Reference to the user |
| role | String | Member role ("owner", "admin", "member") |
| joinedAt | DateTime | When the user joined the team |

### TeamInvitation Model

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Unique identifier for the invitation |
| teamId | String | Reference to the team |
| inviterId | String | Reference to the user who sent the invitation |
| inviteeId | String | Reference to the user who received the invitation |
| status | String | Invitation status ("pending", "accepted", "declined") |
| invitedAt | DateTime | When the invitation was sent |
| respondedAt | DateTime (optional) | When the invitation was responded to |

### Project Model (Extended)

The Project model has been extended to support team ownership:

| Field | Type | Description |
|-------|------|-------------|
| teamId | String (optional) | Reference to the owning team (if applicable) |

## API Endpoints

### Teams

#### Create Team

**POST** `/api/collaboration/teams`

Create a new team.

##### Request

```http
POST /api/collaboration/teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Design Team",
  "description": "Our design team for thumbnail creation"
}
```

##### Response

```json
{
  "id": "team-123",
  "name": "Design Team",
  "description": "Our design team for thumbnail creation",
  "ownerId": "user-456",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z",
  "members": [
    {
      "id": "member-789",
      "teamId": "team-123",
      "userId": "user-456",
      "role": "owner",
      "joinedAt": "2023-01-01T00:00:00.000Z",
      "user": {
        "id": "user-456",
        "name": "John Doe",
        "email": "john@example.com",
        "avatarUrl": "/avatars/john.jpg"
      }
    }
  ]
}
```

#### Get User Teams

**GET** `/api/collaboration/teams`

Retrieve all teams the current user is a member of.

##### Request

```http
GET /api/collaboration/teams
Authorization: Bearer <token>
```

##### Response

```json
[
  {
    "id": "team-123",
    "name": "Design Team",
    "description": "Our design team for thumbnail creation",
    "ownerId": "user-456",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "owner": {
      "id": "user-456",
      "name": "John Doe",
      "email": "john@example.com",
      "avatarUrl": "/avatars/john.jpg"
    },
    "members": [
      {
        "id": "member-789",
        "teamId": "team-123",
        "userId": "user-456",
        "role": "owner",
        "joinedAt": "2023-01-01T00:00:00.000Z",
        "user": {
          "id": "user-456",
          "name": "John Doe",
          "email": "john@example.com",
          "avatarUrl": "/avatars/john.jpg"
        }
      }
    ],
    "_count": {
      "members": 1
    }
  }
]
```

#### Get Team by ID

**GET** `/api/collaboration/teams/:id`

Retrieve a specific team by its ID.

##### Request

```http
GET /api/collaboration/teams/team-123
Authorization: Bearer <token>
```

##### Response

```json
{
  "id": "team-123",
  "name": "Design Team",
  "description": "Our design team for thumbnail creation",
  "ownerId": "user-456",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z",
  "owner": {
    "id": "user-456",
    "name": "John Doe",
    "email": "john@example.com",
    "avatarUrl": "/avatars/john.jpg"
  },
  "members": [
    {
      "id": "member-789",
      "teamId": "team-123",
      "userId": "user-456",
      "role": "owner",
      "joinedAt": "2023-01-01T00:00:00.000Z",
      "user": {
        "id": "user-456",
        "name": "John Doe",
        "email": "john@example.com",
        "avatarUrl": "/avatars/john.jpg"
      }
    }
  ],
  "_count": {
    "members": 1
  }
}
```

#### Update Team

**PUT** `/api/collaboration/teams/:id`

Update team information.

##### Request

```http
PUT /api/collaboration/teams/team-123
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Design Team",
  "description": "Our updated design team for thumbnail creation"
}
```

##### Response

```json
{
  "id": "team-123",
  "name": "Updated Design Team",
  "description": "Our updated design team for thumbnail creation",
  "ownerId": "user-456",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-02T00:00:00.000Z"
}
```

#### Delete Team

**DELETE** `/api/collaboration/teams/:id`

Delete a team (only owners can delete teams).

##### Request

```http
DELETE /api/collaboration/teams/team-123
Authorization: Bearer <token>
```

##### Response

```http
HTTP/1.1 204 No Content
```

### Team Members

#### Invite User to Team

**POST** `/api/collaboration/teams/:teamId/invite`

Invite a user to join a team.

##### Request

```http
POST /api/collaboration/teams/team-123/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "inviteeEmail": "jane@example.com"
}
```

##### Response

```json
{
  "id": "invitation-456",
  "teamId": "team-123",
  "inviterId": "user-789",
  "inviteeId": "user-123",
  "status": "pending",
  "invitedAt": "2023-01-01T00:00:00.000Z",
  "respondedAt": null,
  "team": {
    "id": "team-123",
    "name": "Design Team",
    "description": "Our design team for thumbnail creation",
    "ownerId": "user-456",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  },
  "inviter": {
    "id": "user-789",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "invitee": {
    "id": "user-123",
    "name": "Jane Smith",
    "email": "jane@example.com"
  }
}
```

#### Remove Team Member

**DELETE** `/api/collaboration/teams/:teamId/members/:memberId`

Remove a member from a team (only owners and admins can remove members).

##### Request

```http
DELETE /api/collaboration/teams/team-123/members/member-456
Authorization: Bearer <token>
```

##### Response

```http
HTTP/1.1 204 No Content
```

#### Update Member Role

**PUT** `/api/collaboration/teams/:teamId/members/:memberId/role`

Update a member's role in a team (only owners can update roles).

##### Request

```http
PUT /api/collaboration/teams/team-123/members/member-456/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "admin"
}
```

##### Response

```json
{
  "id": "member-456",
  "teamId": "team-123",
  "userId": "user-789",
  "role": "admin",
  "joinedAt": "2023-01-01T00:00:00.000Z"
}
```

### Invitations

#### Get User Invitations

**GET** `/api/collaboration/invitations`

Retrieve all pending invitations for the current user.

##### Request

```http
GET /api/collaboration/invitations
Authorization: Bearer <token>
```

##### Response

```json
[
  {
    "id": "invitation-456",
    "teamId": "team-123",
    "inviterId": "user-789",
    "inviteeId": "user-123",
    "status": "pending",
    "invitedAt": "2023-01-01T00:00:00.000Z",
    "respondedAt": null,
    "team": {
      "id": "team-123",
      "name": "Design Team",
      "description": "Our design team for thumbnail creation",
      "ownerId": "user-456",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    },
    "inviter": {
      "id": "user-789",
      "name": "John Doe",
      "email": "john@example.com",
      "avatarUrl": "/avatars/john.jpg"
    }
  }
]
```

#### Respond to Invitation

**POST** `/api/collaboration/invitations/:id/respond`

Respond to a team invitation.

##### Request

```http
POST /api/collaboration/invitations/invitation-456/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "accept": true
}
```

##### Response

```json
{
  "id": "invitation-456",
  "teamId": "team-123",
  "inviterId": "user-789",
  "inviteeId": "user-123",
  "status": "accepted",
  "invitedAt": "2023-01-01T00:00:00.000Z",
  "respondedAt": "2023-01-01T01:00:00.000Z"
}
```

### Team Projects

#### Get Team Projects

**GET** `/api/collaboration/teams/:teamId/projects`

Retrieve all projects owned by a team.

##### Request

```http
GET /api/collaboration/teams/team-123/projects
Authorization: Bearer <token>
```

##### Response

```json
[
  {
    "id": "project-456",
    "name": "YouTube Thumbnails",
    "description": "Thumbnails for our YouTube channel",
    "userId": "user-789",
    "teamId": "team-123",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "user": {
      "id": "user-789",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "thumbnails": [
      {
        "id": "thumbnail-123",
        "title": "Video Thumbnail 1",
        "imageUrl": "/processed-images/thumbnail-123.jpg",
        "prompt": "Bold text on dark background",
        "parameters": {},
        "projectId": "project-456",
        "userId": "user-789",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "isFeatured": false
      }
    ],
    "_count": {
      "thumbnails": 5
    }
  }
]
```

## Implementation Details

### Backend Implementation

The backend implementation consists of:

1. **Collaboration Service** (`src/modules/collaboration/collaboration.service.ts`):
   - Handles all database operations for teams, members, and invitations
   - Includes methods for creating, reading, updating, and deleting teams
   - Manages team membership and invitation workflows
   - Implements authorization checks for team operations

2. **Collaboration Controller** (`src/modules/collaboration/collaboration.controller.ts`):
   - Exposes RESTful API endpoints
   - Handles request validation and error responses
   - Implements authentication and authorization checks

3. **Collaboration Routes** (`src/modules/collaboration/collaboration.routes.ts`):
   - Defines the API routes for collaboration operations
   - Maps HTTP methods to controller functions
   - Applies authentication middleware to protected endpoints

### Frontend Implementation (To Be Implemented)

The frontend implementation will include:

1. **Team Management Interface**:
   - Create and manage teams
   - View team members and their roles
   - Update team information

2. **Invitation System**:
   - Invite users to teams via email
   - Accept or decline team invitations
   - View pending invitations

3. **Team Member Management**:
   - Add/remove team members
   - Update member roles
   - View member activity

4. **Team Project Dashboard**:
   - View all projects owned by a team
   - Collaborate on team projects
   - Share project access with team members

## Security Considerations

- All collaboration operations require authentication
- Authorization checks ensure users can only perform actions they're permitted to
- Team ownership is strictly enforced for sensitive operations
- Invitation system prevents unauthorized access to teams
- Input validation is performed on all user-provided data
- Database queries are parameterized to prevent injection attacks

## Future Enhancements

Potential future enhancements for the collaboration feature:

1. **Team Permissions**:
   - Granular permissions for different team roles
   - Project-level access controls

2. **Team Communication**:
   - In-team messaging system
   - Commenting on projects and thumbnails

3. **Activity Feed**:
   - Team activity timeline
   - Notifications for team events

4. **Team Analytics**:
   - Team performance metrics
   - Member contribution tracking

5. **Advanced Team Features**:
   - Team hierarchies and sub-teams
   - Team templates and standards
   - Team resource sharing