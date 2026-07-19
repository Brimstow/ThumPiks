# Extending Advanced Analytics

## Overview

This guide explains how to extend the Advanced Analytics Dashboard feature to add new metrics, visualizations, or modify existing functionality.

## Architecture Overview

The Advanced Analytics feature follows a client-server architecture:

1. **Backend** (`src/modules/analytics/`)
   - AnalyticsService: Core logic for calculating metrics
   - AnalyticsController: HTTP request handlers
   - AnalyticsRoutes: API endpoint definitions

2. **Frontend** (`client/src/components/`)
   - AdvancedAnalyticsDashboard: Main UI component
   - AnalyticsDashboard: Entry point with link to advanced analytics

## Adding New Metrics

### Backend Implementation

#### 1. Update AnalyticsService

Add a new method to `src/modules/analytics/analytics.service.ts`:

```typescript
async getNewMetricAnalytics(userId: string) {
  // Get required data from database
  const thumbnails = await prisma.thumbnail.findMany({
    where: { userId },
    // Add necessary filters and selections
  });

  // Calculate your new metric
  const newMetric = this.calculateNewMetric(thumbnails);

  return {
    newMetric
  };
}

private calculateNewMetric(thumbnails: any[]) {
  // Implement your calculation logic here
  return thumbnails.length; // Example calculation
}
```

#### 2. Update Controller

Add a new method to `src/modules/analytics/analytics.controller.ts`:

