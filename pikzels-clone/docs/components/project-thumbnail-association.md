# Project Thumbnail Association Components

This document describes the React components used for project thumbnail association functionality.

## SetFeaturedThumbnail Component

A modal component that allows users to select a thumbnail to set as the featured thumbnail for a project.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| projectId | string | Yes | The ID of the project for which to set a featured thumbnail |
| onClose | function | Yes | Callback function to close the modal |
| onSetFeatured | function | Yes | Callback function called when a thumbnail is selected to be featured |

### Usage

```jsx
<SetFeaturedThumbnail
  projectId="project-123"
  onClose={() => setSettingFeaturedForProject(null)}
  onSetFeatured={(thumbnailId) => handleSetFeaturedThumbnail("project-123", thumbnailId)}
/>
```

### Features

1. Fetches all thumbnails belonging to the specified project
2. Displays thumbnails in a grid layout with preview images
3. Allows users to select a thumbnail by clicking on it
4. Shows a visual indicator for the selected thumbnail
5. Provides "Set as Featured" button to confirm the selection
6. Includes "Cancel" button to close the modal without making changes

## Dashboard Component Integration

The Dashboard component integrates project thumbnail association functionality in the Projects tab.

### Features

1. Displays a list of projects with their details
2. Shows the featured thumbnail for each project if one is set
3. Provides a "Set Featured Thumbnail" button for projects without a featured thumbnail
4. Provides a "Change Featured Thumbnail" button for projects with a featured thumbnail
5. Opens the SetFeaturedThumbnail modal when the button is clicked
6. Updates the project display when a featured thumbnail is set

### UI Elements

1. **Project Cards**: Each project is displayed in a card layout
2. **Featured Thumbnail Preview**: Shows the featured thumbnail with title if one is set
3. **Set/Change Featured Thumbnail Button**: Opens the SetFeaturedThumbnail modal
4. **Edit Button**: Allows editing the featured thumbnail directly

### Example Project Card

```
[Project Name] [Active]
[Project Description]
Created on [Date]

[Featured Thumbnail Preview]
[Thumbnail Title]

[Set/Change Featured Thumbnail Button]
```