# Team Management

<cite>
**Referenced Files in This Document**   
- [collaboration.md](file://pikzels-clone\docs\collaboration.md)
- [collaboration.service.ts](file://pikzels-clone\src\modules\collaboration\collaboration.service.ts)
- [collaboration.controller.ts](file://pikzels-clone\src\modules\collaboration\collaboration.controller.ts)
- [collaboration.routes.ts](file://pikzels-clone\src\modules\collaboration\collaboration.routes.ts)
- [schema.prisma](file://pikzels-clone\prisma\schema.prisma)
</cite>

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
- [schema.prisma](file://pikzels-clone\prisma\schema.prisma#L118-L130)

## Service Methods

The CollaborationService provides three core methods for team management: createTeam, updateTeam, and deleteTeam. These methods handle business logic, data validation, and authorization checks.

### createTeam Method

The `createTeam` method creates a new team with the specified name, description, and owner. It automatically adds the owner as a team member with the "owner" role.

**Parameters:**
- `name`: String (required) - The team name
- `description`: String (optional) - Team description
- `ownerId`: String - ID of the user creating the team

**Return Type:** Team object with members included

**Error Conditions:**
- Missing name parameter
- Database constraint violations (e.g., duplicate team names)

This method uses Prisma transactions to ensure atomicity - both the team creation and initial membership are created in a single operation.

**Section sources**
- [collaboration.service.ts](file://pikzels-clone\src\modules\collaboration\collaboration.service.ts#L8-L41)

### updateTeam Method

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

The method performs authorization validation by checking if the requesting user matches the team's ownerId before allowing updates.

**Section sources**
- [collaboration.service.ts](file://pikzels-clone\src\modules\collaboration\collaboration.service.ts#L120-L131)

### deleteTeam Method

The `deleteTeam` method permanently removes a team and all associated data. Only the team owner can delete a team.

**Parameters:**
- `teamId`: String - ID of the team to delete
- `userId`: String - ID of the requesting user

**Return Type:** Void (successful deletion) or throws error

**Error Conditions:**
- Team not found
- User is not the team owner
- Database deletion constraints

The method implements a two-step process: first verifying ownership, then performing the deletion. Database cascading ensures that related TeamMember and TeamInvitation records are automatically removed.

**Section sources**
- [collaboration.service.ts](file://pikzels-clone\src\modules\collaboration\collaboration.service.ts#L136-L150)

## API Endpoints

The team management functionality is exposed through RESTful API endpoints that follow standard HTTP conventions and include proper authentication and authorization.

### Create Team Endpoint

**POST** `/api/collaboration/teams`

Creates a new team with the authenticated user as the owner.

#### Request
```http
POST /api/collaboration/teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Design Team",
  "description": "Our design team for thumbnail creation"
}
```

#### Response
```json
{
  "id": "team-123",
  "name": "Design Team",
  "description": "Our design team for thumbnail creation",
  "ownerId": "user-456",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- 201 Created: Team successfully created
- 400 Bad Request: Missing required fields
- 401 Unauthorized: Invalid or missing authentication token
- 500 Internal Server Error: Server error during creation

**Section sources**
- [collaboration.controller.ts](file://pikzels-clone\src\modules\collaboration\collaboration.controller.ts#L9-L30)
- [collaboration.routes.ts](file://pikzels-clone\src\modules\collaboration\collaboration.routes.ts#L9)

### Update Team Endpoint

**PUT** `/api/collaboration/teams/:id`

Updates team information. Only the team owner can modify team details.

#### Request
```http
PUT /api/collaboration/teams/team-123
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Design Team",
  "description": "Our updated design team for thumbnail creation"
}
```

#### Response
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
- [collaboration.controller.ts](file://pikzels-clone\src\modules\collaboration\collaboration.controller.ts#L71-L99)
- [collaboration.routes.ts](file://pikzels-clone\src\modules\collaboration\collaboration.routes.ts#L11)

### Delete Team Endpoint

**DELETE** `/api/collaboration/teams/:id`

Deletes a team. Only the team owner can delete the team.

#### Request
```http
DELETE /api/collaboration/teams/team-123
Authorization: Bearer <token>
```

#### Response
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
- [collaboration.controller.ts](file://pikzels-clone\src\modules\collaboration\collaboration.controller.ts#L104-L116)
- [collaboration.routes.ts](file://pikzels-clone\src\modules\collaboration\collaboration.routes.ts#L12)

## Security Considerations

The team management system implements multiple security layers to protect data integrity and prevent unauthorized access.

### Ownership Validation

All sensitive operations require ownership validation:
- **Team Creation**: The authenticated user becomes the owner
- **Team Updates**: Only the owner can modify team information
- **Team Deletion**: Only the owner can delete the team

The system verifies ownership by comparing the requesting user's ID with the team's ownerId field before allowing modifications.

### Authentication Requirements

All team management endpoints require authentication via JWT tokens:
- Users must be logged in to access any team functionality
- The authentication middleware validates tokens before requests reach controllers
- Invalid or expired tokens result in 401 Unauthorized responses

### Input Validation

The system performs comprehensive input validation:
- Required fields are checked (e.g., team name for creation)
- Data types are validated
- String lengths and formats are verified
- Malicious input is sanitized to prevent injection attacks

### Error Handling

The system provides meaningful error messages while avoiding information disclosure:
- Specific error details are logged server-side for debugging
- Client-facing messages are generic to prevent enumeration attacks
- All errors return appropriate HTTP status codes

**Section sources**
- [collaboration.md](file://pikzels-clone\docs\collaboration.md#L500-L550)

## Troubleshooting Guide

This section addresses common issues encountered when using the team management feature and provides solutions.

### Duplicate Team Names

**Issue**: Unable to create a team with a name that already exists.

**Solution**: The system does not enforce unique team names at the database level. If your application requires unique team names, implement additional validation in the service layer by checking for existing teams with the same name before creation.

### Unauthorized Access Attempts

**Issue**: Receiving 403 Forbidden errors when trying to update or delete a team.

**Solution**: Verify that the authenticated user is the team owner. Only owners can modify or delete teams. Check that the JWT token contains the correct user ID and that the team's ownerId matches the requesting user.

### Missing Authentication Token

**Issue**: Receiving 401 Unauthorized errors on all team endpoints.

**Solution**: Ensure that the Authorization header is included in all requests with a valid JWT token in the format "Bearer <token>". Verify that the user is properly logged in and the token has not expired.

### Database Constraint Violations

**Issue**: Server errors during team creation or modification.

**Solution**: Check server logs for specific database error messages. Common issues include:
- Invalid UUID formats
- Exceeding string length limits
- Foreign key constraint violations

Validate input data against the schema requirements before making API calls.

**Section sources**
- [collaboration.service.ts](file://pikzels-clone\src\modules\collaboration\collaboration.service.ts)
- [collaboration.controller.ts](file://pikzels-clone\src\modules\collaboration\collaboration.controller.ts)