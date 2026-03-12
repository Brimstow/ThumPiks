# Brand Extraction (URL Import) Setup Guide

## Overview

The URL Import feature allows users to extract brand colors, fonts, and logos from any website URL. This feature uses the **Brand.dev API** for production-quality extraction.

## Required API Key

### Brand.dev API

**Website:** https://brand.dev

**What it does:**

- Extracts colors (primary, secondary, accent, background, text)
- Extracts typography (fonts, weights, sizes)
- Extracts logos (favicon, icon, header logo)
- Takes screenshots of websites

### Getting the API Key

1. Go to https://brand.dev
2. Sign up for an account
3. Navigate to Developer Portal / API Access
4. Copy your API key

### Pricing (as of 2024)

- Check https://brand.dev for current pricing
- They offer a free tier for testing
- Paid plans based on API calls

## Environment Variables

Add to your environment variables (Railway, `.env`, etc.):

```bash
# Brand.dev API for URL Import feature
BRAND_DEV_API_KEY=your_api_key_here
```

### Railway Setup

1. Go to your Railway project
2. Navigate to Variables
3. Add `BRAND_DEV_API_KEY` with your key
4. Redeploy

### Local Development

Add to your `.env` file:

```bash
BRAND_DEV_API_KEY=your_api_key_here
```

## Feature Flag

The URL Import feature is controlled by a feature flag in:
`client/src/config/featureFlags.ts`

```typescript
brandKit: {
  urlImport: true,  // Set to true when API key is configured
}
```

## How It Works

### With Brand.dev API (Production)

1. User enters website URL
2. Backend calls Brand.dev's `/brand/retrieve` endpoint
3. Backend calls Brand.dev's `/brand/styleguide` endpoint
4. Backend calls Brand.dev's `/brand/screenshot` endpoint
5. Data is transformed and returned to frontend

### Without API Key (Fallback)

1. User enters website URL
2. Backend makes HTTP request to fetch page HTML
3. Extracts basic data via regex:
   - `<meta name="theme-color">` for brand color
   - Favicon/OG image links
   - Google Fonts URLs
4. Less accurate but works without external service

## API Endpoints Used

| Endpoint                                   | Purpose                        |
| ------------------------------------------ | ------------------------------ |
| `GET /brand/retrieve?domain=example.com`   | Logos, colors, company info    |
| `GET /brand/styleguide?domain=example.com` | Typography, full color palette |
| `GET /brand/screenshot?domain=example.com` | Website screenshot             |

## Testing

Once configured, test with:

```bash
curl -X POST http://localhost:8550/api/brand-kit/extract-from-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"url": "https://stripe.com"}'
```

## Troubleshooting

### "No BRAND_DEV_API_KEY configured"

- Check environment variable is set
- Restart the server after adding the key

### API returns errors

- Verify API key is valid
- Check Brand.dev status page
- Ensure domain is accessible (not blocked)

### Fallback mode only extracts limited data

- This is expected without the API key
- Only theme-color, favicon, and Google Fonts are extracted
- For full extraction, configure the Brand.dev API key

## Cost Optimization

- Brand.dev charges per API call
- Consider caching results for frequently accessed domains
- The fallback mode is free (no external API calls)
