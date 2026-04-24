# Team Management

<cite>
**Referenced Files in This Document**
- [collaboration.md](file://pikzels-clone/docs/collaboration.md)
- [collaboration.service.ts](file://pikzels-clone/src/modules/collaboration/collaboration.service.ts)
- [collaboration.controller.ts](file://pikzels-clone/src/modules/collaboration/collaboration.controller.ts)
- [collaboration.routes.ts](file://pikzels-clone/src/modules/collaboration/collaboration.routes.ts)
- [schema.prisma](file://pikzels-clone/prisma/schema.prisma)
</cite>

## Update Summary
**Changes Made**
- Updated service methods section to reflect actual implementation with comprehensive team member management
- Added new team member management endpoints and functionality
- Enhanced security considerations with detailed authorization requirements
- Updated API endpoints documentation with complete CRUD operations
- Added comprehensive troubleshooting guide for new features

## Table of Contents
1. [Team Model Structure](#team-model-structure)
2. [Service Methods](#service-methods)
3. [API Endpoints](#api-endpoints)
4. [Security Considerations](#security-considerations)
5. [Troubleshooting Guide](#troubleshooting-guide)

## Team Model Structure

The Team model is designed to organize users into collaborative groups for thumbnail creation projects. The model contains essential fields that define team identity, ownership, and metadata.

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Unique identifier for the team |
| name | String | Team name |
| description | String (optional) | Team description |
| ownerId | String | Reference to the team owner (User) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

The model establishes relationships with other entities:
- **Owner**: A User who creates and owns the team
- **Members**: Collection of TeamMember records representing team participants
- **Projects**: Collection of Project records owned by the team
- **Invitations**: Collection of pending TeamInvitation records

When a team is created, the owner is automatically added as a member with the "owner" role. The model enforces data integrity through database constraints and cascading operations.

**Section sources**
- [schema.prisma](file://pikzels-clone/prisma/schema.prisma#L187-L200)

## Service Methods

The CollaborationService provides comprehensive team management functionality with enhanced member management capabilities. The service handles all aspects of team operations including creation, member management, invitations, and project coordination.

### Core Team Operations

#### createTeam Method

The `createTeam` method creates a new team with the specified name, description, and owner. It automatically adds the owner as a team member with the "owner" role.

**Parameters:**
- `data`: Object containing:
  - `name`: String (required) - The team name
  - `description`: String (optional) - Team description
  - `ownerId`: String - ID of the user creating the team

**Return Type:** Team object with members included

**Error Conditions:**
- Missing name parameter
- Database constraint violations

This method uses Prisma transactions to ensure atomicity - both the team creation and initial membership are created in a single operation.

**Section sources**
- [collaboration.service.ts](file://pikzels-clone/src/modules/collaboration/collaboration.service.ts#L10-L46)

#### updateTeam Method

The `updateTeam` method allows modification of team information. Only the team owner can update team details.

**Parameters:**
- `teamId`: String - ID of the team to update
- `data`: Partial object containing:
  - `name`: String (optional) - New team name
  - `description`: String (optional) - New team description

**Return Type:** Updated Team object

**Error Conditions:**
- Team not found
- User is not the team owner
- Invalid input data

**Section sources**
- [collaboration.service.ts](file://pikzels-clone/src/modules/collaboration/collaboration.service.ts#L125-L136)

#### deleteTeam Method

The `deleteTeam` method permanently removes a team and all associated data. Only the team owner can delete a team.

**Parameters:**
- `teamId`: String - ID of the team to delete
- `userId`: String - ID of the requesting user

**Return Type:** Void (successful deletion) or throws error

**Error Conditions:**
- Team not found
- User is not the team owner
- Database deletion constraints

**Section sources**
- [collaboration.service.ts](file://pikzels-clone/src/modules/collaboration/collaboration.service.ts#L141-L155)

### Advanced Team Member Management

#### inviteUserToTeam Method

The `inviteUserToTeam` method handles user invitations to teams with comprehensive validation.

**Parameters:**
- `data`: Object containing:
  - `teamId`: String - ID of the team to invite user to
  - `inviterId`: String - ID of the user sending the invitation
  - `inviteeEmail`: String - Email of the user being invited

**Return Type:** TeamInvitation object with team and user details

**Error Conditions:**
- Team not found
- Inviter is not a team member
- Invitee user not found
- User is already a team member
- Pending invitation already exists

**Section sources**
- [collaboration.service.ts](file://pikzels-clone/src/modules/collaboration/collaboration.service.ts#L160-L247)

#### removeTeamMember Method

The `removeTeamMember` method removes users from teams with strict authorization checks.

**Parameters:**
- `teamId`: String - ID of the team
- `memberId`: String - ID of the member to remove
- `removerId`: String - ID of the user attempting removal

**Return Type:** Deleted TeamMember object

**Error Conditions:**
- Remover is not authorized (must be owner or admin)
- Member not found
- Attempting to remove team owner
- Cannot remove self

**Section sources**
- [collaboration.service.ts](file://pikzels-clone/src/modules/collaboration/collaboration.service.ts#L321-L361)

#### updateMemberRole Method

The `updateMemberRole` method changes user roles within teams with strict authorization.

**Parameters:**
- `teamId`: String - ID of the team
- `memberId`: String - ID of the member whose role is changing
- `updaterId`: String - ID of the user attempting role change
- `newRole`: String - New role to assign

**Return Type:** Updated TeamMember object

**Error Conditions:**
- Updater is not the team owner
- Member not found
- Attempting to change owner role
- Invalid role specification

**Section sources**
- [collaboration.service.ts](file://pikzels-clone/src/modules/collaboration/collaboration.service.ts#L366-L409)

### Supporting Methods

#### getUserInvitations Method

Retrieves all pending invitations for a specific user.

**Parameters:**
- `userId`: String - ID of the user

**Return Type:** Array of TeamInvitation objects

**Section sources**
- [collaboration.service.ts](file://pikzels-clone/src/modules/collaboration/collaboration.service.ts#L252-L270)

#### respondToInvitation Method

Handles acceptance or declination of team invitations.

**Parameters:**
- `invitationId`: String - ID of the invitation
- `userId`: String - ID of the user responding
- `accept`: Boolean - Whether to accept or decline

**Return Type:** Updated TeamInvitation object

**Error Conditions:**
- Invitation not found or not authorized
- Invitation already responded to

**Section sources**
- [collaboration.service.ts](file://pikzels-clone/src/modules/collaboration/collaboration.service.ts#L275-L316)

#### getTeamProjects Method

Retrieves all projects owned by a team with preview thumbnails.

**Parameters:**
- `teamId`: String - ID of the team

**Return Type:** Array of Project objects with thumbnail previews

**Section sources**
- [collaboration.service.ts](file://pikzels-clone/src/modules/collaboration/collaboration.service.ts#L414-L438)

## API Endpoints

The team management functionality is exposed through comprehensive RESTful API endpoints that follow standard HTTP conventions and include proper authentication and authorization.

### Team Management Endpoints

#### Create Team

**POST** `/api/collaboration/teams`

Creates a new team with the authenticated user as the owner.

**Request**
```http
POST /api/collaboration/teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Design Team",
  "description": "Our design team for thumbnail creation"
}
```

**Response**
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

**Status Codes:**
- 201 Created: Team successfully created
- 400 Bad Request: Missing required fields
- 401 Unauthorized: Invalid or missing authentication token
- 500 Internal Server Error: Server error during creation

**Section sources**
- [collaboration.controller.ts](file://pikzels-clone/src/modules/collaboration/collaboration.controller.ts#L10-L26)
- [collaboration.routes.ts](file://pikzels-clone/src/modules/collaboration/collaboration.routes.ts#L20)

#### Get User Teams

**GET** `/api/collaboration/teams`

Retrieves all teams the current user is a member of.

**Request**
```http
GET /api/collaboration/teams
Authorization: Bearer <token>
```

**Response**
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

**Status Codes:**
- 200 OK: Teams retrieved successfully
- 401 Unauthorized: Invalid or missing authentication token
- 500 Internal Server Error: Server error during retrieval

**Section sources**
- [collaboration.controller.ts](file://pikzels-clone/src/modules/collaboration/collaboration.controller.ts#L31-L42)
- [collaboration.routes.ts](file://pikzels-clone/src/modules/collaboration/collaboration.routes.ts#L21)

#### Get Team by ID

**GET** `/api/collaboration/teams/:id`

Retrieves a specific team by its ID.

**Request**
```http
GET /api/collaboration/teams/team-123
Authorization: Bearer <token>
```

**Response**
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

**Status Codes:**
- 200 OK: Team retrieved successfully
- 404 Not Found: Team does not exist
- 401 Unauthorized: Invalid or missing authentication token
- 500 Internal Server Error: Server error during retrieval

**Section sources**
- [collaboration.controller.ts](file://pikzels-clone/src/modules/collaboration/collaboration.controller.ts#L47-L64)
- [collaboration.routes.ts](file://pikzels-clone/src/modules/collaboration/collaboration.routes.ts#L22)

#### Update Team

**PUT** `/api/collaboration/teams/:id`

Updates team information. Only the team owner can modify team details.

**Request**
```http
PUT /api/collaboration/teams/team-123
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Design Team",
  "description": "Our updated design team for thumbnail creation"
}
```

**Response**
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

**Status Codes:**
- 200 OK: Team successfully updated
- 403 Forbidden: User is not the team owner
- 404 Not Found: Team does not exist
- 401 Unauthorized: Invalid or missing authentication token
- 500 Internal Server Error: Server error during update

**Section sources**
- [collaboration.controller.ts](file://pikzels-clone/src/modules/collaboration/collaboration.controller.ts#L69-L86)
- [collaboration.routes.ts](file://pikzels-clone/src/modules/collaboration/collaboration.routes.ts#L23)

#### Delete Team

**DELETE** `/api/collaboration/teams/:id`

Deletes a team. Only the team owner can delete the team.

**Request**
```http
DELETE /api/collaboration/teams/team-123
Authorization: Bearer <token>
```

**Response**
```http
HTTP/1.1 204 No Content
```

**Status Codes:**
- 204 No Content: Team successfully deleted
- 403 Forbidden: User is not the team owner
- 404 Not Found: Team does not exist
- 401 Unauthorized: Invalid or missing authentication token
- 500 Internal Server Error: Server error during deletion

**Section sources**
- [collaboration.controller.ts](file://pikzels-clone/src/modules/collaboration/collaboration.controller.ts#L91-L105)
- [collaboration.routes.ts](file://pikzels-clone/src/modules/collaboration/collaboration.routes.ts#L24)

### Team Member Management Endpoints

#### Invite User to Team

**POST** `/api/collaboration/teams/:teamId/invite`

Invites a user to join a team. Only team members can send invitations.

**Request**
```http
POST /api/collaboration/teams/team-123/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "jane@example.com"
}
```

**Response**
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

**Status Codes:**
- 201 Created: Invitation created successfully
- 400 Bad Request: Missing required fields
- 403 Forbidden: User is not authorized to invite
- 404 Not Found: Team or user not found
- 409 Conflict: User already member or pending invitation exists
- 401 Unauthorized: Invalid or missing authentication token
- 500 Internal Server Error: Server error during invitation creation

**Section sources**
- [collaboration.controller.ts](file://pikzels-clone/src/modules/collaboration/collaboration.controller.ts#L110-L130)
- [collaboration.routes.ts](file://pikzels-clone/src/modules/collaboration/collaboration.routes.ts#L27)

#### Remove Team Member

**DELETE** `/api/collaboration/teams/:teamId/members/:memberId`

Removes a member from a team. Only owners and admins can remove members.

**Request**
```http
DELETE /api/collaboration/teams/team-123/members/member-456
Authorization: Bearer <token>
```

**Response**
```http
HTTP/1.1 204 No Content
```

**Status Codes:**
- 204 No Content: Member removed successfully
- 400 Bad Request: Missing required fields
- 403 Forbidden: User is not authorized to remove members
- 404 Not Found: Member not found
- 409 Conflict: Attempting to remove team owner
- 401 Unauthorized: Invalid or missing authentication token
- 500 Internal Server Error: Server error during removal

**Section sources**
- [collaboration.controller.ts](file://pikzels-clone/src/modules/collaboration/collaboration.controller.ts#L185-L203)
- [collaboration.routes.ts](file://pikzels-clone/src/modules/collaboration/collaboration.routes.ts#L28-L32)

#### Update Member Role

**PUT** `/api/collaboration/teams/:teamId/members/:memberId/role`

Updates a member's role in a team. Only team owners can update roles.

**Request**
```http
PUT /api/collaboration/teams/team-123/members/member-456/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "admin"
}
```

**Response**
```json
{
  "id": "member-456",
  "teamId": "team-123",
  "userId": "user-789",
  "role": "admin",
  "joinedAt": "2023-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- 200 OK: Role updated successfully
- 400 Bad Request: Missing role field
- 403 Forbidden: User is not authorized to update roles
- 404 Not Found: Member not found
- 409 Conflict: Attempting to change owner role
- 401 Unauthorized: Invalid or missing authentication token
- 500 Internal Server Error: Server error during role update

**Section sources**
- [collaboration.controller.ts](file://pikzels-clone/src/modules/collaboration/collaboration.controller.ts#L208-L237)
- [collaboration.routes.ts](file://pikzels-clone/src/modules/collaboration/collaboration.routes.ts#L33-L37)

### Invitation Management Endpoints

#### Get User Invitations

**GET** `/api/collaboration/invitations`

Retrieves all pending invitations for the current user.

**Request**
```http
GET /api/collaboration/invitations
Authorization: Bearer <token>
```

**Response**
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

**Status Codes:**
- 200 OK: Invitations retrieved successfully
- 401 Unauthorized: Invalid or missing authentication token
- 500 Internal Server Error: Server error during retrieval

**Section sources**
- [collaboration.controller.ts](file://pikzels-clone/src/modules/collaboration/collaboration.controller.ts#L135-L148)
- [collaboration.routes.ts](file://pikzels-clone/src/modules/collaboration/collaboration.routes.ts#L40)

#### Respond to Invitation

**POST** `/api/collaboration/invitations/:id/respond`

Responds to a team invitation with accept or decline.

**Request**
```http
POST /api/collaboration/invitations/invitation-456/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "accept": true
}
```

**Response**
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

**Status Codes:**
- 200 OK: Invitation responded successfully
- 400 Bad Request: Missing accept field
- 403 Forbidden: Invitation not found or not authorized
- 404 Not Found: Invitation not found
- 409 Conflict: Invitation already responded to
- 401 Unauthorized: Invalid or missing authentication token
- 500 Internal Server Error: Server error during response

**Section sources**
- [collaboration.controller.ts](file://pikzels-clone/src/modules/collaboration/collaboration.controller.ts#L153-L180)
- [collaboration.routes.ts](file://pikzels-clone/src/modules/collaboration/collaboration.routes.ts#L41)

### Team Projects Endpoint

#### Get Team Projects

**GET** `/api/collaboration/teams/:teamId/projects`

Retrieves all projects owned by a team.

**Request**
```http
GET /api/collaboration/teams/team-123/projects
Authorization: Bearer <token>
```

**Response**
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

**Status Codes:**
- 200 OK: Projects retrieved successfully
- 400 Bad Request: Missing team ID
- 401 Unauthorized: Invalid or missing authentication token
- 500 Internal Server Error: Server error during retrieval

**Section sources**
- [collaboration.controller.ts](file://pikzels-clone/src/modules/collaboration/collaboration.controller.ts#L242-L255)
- [collaboration.routes.ts](file://pikzels-clone/src/modules/collaboration/collaboration.routes.ts#L44)

## Security Considerations

The team management system implements comprehensive security measures to protect data integrity and prevent unauthorized access across all operations.

### Authentication Requirements

All collaboration endpoints require authentication via JWT tokens:
- Users must be logged in to access any collaboration functionality
- The authentication middleware validates tokens before requests reach controllers
- Invalid or expired tokens result in 401 Unauthorized responses
- User context is extracted from tokens for authorization checks

### Authorization Matrix

#### Team-Level Operations
- **Team Creation**: Any authenticated user can create teams
- **Team Updates**: Only the team owner can modify team information
- **Team Deletion**: Only the team owner can delete teams
- **Team Viewing**: Any team member can view team details

#### Member Management Operations
- **Member Removal**: Only owners and admins can remove members
- **Role Updates**: Only team owners can change member roles
- **Member Invitations**: Only current team members can send invitations
- **Self-Removal**: Users cannot remove themselves from teams

#### Invitation Management
- **Invitation Creation**: Only team members can send invitations
- **Invitation Response**: Only invited users can respond to invitations
- **Invitation Viewing**: Users can only see their own pending invitations

### Input Validation and Sanitization

The system performs comprehensive input validation:
- Required fields are checked (e.g., team name, email addresses)
- Data types are validated (UUID format for IDs, proper email format)
- String lengths and formats are verified
- Malicious input is sanitized to prevent injection attacks
- Enumerated fields (roles, statuses) are validated against allowed values

### Error Handling and Information Disclosure

The system provides carefully crafted error messages:
- Specific error details are logged server-side for debugging
- Client-facing messages avoid revealing sensitive information
- All errors return appropriate HTTP status codes
- Authorization failures return 403 instead of 404 to prevent enumeration

### Database Security

- All database queries use parameterized inputs to prevent injection attacks
- Cascading operations handle dependent record cleanup automatically
- Unique constraints prevent duplicate memberships and invitations
- Indexes optimize query performance while maintaining data integrity

**Section sources**
- [collaboration.md](file://pikzels-clone/docs/collaboration.md#L551-L559)

## Troubleshooting Guide

This section addresses common issues encountered when using the enhanced team management feature and provides comprehensive solutions.

### Team Creation Issues

#### Duplicate Team Names
**Issue**: Team creation fails with duplicate name error.

**Solution**: The system does not enforce unique team names at the database level. If your application requires unique team names, implement additional validation in the service layer by checking for existing teams with the same name before creation.

#### Team Owner Validation
**Issue**: Team creation appears to fail silently.

**Solution**: Verify that the authenticated user's ID is being passed correctly as the ownerId parameter. Check that the JWT token contains the correct user ID and that the user exists in the database.

### Team Management Issues

#### Unauthorized Team Updates
**Issue**: Receiving 403 Forbidden errors when trying to update team information.

**Solution**: Verify that the authenticated user is the team owner. Only owners can modify team details. Check that the JWT token contains the correct user ID and that the team's ownerId matches the requesting user.

#### Team Deletion Failures
**Issue**: Team deletion returns 403 Forbidden errors.

**Solution**: Ensure that the requesting user is the team owner. The system strictly enforces ownership validation for deletion operations. Verify that the user has the correct role and that the team relationship is properly established.

### Member Management Issues

#### Invitation Creation Problems
**Issue**: Unable to send invitations to team members.

**Solution**: 
1. Verify that the inviter is a current team member (not just any user)
2. Check that the invitee email corresponds to an existing user account
3. Ensure the user is not already a team member
4. Confirm there isn't already a pending invitation for this user

#### Member Removal Failures
**Issue**: Cannot remove team members or receive 403 Forbidden errors.

**Solution**:
1. Verify that the remover has sufficient privileges (owner or admin)
2. Check that you're not trying to remove the team owner
3. Ensure the member exists in the team
4. Confirm the member ID is correct and properly formatted

#### Role Update Errors
**Issue**: Role changes are rejected with 403 Forbidden errors.

**Solution**:
1. Verify that the requesting user is the team owner
2. Check that you're not trying to change the owner's role
3. Ensure the target member exists in the team
4. Confirm the new role is valid (owner, admin, member)

### Invitation Management Issues

#### Missing Pending Invitations
**Issue**: User invitations endpoint returns empty results.

**Solution**:
1. Verify that invitations exist with status "pending"
2. Check that the user ID in the JWT token matches the invitee ID
3. Ensure invitations haven't expired or been processed
4. Confirm the user hasn't already accepted or declined invitations

#### Invitation Response Failures
**Issue**: Cannot accept or decline invitations.

**Solution**:
1. Verify that the invitation belongs to the current user
2. Check that the invitation status is still "pending"
3. Ensure the accept parameter is properly specified as boolean
4. Confirm the invitation ID is valid and accessible

### API Endpoint Issues

#### Authentication Token Problems
**Issue**: All collaboration endpoints return 401 Unauthorized errors.

**Solution**:
1. Ensure the Authorization header is included in all requests
2. Verify the token format is "Bearer <token>"
3. Check that the token hasn't expired
4. Confirm the user is properly authenticated
5. Verify the token signature is valid

#### Missing Required Parameters
**Issue**: API endpoints return 400 Bad Request errors.

**Solution**:
1. Check that all required fields are present in the request body
2. Verify parameter types match expected formats (IDs, emails, etc.)
3. Ensure string values meet minimum length requirements
4. Confirm boolean values are properly formatted

### Database and Relationship Issues

#### Cascading Deletion Problems
**Issue**: Team deletion doesn't remove associated data.

**Solution**:
1. Verify that database foreign key constraints are properly configured
2. Check that cascade delete operations are enabled
3. Ensure related tables have proper indexing for cascade operations
4. Confirm that the team deletion operation completes successfully

#### Membership Data Inconsistencies
**Issue**: Team member counts don't match actual membership.

**Solution**:
1. Check for orphaned TeamMember records
2. Verify that all membership operations use transactions
3. Ensure cascade delete operations are working correctly
4. Run database integrity checks to identify inconsistencies

**Section sources**
- [collaboration.service.ts](file://pikzels-clone/src/modules/collaboration/collaboration.service.ts)
- [collaboration.controller.ts](file://pikzels-clone/src/modules/collaboration/collaboration.controller.ts)
- [collaboration.md](file://pikzels-clone/docs/collaboration.md#L551-L559)