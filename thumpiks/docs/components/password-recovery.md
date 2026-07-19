# Password Recovery Components

This document describes the frontend components for password recovery functionality.

## Overview

The password recovery system consists of two React components that handle the user flow for resetting forgotten passwords.

## Components

### ForgotPassword

Located at: `client/src/components/auth/ForgotPassword.tsx`

This component allows users to request a password reset by entering their email address.

#### Features

- Email input field with validation
- Form submission handling
- Success and error messaging
- Loading state during API requests
- Navigation back to login page

#### User Flow

1. User navigates to `/forgot-password`
2. User enters email address
3. User submits form
4. System sends request to `/api/auth/request-password-reset`
5. User sees success message
6. User can navigate back to login

#### State Management

```typescript
const [email, setEmail] = useState('');
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState('');
const [error, setError] = useState('');
```

#### API Integration

- POST `/api/auth/request-password-reset`
- Handles success and error responses
- Displays appropriate user feedback

### ResetPassword

Located at: `client/src/components/auth/ResetPassword.tsx`

This component allows users to reset their password using a token received via email.

#### Features

- Token extraction from URL parameters
- Password and confirmation input fields
- Password matching validation
- Password strength validation (minimum 6 characters)
- Form submission handling
- Success and error messaging
- Loading state during API requests
- Automatic redirect to login after success

#### User Flow

1. User clicks reset link from email (contains token)
2. User lands on `/reset-password?token=TOKEN`
3. Component extracts token from URL
4. User enters new password and confirms it
5. User submits form
6. System sends request to `/api/auth/reset-password`
7. User sees success message
8. User is automatically redirected to login after 3 seconds

#### State Management

```typescript
const [searchParams] = useSearchParams();
const [token, setToken] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState('');
const [error, setError] = useState('');
```

#### API Integration

- GET token from URL parameters
- POST `/api/auth/reset-password`
- Handles success and error responses
- Displays appropriate user feedback

## Styling

Both components use the same styling approach as other auth components:

- Tailwind CSS classes
- Consistent color scheme (indigo primary color)
- Responsive design
- Accessible form elements
- Clear visual feedback for user actions

## Navigation

### Links

- Forgot Password link added to Login component
- Back to Login links on both recovery components
- Automatic redirect after successful password reset

### Routes

```jsx
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
```

## Validation

### Client-Side Validation

1. **Email Format**: HTML5 email input validation
2. **Password Length**: Minimum 6 characters
3. **Password Confirmation**: Must match password field
4. **Token Presence**: Required for ResetPassword component

### Server-Side Validation

Handled by backend API endpoints:
- Email format validation
- Password strength validation
- Token validation and expiration checking

## Error Handling

### Display

- Error messages displayed in red alert boxes
- Success messages displayed in green alert boxes
- Clear, user-friendly error messages
- Persistent messages until form resubmission

### Common Errors

1. **Network Issues**: "Network error. Please try again."
2. **Invalid Token**: "Invalid or expired password reset token"
3. **Expired Token**: "Password reset token has expired"
4. **Weak Password**: "Password must be at least 6 characters long"
5. **Mismatched Passwords**: "Passwords do not match"
6. **Missing Email**: "Email is required"
7. **Missing Fields**: "Token and new password are required"

## Security Considerations

### Token Handling

- Tokens are extracted from URL parameters
- Tokens are not stored in localStorage or sessionStorage
- Tokens are sent only in the reset password request

### Password Handling

- Passwords are never logged or displayed
- Password confirmation prevents typos
- Minimum length requirement enforces basic security

### Information Disclosure

- No information about email existence is revealed
- Generic success messages prevent user enumeration

## Integration Points

### With Login Component

- "Forgot Password?" link added to Login form
- Consistent styling and user experience
- Shared navigation patterns

### With Auth Service

- Uses same base API URL (`/api/auth/`)
- Consistent error handling patterns
- Shared authentication context

## Testing

### Manual Testing

1. Navigate to Forgot Password page
2. Enter valid email and submit
3. Check console for simulated email with token
4. Navigate to Reset Password page with token
5. Enter new password and confirmation
6. Submit and verify success message
7. Navigate to login and test new password

### Edge Cases

1. Invalid or expired token handling
2. Network error handling
3. Password mismatch handling
4. Weak password handling
5. Missing email/token handling