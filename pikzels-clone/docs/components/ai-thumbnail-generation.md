# AI Thumbnail Generation Component

## Overview

The AI Thumbnail Generation component provides a user-friendly interface for creating thumbnails using AI technology. The component includes a modal dialog that allows users to enter a prompt, select a style, and choose a project for their thumbnails.

## Component: CreateThumbnail

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| onClose | function | Yes | Function to call when the modal is closed |
| onCreate | function | Yes | Function to call when the user submits the form |
| projects | array | Yes | Array of available projects for thumbnail association |

### Usage

```jsx
<CreateThumbnail
  onClose={() => setCreatingThumbnail(false)}
  onCreate={handleCreateThumbnail}
  projects={projects.map(p => ({ id: p.id, name: p.name }))}
/>
```

### Features

1. **Prompt Input** - Text area for entering a detailed description of the desired thumbnail
2. **Style Selection** - Dropdown for selecting from three available styles (bold, minimalist, dramatic)
3. **Project Association** - Dropdown for selecting which project to associate the thumbnails with
4. **Loading States** - Visual feedback during thumbnail generation
5. **Responsive Design** - Works on all device sizes
6. **Dark Mode Support** - Adapts to the application's theme

### Form Validation

The component includes built-in form validation:

1. **Prompt Required** - The prompt field must not be empty
2. **Project Required** - A project must be selected
3. **Loading State** - The submit button is disabled during generation

### Error Handling

The component handles various error scenarios:

1. **Network Errors** - Displays an alert when the API request fails
2. **Validation Errors** - Prevents submission of invalid forms
3. **API Errors** - Displays error messages returned from the backend

### Styling

The component uses Tailwind CSS classes and adapts to both light and dark themes based on the application's theme context.

## Integration with Dashboard

The CreateThumbnail component is integrated with the main Dashboard component:

1. **State Management** - Uses React state to control the visibility of the modal
2. **Event Handling** - Handles form submission and modal closing events
3. **Data Flow** - Communicates with the backend API to generate thumbnails
4. **UI Updates** - Refreshes the thumbnail list after successful generation

## Accessibility

The component follows accessibility best practices:

1. **Keyboard Navigation** - Fully navigable with keyboard
2. **Screen Reader Support** - Proper labels and ARIA attributes
3. **Focus Management** - Maintains focus within the modal
4. **Contrast Ratios** - Meets WCAG contrast requirements for both themes

## Customization

The component can be easily customized:

1. **Styling** - Modify Tailwind classes to change appearance
2. **Validation** - Add additional form validation rules
3. **Fields** - Add or remove form fields as needed
4. **Error Handling** - Customize error display and handling

## Example Implementation

```jsx
const [creatingThumbnail, setCreatingThumbnail] = useState(false);

const handleCreateThumbnail = async (prompt, style, projectId) => {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch('/api/thumbnails/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ prompt, style, projectId })
    });

    if (response.ok) {
      const data = await response.json();
      // Refresh thumbnails list
      await fetchThumbnails();
      setCreatingThumbnail(false);
      alert(`${data.thumbnails.length} thumbnails generated successfully!`);
    } else {
      const errorData = await response.json();
      alert(`Failed to generate thumbnails: ${errorData.error}`);
    }
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    alert('Failed to create thumbnail. Please try again.');
  }
};

// In render method:
{creatingThumbnail && (
  <CreateThumbnail
    onClose={() => setCreatingThumbnail(false)}
    onCreate={handleCreateThumbnail}
    projects={projects.map(p => ({ id: p.id, name: p.name }))}
  />
)}
```