```typescript
async getNewMetricAnalytics(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    
    // Get new metric analytics data
    const newMetricAnalytics = await analyticsService.getNewMetricAnalytics(userId);
    
    res.status(200).json({
      newMetricAnalytics
    });
  } catch (error) {
    console.error('Error fetching new metric analytics data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

#### 3. Add Route

Update `src/modules/analytics/analytics.routes.ts`:

```typescript
// Add new route
router.get('/new-metric', (req, res) => analyticsController.getNewMetricAnalytics(req, res));
```

### Frontend Implementation

#### 1. Update Component Interface

Add the new metric to the interface in `client/src/components/AdvancedAnalyticsDashboard.tsx`:

```typescript
interface DetailedAdvancedAnalyticsData {
  // Existing properties...
  newMetric: number;
}
```

#### 2. Update Data Fetching

Modify the data fetching logic to include your new metric:

```typescript
const fetchAnalyticsData = async () => {
  try {
    // Existing fetch logic...
    
    // Add your new endpoint
    const newMetricResponse = await fetch('/api/analytics/new-metric', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (newMetricResponse.ok) {
      const newMetricData = await newMetricResponse.json();
      // Update state with new metric data
    }
  } catch (err) {
    // Error handling
  }
};
```

#### 3. Add Visualization

Add a new visualization component for your metric:

```tsx
{/* New Metric Visualization */}
<div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
  <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
    New Metric
  </h3>
  <div className="flex items-center justify-center h-32">
    <div className="text-3xl font-bold text-indigo-600">
      {analyticsData.newMetric}
    </div>
  </div>
</div>
```

## Adding New Timeframe Options

### Backend Implementation

#### 1. Update Timeframe Validation

Update the timeframe validation in controller methods:

```typescript
// In controller methods
const timeframe = (req.query.timeframe as 'daily' | 'weekly' | 'monthly' | 'quarterly') || 'daily';

// Validate timeframe parameter
if (!['daily', 'weekly', 'monthly', 'quarterly'].includes(timeframe)) {
  return res.status(400).json({ error: 'Invalid timeframe. Must be daily, weekly, monthly, or quarterly.' });
}
```

#### 2. Update Filter Logic

Update the `filterThumbnailsByTimeframe` method in `analytics.service.ts`:

```typescript
private filterThumbnailsByTimeframe(thumbnails: any[], timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly') {
  const now = new Date();
  let startDate: Date;

  switch (timeframe) {
    case 'daily':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
      break;
    case 'weekly':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
      break;
    case 'monthly':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      break;
    case 'quarterly':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // Last 90 days
      break;
    default:
      return thumbnails; // Return all if no valid timeframe
  }

  return thumbnails.filter(thumbnail => new Date(thumbnail.createdAt) >= startDate);
}
```

### Frontend Implementation

#### 1. Update Timeframe Options

Update the timeframe filtering controls in `AdvancedAnalyticsDashboard.tsx`:

```tsx
<div className="flex rounded-md shadow-sm">
  <button
    type="button"
    onClick={() => handleTimeframeChange('daily')}
    className={`px-4 py-2 text-sm font-medium rounded-l-md ${
      timeframe === 'daily'
        ? 'bg-indigo-600 text-white'
        : `${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50'} border border-gray-300`
    }`}
  >
    Daily
  </button>
  {/* Existing buttons... */}
  <button
    type="button"
    onClick={() => handleTimeframeChange('quarterly')}
    className={`px-4 py-2 text-sm font-medium rounded-r-md ${
      timeframe === 'quarterly'
        ? 'bg-indigo-600 text-white'
        : `${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50'} border border-gray-300`
    }`}
  >
    Quarterly
  </button>
</div>
```

## Adding New Chart Types

### 1. Install Charting Library

If you need more advanced charting capabilities, install a charting library:

```bash
npm install chart.js react-chartjs-2
```

### 2. Create Chart Component

Create a new component for your chart type:

```tsx
// client/src/components/charts/NewChartType.tsx
import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface NewChartTypeProps {
  data: any[];
  theme: 'light' | 'dark';
}

const NewChartType: React.FC<NewChartTypeProps> = ({ data, theme }) => {
  const chartData = {
    labels: data.map(item => item.label),
    datasets: [
      {
        label: 'New Chart Data',
        data: data.map(item => item.value),
        backgroundColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.8)' : 'rgba(79, 70, 229, 0.8)',
        borderColor: theme === 'dark' ? 'rgb(99, 102, 241)' : 'rgb(79, 70, 229)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: theme === 'dark' ? '#fff' : '#000',
        },
      },
      title: {
        display: true,
        text: 'New Chart Title',
        color: theme === 'dark' ? '#fff' : '#000',
      },
    },
    scales: {
      y: {
        ticks: {
          color: theme === 'dark' ? '#fff' : '#000',
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        ticks: {
          color: theme === 'dark' ? '#fff' : '#000',
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default NewChartType;
```

### 3. Use Chart Component

Import and use the new chart component in `AdvancedAnalyticsDashboard.tsx`:

```tsx
import NewChartType from './charts/NewChartType';

// In the render method
<NewChartType 
  data={chartData} 
  theme={theme} 
/>
```

## Performance Optimization

### Backend Optimizations

#### 1. Database Query Optimization

Use Prisma's query optimization features:

```typescript
// Use select to limit fields
const thumbnails = await prisma.thumbnail.findMany({
  where: { userId },
  select: {
    id: true,
    createdAt: true,
    // Only select fields you need
  }
});

// Use pagination for large datasets
const thumbnails = await prisma.thumbnail.findMany({
  where: { userId },
  skip: page * pageSize,
  take: pageSize,
  orderBy: {
    createdAt: 'desc'
  }
});
```

#### 2. Caching

Implement caching for expensive calculations:

```typescript
private cache: Map<string, any> = new Map();

async getExpensiveMetric(userId: string) {
  const cacheKey = `expensive_metric_${userId}`;
  
  if (this.cache.has(cacheKey)) {
    return this.cache.get(cacheKey);
  }
  
  // Calculate expensive metric
  const result = await this.calculateExpensiveMetric(userId);
  
  // Cache for 5 minutes
  this.cache.set(cacheKey, result);
  setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
  
  return result;
}
```

### Frontend Optimizations

#### 1. Memoization

Use React.memo for expensive components:

```tsx
const ExpensiveChart = React.memo(({ data }: { data: any[] }) => {
  // Expensive rendering logic
  return <div>{/* Chart rendering */}</div>;
});
```

#### 2. Virtualization

For large datasets, use virtualization libraries like `react-window`:

```bash
npm install react-window
```

```tsx
import { FixedSizeList as List } from 'react-window';

const VirtualizedList = ({ items }: { items: any[] }) => (
  <List
    height={400}
    itemCount={items.length}
    itemSize={50}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        {items[index].name}
      </div>
    )}
  </List>
);
```

## Testing

### Backend Tests

Add tests for new analytics methods in `analytics.service.test.ts`:

```typescript
describe('getNewMetricAnalytics', () => {
  it('should calculate new metric correctly', async () => {
    // Mock data
    const mockThumbnails = [
      // Test data
    ];
    
    // Mock Prisma
    prisma.thumbnail.findMany = jest.fn().mockResolvedValue(mockThumbnails);
    
    // Test the method
    const result = await analyticsService.getNewMetricAnalytics('user123');
    
    // Assertions
    expect(result.newMetric).toBe(expectedValue);
  });
});
```

### Frontend Tests

Add tests for new components in `AdvancedAnalyticsDashboard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import AdvancedAnalyticsDashboard from './AdvancedAnalyticsDashboard';

describe('AdvancedAnalyticsDashboard', () => {
  it('displays new metric correctly', async () => {
    // Mock API response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        detailedAdvancedAnalytics: {
          // Mock data including new metric
        }
      })
    });
    
    // Render component
    render(<AdvancedAnalyticsDashboard />);
    
    // Wait for data to load
    await screen.findByText('New Metric Value');
    
    // Assertions
    expect(screen.getByText('New Metric Value')).toBeInTheDocument();
  });
});
```

## Best Practices

1. **Performance First** - Optimize database queries and calculations
2. **User Experience** - Keep loading times minimal and provide feedback
3. **Data Privacy** - Ensure all analytics data remains private to the user
4. **Error Handling** - Implement comprehensive error handling for all operations
5. **Documentation** - Update documentation when adding new features
6. **Testing** - Write tests for all new functionality
7. **Accessibility** - Ensure new visualizations are accessible
8. **Responsive Design** - Make sure new features work on all device sizes

## Common Pitfalls

1. **Over-fetching Data** - Only retrieve data you actually need
2. **Blocking Operations** - Avoid long-running synchronous operations
3. **Memory Leaks** - Clean up event listeners and subscriptions
4. **Inconsistent UI** - Maintain consistent styling with the rest of the application
5. **Poor Error Messages** - Provide clear, actionable error messages
6. **Hardcoded Values** - Use configuration files for customizable values

## Getting Help

If you need assistance extending the Advanced Analytics feature:
1. Review this documentation and existing code
2. Check the project's issue tracker for similar requests
3. Consult with the development team
4. Submit a feature request for complex additions