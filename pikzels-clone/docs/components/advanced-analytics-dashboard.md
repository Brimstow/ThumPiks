# AdvancedAnalyticsDashboard Component

## Overview

The AdvancedAnalyticsDashboard component provides a comprehensive interface for viewing detailed analytics with timeframe filtering and comparative analysis. This component extends the existing analytics capabilities by offering more granular insights into user behavior and performance metrics.

## Component Structure

### File Location
`client/src/components/AdvancedAnalyticsDashboard.tsx`

### Dependencies
- React (useState, useEffect)
- React Router (useNavigate)
- Theme Context (useTheme)
- CSS Modules (for styling)

### Props
The component does not require any props.

## State Management

The component manages the following state variables:

| State Variable | Type | Description |
|----------------|------|-------------|
| timeframe | 'daily' \| 'weekly' \| 'monthly' | Current selected timeframe for data analysis |
| analyticsData | ComparativeAnalyticsData \| null | Fetched analytics data |
| loading | boolean | Loading state indicator |
| error | string \| null | Error message if data fetching fails |

## Data Interfaces

### DetailedAdvancedAnalyticsData
```typescript
interface DetailedAdvancedAnalyticsData {
  productivity: {
    bestDay: { date: string; count: number } | null;
    bestHour: { hour: number; count: number };
    consistency: number;
    creationTrend: Array<{ date: string; count: number }>;
  };
  editing: {
    mostComplexThumbnail: { id: string; title: string; editCount: number } | null;
    averageEditComplexity: number;
    editDistribution: Record<string, number>;
  };
  engagement: {
    mostShared: { id: string; title: string; shareCount: number } | null;
    sharingRate: number;
    platformDistribution: Array<{ platform: string; count: number }>;
  };
  timeframeData: {
    totalThumbnails: number;
    averagePerDay: number;
  };
}
```

### ComparativeAnalyticsData
```typescript
interface ComparativeAnalyticsData {
  current: DetailedAdvancedAnalyticsData;
  previous: DetailedAdvancedAnalyticsData;
  comparison: {
    thumbnails: {
      current: number;
      previous: number;
      change: number;
    };
    averagePerDay: {
      current: number;
      previous: number;
      change: number;
    };
    sharingRate: {
      current: number;
      previous: number;
      change: number;
    };
    averageEditComplexity: {
      current: number;
      previous: number;
      change: number;
    };
  };
}
```

## Key Functions

### handleTimeframeChange
Updates the selected timeframe and triggers a data refresh.

```typescript
const handleTimeframeChange = (newTimeframe: 'daily' | 'weekly' | 'monthly') => {
  setTimeframe(newTimeframe);
}
```

### renderTrendIndicator
Renders a visual indicator showing the trend direction and magnitude.

```typescript
const renderTrendIndicator = (change: number) => {
  // Returns JSX for trend indicator
}
```

### fetchAnalyticsData
Fetches analytics data from the backend API based on the selected timeframe.

```typescript
const fetchAnalyticsData = async () => {
  // API call implementation
}
```

## UI Components

### Timeframe Filtering Controls
Interactive buttons for selecting the data timeframe:
- Daily view (last 24 hours)
- Weekly view (last 7 days) - default
- Monthly view (last 30 days)

### Summary Cards
Display key metrics with comparative trend indicators:
- Total Thumbnails
- Average Per Day
- Best Hour
- Sharing Rate

### Charts Section
Visual representations of analytics data:
- Creation Trend Chart (bar chart)
- Edit Distribution Chart (progress bars)
- Platform Distribution Chart (bar chart)

### Detailed Metrics Section
Specific insights into top-performing content:
- Most Complex Thumbnail
- Most Shared Thumbnail

## Data Fetching

The component uses React's useEffect hook to fetch data when:
1. The component mounts
2. The timeframe changes

API endpoints used:
- `/api/analytics/comparative?timeframe={selectedTimeframe}`

Error handling is implemented for:
- Network failures
- Authentication errors
- Invalid responses

## Styling

The component uses Tailwind CSS classes for styling with dark mode support:
- Dynamic class switching based on theme context
- Responsive design for all screen sizes
- Consistent styling with the rest of the application

## Integration Points

### React Router
- Uses useNavigate hook for navigation
- Links to the advanced analytics route

### Theme Context
- Uses useTheme hook for dark mode support
- Applies theme-specific classes to all UI elements

### Authentication
- Retrieves JWT token from localStorage
- Includes Authorization header in API requests

## Performance Considerations

- Implements loading states to improve perceived performance
- Uses efficient data fetching with automatic caching
- Optimizes rendering with conditional displays
- Minimizes re-renders with proper state management

## Error Handling

The component handles the following error scenarios:
- Network connectivity issues
- Authentication failures
- API response errors
- Data processing errors
- Empty data states

Error messages are displayed in user-friendly format with appropriate styling based on the theme.

## Accessibility

- Proper semantic HTML structure
- Sufficient color contrast for both light and dark modes
- Keyboard navigable UI elements
- Screen reader friendly labels and descriptions

## Testing

The component should be tested for:
- Data fetching and display
- Timeframe filtering functionality
- Error state handling
- Loading state behavior
- Theme switching
- Responsive design across different screen sizes

## Dependencies

### External Dependencies
- react
- react-router-dom
- @heroicons/react (for SVG icons)

### Internal Dependencies
- ThemeContext (for dark mode support)
- ProtectedRoute (for authentication)

## Future Enhancements

Potential improvements for the component:
- Export functionality (CSV/PDF)
- Custom date range selection
- Advanced filtering options
- Additional chart types
- Real-time data updates
- User preferences for default views