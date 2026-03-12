# YouTube Trending API Setup Guide

## Overview

The YouTube Trending feature is fully implemented and ready to display live trending thumbnails. You just need to get a YouTube Data API key to enable it.

## Current Status: ⏸️ Waiting for API Key

**What's done:**

- ✅ Backend service (`src/modules/youtube-trending/`)
- ✅ API routes for `/status`, `/regions`, `/categories`, `/videos`
- ✅ Frontend with region auto-detect + dropdown
- ✅ Live data display with view counts and channel names
- ✅ Graceful fallback to curated examples when API not configured

**What's needed:**

- ⬜ Google Cloud Project with YouTube Data API v3 enabled
- ⬜ API key added to `.env` file

---

## Setup Instructions (5-10 minutes)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Name it something like `thumpiks-youtube` or `thumbnail-maker`
4. Click **Create**

### Step 2: Enable YouTube Data API v3

1. In your new project, go to **APIs & Services** → **Library**
2. Search for `YouTube Data API v3`
3. Click on it → Click **Enable**

### Step 3: Create API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **API key**
3. Copy the generated key
4. (Optional but recommended) Click **Restrict Key**:
   - Under "API restrictions", select **Restrict key**
   - Choose **YouTube Data API v3** only
   - Save

### Step 4: Add to Environment

Add this line to your `.env` file:

```
YOUTUBE_API_KEY=your-api-key-here
```

### Step 5: Restart Server

Restart your backend server to pick up the new environment variable.

---

## Free Tier Limits

- **10,000 units/day** (resets at midnight Pacific Time)
- Each `videos.list` call = 1 unit
- This is plenty for development and moderate production use

## Testing

After setup, visit the **YouTube Trending** page in your app:

- You should see a green "LIVE" badge instead of the blue "PLANNED" badge
- Real trending videos with view counts will appear
- The region dropdown will fetch region-specific trending content

---

## Troubleshooting

**"YouTube API not configured" error:**

- Make sure `YOUTUBE_API_KEY` is in your `.env` file
- Make sure the key doesn't have quotes around it
- Restart the backend server

**"YouTube API error: 403":**

- API key may be restricted incorrectly
- Check that YouTube Data API v3 is enabled for your project
- Check your quota hasn't been exceeded

**No videos showing:**

- Some region/category combinations may have no trending videos
- Try switching to "All" category or "United States" region
