# Password Recovery API

This document describes the password recovery API endpoints.

## Overview

The password recovery system allows users to reset their passwords if they forget them. It uses JWT-based tokens for security and includes proper validation.

## Endpoints

### Request Password Reset

```
POST /api/auth/request-password-reset
```

Request a password reset link to be sent to the user's email.

#### Request Body

```json
{
  "email": "user@example.com"
}
```

#### Response

```json
{
  "message": "If your email is registered, you will receive a password reset link."
}
```

#### Response Codes

- `200` - Success (always returned, even if email doesn't exist for security)
- `400` - Bad Request (missing email)
- `500` - Internal Server Error

### Reset Password

```
POST /api/auth/reset-password
```

Reset the user's password using a valid reset token.

#### Request Body

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newSecurePassword123"
}
```

#### Response

```json
{
  "message": "Password successfully reset"
}
```

#### Response Codes

- `200` - Success
- `400` - Bad Request (missing fields, invalid token, expired token, or weak password)
- `500` - Internal Server Error

## Security

### Token Management

- Reset tokens are JWT-based with a 1-hour expiration
- Tokens include the user ID and action identifier
- Tokens are validated before password reset

### Information Disclosure

- The system does not reveal whether an email is registered
- The same success message is returned regardless of email existence

### Password Requirements

- Minimum 6 characters
- No maximum length enforced (but recommended to be reasonable)

## Implementation Details

### Token Structure

```javascript
const resetToken = jwt.sign(
  { 
    userId: user.id, 
    action: 'reset-password' 
  }, 
  JWT_SECRET, 
  {
    expiresIn: '1h'
  }
);
```

### Validation Process

1. Verify JWT token signature
2. Check that token contains required fields (userId, action)
3. Ensure action is 'reset-password'
4. Validate token expiration
5. Hash new password
6. Update user's password in database

## Frontend Integration

### Forgot Password Page

URL: `/forgot-password`

Form with email input field that POSTs to `/api/auth/request-password-reset`

### Reset Password Page

URL: `/reset-password?token=TOKEN_HERE`

Form with password and confirm password fields that POSTs to `/api/auth/reset-password` with the token from URL parameters.

## Email Simulation

The current implementation simulates email sending by logging to the console. In production, this should be replaced with a real email service like:

- SendGrid
- AWS SES
- Nodemailer with SMTP
- etc.

### Example Email Content

```
To: user@example.com
Subject: Password Reset Request

Hello,

You have requested to reset your password. Please click the link below to reset your password:

http://localhost:5173/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email.

Thanks,
The ThumPiks Team
```

## Error Handling

### Common Errors

1. **Invalid Token**: "Invalid or expired password reset token"
2. **Expired Token**: "Password reset token has expired"
3. **Missing Fields**: "Token and new password are required"
4. **Weak Password**: "Password must be at least 6 characters long"

### Client-Side Validation

Before sending requests, the frontend should validate:

- Email format on forgot password page
- Password length (minimum 6 characters)
- Password confirmation matching
- Token presence in URL for reset page

## Testing

### Test Cases

1. Request reset with valid email
2. Request reset with invalid email (should still return success)
3. Request reset with missing email (should return error)
4. Reset password with valid token and strong password
5. Reset password with expired token (should return error)
6. Reset password with invalid token (should return error)
7. Reset password with weak password (should return error)
8. Reset password with missing fields (should return error)

### Example Test Flow

1. Register a new user
2. Request password reset for that user
3. Extract token from console logs (in simulation)
4. Use token to reset password
5. Attempt to login with new password