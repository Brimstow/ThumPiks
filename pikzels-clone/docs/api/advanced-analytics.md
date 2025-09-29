# Advanced Analytics API

## Overview

The Advanced Analytics API provides enhanced analytics capabilities for authenticated users, including detailed metrics with timeframe filtering and comparative analysis.

## Endpoints

### Get Detailed Advanced Analytics

**GET** `/api/analytics/detailed`

Retrieve detailed advanced analytics data with timeframe filtering.

#### Request

```http
GET /api/analytics/detailed?timeframe=weekly
Authorization: Bearer <token>
```

##### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| timeframe | string | No | Timeframe for data analysis ('daily', 'weekly', 'monthly'). Defaults to 'daily'. |

#### Response

```json
{
  "detailedAdvancedAnalytics": {
    "productivity": {
      "bestDay": {
        "date": "2025-09-15",
        "count": 8
      },
      "bestHour": {
        "hour": 14,
        "count": 5
      },
      "consistency": 78.57,
      "creationTrend": [
        {
          "date": "2025-09-10",
          "count": 3
        },
        {
          "date": "2025-09-11",
          "count": 5
        },
        {
          "date": "2025-09-12",
          "count": 2
        }
      ]
    },
    "editing": {
      "mostComplexThumbnail": {
        "id": "thumbnail-123",
        "title": "Complex Design",
        "editCount": 12
      },
      "averageEditComplexity": 4.2,
      "editDistribution": {
        "0 edits": 5,
        "1-2 edits": 10,
        "3-5 edits": 8,
        "6-10 edits": 3,
        "10+ edits": 2
      }
    },
    "engagement": {
      "mostShared": {
        "id": "thumbnail-456",
        "title": "Popular Thumbnail",
        "shareCount": 15
      },
      "sharingRate": 42.86,
      "platformDistribution": [
        {
          "platform": "twitter",
          "count": 8
        },
        {
          "platform": "facebook",
          "count": 5
        },
        {
          "platform": "linkedin",
          "count": 3
        },
        {
          "platform": "pinterest",
          "count": 2
        }
      ]
    },
    "timeframeData": {
      "totalThumbnails": 28,
      "averagePerDay": 4.0
    }
  }
}
```

#### Response Codes

- `200` - Success
- `400` - Bad Request (invalid timeframe)
- `401` - Unauthorized
- `500` - Internal Server Error

### Get Comparative Analytics

**GET** `/api/analytics/comparative`

Retrieve comparative analytics data showing current vs previous period metrics.

#### Request

```http
GET /api/analytics/comparative?timeframe=weekly
Authorization: Bearer <token>
```

##### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| timeframe | string | No | Timeframe for data analysis ('daily', 'weekly', 'monthly'). Defaults to 'weekly'. |

#### Response

```json
{
  "comparativeAnalytics": {
    "current": {
      "productivity": {
        "bestDay": {
          "date": "2025-09-15",
          "count": 8
        },
        "bestHour": {
          "hour": 14,
          "count": 5
        },
        "consistency": 78.57,
        "creationTrend": [
          {
            "date": "2025-09-10",
            "count": 3
          }
        ]
      },
      "editing": {
        "mostComplexThumbnail": {
          "id": "thumbnail-123",
          "title": "Complex Design",
          "editCount": 12
        },
        "averageEditComplexity": 4.2,
        "editDistribution": {
          "0 edits": 5,
          "1-2 edits": 10
        }
      },
      "engagement": {
        "mostShared": {
          "id": "thumbnail-456",
          "title": "Popular Thumbnail",
          "shareCount": 15
        },
        "sharingRate": 42.86,
        "platformDistribution": [
          {
            "platform": "twitter",
            "count": 8
          }
        ]
      },
      "timeframeData": {
        "totalThumbnails": 28,
        "averagePerDay": 4.0
      }
    },
    "previous": {
      "productivity": {
        "bestDay": {
          "date": "2025-09-08",
          "count": 6
        },
        "bestHour": {
          "hour": 15,
          "count": 4
        },
        "consistency": 71.43,
        "creationTrend": [
          {
            "date": "2025-09-03",
            "count": 2
          }
        ]
      },
      "editing": {
        "mostComplexThumbnail": {
          "id": "thumbnail-789",
          "title": "Previous Complex Design",
          "editCount": 10
        },
        "averageEditComplexity": 3.8,
        "editDistribution": {
          "0 edits": 7,
          "1-2 edits": 8
        }
      },
      "engagement": {
        "mostShared": {
          "id": "thumbnail-101",
          "title": "Previous Popular Thumbnail",
          "shareCount": 12
        },
        "sharingRate": 35.71,
        "platformDistribution": [
          {
            "platform": "twitter",
            "count": 6
          }
        ]
      },
      "timeframeData": {
        "totalThumbnails": 21,
        "averagePerDay": 3.0
      }
    },
    "comparison": {
      "thumbnails": {
        "current": 28,
        "previous": 21,
        "change": 33.33
      },
      "averagePerDay": {
        "current": 4.0,
        "previous": 3.0,
        "change": 33.33
      },
      "sharingRate": {
        "current": 42.86,
        "previous": 35.71,
        "change": 20.0
      },
      "averageEditComplexity": {
        "current": 4.2,
        "previous": 3.8,
        "change": 10.53
      }
    }
  }
}
```

#### Response Codes

- `200` - Success
- `400` - Bad Request (invalid timeframe)
- `401` - Unauthorized
- `500` - Internal Server Error

## Data Objects

### DetailedAdvancedAnalytics Object

| Property | Type | Description |
|----------|------|-------------|
| productivity | object | Productivity metrics |
| editing | object | Editing complexity metrics |
| engagement | object | Engagement and sharing metrics |
| timeframeData | object | Timeframe-specific data |

### Productivity Object

| Property | Type | Description |
|----------|------|-------------|
| bestDay | object/null | Day with highest thumbnail creation |
| bestHour | object | Hour with highest thumbnail creation |
| consistency | number | Percentage of days with at least one thumbnail |
| creationTrend | array | Daily creation trend data |

### Editing Object

| Property | Type | Description |
|----------|------|-------------|
| mostComplexThumbnail | object/null | Thumbnail with highest edit count |
| averageEditComplexity | number | Average number of edits per thumbnail |
| editDistribution | object | Distribution of thumbnails by edit count |

### Engagement Object

| Property | Type | Description |
|----------|------|-------------|
| mostShared | object/null | Most shared thumbnail |
| sharingRate | number | Percentage of thumbnails shared |
| platformDistribution | array | Distribution of shares by platform |

### TimeframeData Object

| Property | Type | Description |
|----------|------|-------------|
| totalThumbnails | number | Total thumbnails in timeframe |
| averagePerDay | number | Average thumbnails per day |

### ComparativeAnalytics Object

| Property | Type | Description |
|----------|------|-------------|
| current | object | Current period analytics data |
| previous | object | Previous period analytics data |
| comparison | object | Comparison metrics with percentage changes |