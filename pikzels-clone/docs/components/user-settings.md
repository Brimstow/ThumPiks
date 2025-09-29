# User Settings Component

## Overview

The UserSettings component provides a user interface for managing account preferences and default settings. It allows users to customize their experience with the application.

## Features

1. **Appearance Settings**
   - Theme selection (Light/Dark mode)
   
2. **Language Settings**
   - Preferred language selection from multiple options
   
3. **Notification Preferences**
   - Email notifications toggle
   - Push notifications toggle
   
4. **Thumbnail Defaults**
   - Default width and height settings
   - Default style selection
   
5. **Privacy Settings**
   - Profile visibility toggle
   - Thumbnail public by default toggle

## Component Structure

```tsx
<UserSettings />
```

The component is a self-contained form that handles:
- Fetching current settings on mount
- Managing form state
- Saving updated settings
- Displaying loading, success, and error states

## State Management

The component uses React hooks for state management:

- `settings`: Current user settings object
- `loading`: Loading state during API requests
- `saving`: Saving state during update operations
- `success`: Success message visibility
- `error`: Error message

## API Integration

The component communicates with the backend through two endpoints:

1. **GET** `/api/user/settings` - Fetch current settings
2. **PUT** `/api/user/settings` - Update settings

## Usage

```tsx
import UserSettings from './components/UserSettings';

function App() {
  return (
    <div>
      <UserSettings />
    </div>
  );
}
```

## Styling

The component uses Tailwind CSS classes for styling and follows the application's design system.

## Error Handling

The component gracefully handles:
- Network errors
- Authentication errors
- Server errors
- Validation errors

Error messages are displayed to the user with clear instructions for resolution.

## Testing

The component includes comprehensive tests for:
- Loading state rendering
- Successful data fetching and display
- Error handling
- Form interactions
- API integration