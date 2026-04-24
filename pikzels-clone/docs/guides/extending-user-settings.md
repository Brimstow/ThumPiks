# Extending User Settings

## Overview

This guide explains how to extend the user settings feature to add new preferences or modify existing ones.

## Adding New Settings Categories

### 1. Update the Settings Interface

First, update the [UserSettings](file:///b:/Thumbnail_maker/pikzels-clone/client/src/components/UserSettings.tsx#L4-L16) interface in `client/src/components/UserSettings.tsx`:

```typescript
interface UserSettings {
  // Existing properties...
  newCategory?: {
    newProperty?: string;
    anotherProperty?: boolean;
  };
}
```

### 2. Add UI Elements

Add a new section in the UserSettings component:

```tsx
{/* New Category Settings */}
<div>
  <h4 className="text-md font-medium text-gray-900 mb-4">New Category</h4>
  <div className="space-y-4">
    {/* Add your new settings controls here */}
  </div>
</div>
```

### 3. Add Handler Functions

Create handler functions for your new settings:

```typescript
const handleNewCategoryChange = (field: keyof NonNullable<UserSettings['newCategory']>, value: any) => {
  setSettings(prev => ({
    ...prev,
    newCategory: {
      ...prev.newCategory,
      [field]: value
    }
  }));
};
```

## Adding New Properties to Existing Categories

### 1. Update the Interface

Add the new property to the appropriate interface section:

```typescript
interface UserSettings {
  theme?: 'light' | 'dark';
  newThemeProperty?: string; // New property in theme category
  // ... other properties
}
```

### 2. Add UI Controls

Add the new control in the appropriate section of the component:

```tsx
{/* Within the Theme Settings section */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    New Theme Property
  </label>
  <input
    type="text"
    value={settings.newThemeProperty || ''}
    onChange={(e) => setSettings(prev => ({
      ...prev,
      newThemeProperty: e.target.value
    }))}
    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
  />
</div>
```

## Backend Considerations

### Database Schema

The settings are stored as a JSON field in the User table, so no database migration is needed for simple additions. However, if you need to query specific settings frequently, consider adding indexed fields.

### Controller Updates

The backend controller automatically handles any valid JSON structure, so no changes are needed unless you want to add validation.

## Validation

### Frontend Validation

Add validation to the saveSettings function:

```typescript
const saveSettings = async () => {
  // Add validation
  if (settings.thumbnailDefaults?.width && settings.thumbnailDefaults.width < 100) {
    setError('Thumbnail width must be at least 100 pixels');
    return;
  }
  
  // ... rest of the function
};
```

### Backend Validation

Add validation to the updateUserSettings method in the controller:

```typescript
// In profile.controller.ts
async updateUserSettings(req: AuthRequest, res: Response) {
  try {
    // Add validation
    if (req.body.settings.thumbnailDefaults?.width < 100) {
      return res.status(400).json({ error: 'Thumbnail width must be at least 100 pixels' });
    }
    
    // ... rest of the method
  } catch (error) {
    // ... error handling
  }
}
```

## Testing

### Frontend Tests

Update the UserSettings.test.tsx file to include tests for new functionality:

```typescript
it('handles new property correctly', async () => {
  // ... test implementation
});
```

### Backend Tests

Update the profile.controller.test.ts file:

```typescript
describe('updateUserSettings', () => {
  it('should validate new property', async () => {
    // ... test implementation
  });
});
```

## Best Practices

1. **Keep settings flexible**: Use the JSON field approach for maximum flexibility
2. **Validate important settings**: Add validation for settings that could break the application
3. **Provide sensible defaults**: Ensure new settings have reasonable defaults
4. **Document new settings**: Update documentation when adding new settings
5. **Test thoroughly**: Ensure new settings work correctly in all scenarios
6. **Consider performance**: Be mindful of the size of the settings object
7. **Plan for migration**: Consider how existing users will get new settings

## Example: Adding a New Notification Type

Here's a complete example of adding a new notification type:

### 1. Update Interface

```typescript
interface UserSettings {
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean; // New notification type
  };
  // ... other properties
}
```

### 2. Add UI Control

```tsx
{/* Within the Notifications section */}
<div className="flex items-center justify-between">
  <div>
    <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
    <p className="text-sm text-gray-500">Receive SMS notifications</p>
  </div>
  <div className="flex items-center">
    <button
      type="button"
      className={`${
        settings.notifications?.sms ? 'bg-indigo-600' : 'bg-gray-200'
      } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
      onClick={() => handleNotificationChange('sms', !settings.notifications?.sms)}
    >
      {/* Toggle button implementation */}
    </button>
  </div>
</div>
```

### 3. Update Handler

The existing `handleNotificationChange` function already handles new properties dynamically.

### 4. Add Test

```typescript
it('handles SMS notification toggle', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ 
      settings: {
        notifications: {
          email: true,
          push: false,
          sms: true
        }
      }
    })
  });

  render(<UserSettings />);
  
  // Wait for component to load
  await waitFor(() => {
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });
  
  // Check that SMS toggle is rendered and checked
  const smsToggle = screen.getByRole('switch', { name: 'SMS Notifications' });
  expect(smsToggle).toBeInTheDocument();
  expect(smsToggle).toBeChecked();
});
```