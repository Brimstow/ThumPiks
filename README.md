# ThumPiks

AI-powered YouTube thumbnail studio. Design high-converting thumbnails in a browser-based canvas editor, generate and edit imagery with AI, manage brand kits, run A/B tests, and track performance, all backed by a full-stack TypeScript application.

## Overview

ThumPiks is a full-stack web application for creating, editing, and optimizing video thumbnails. It combines a canvas-based editor with AI image generation and vision analysis, a credit-based billing system, and an analytics suite, wrapped in a modular, security-conscious architecture.

## Features

- **Canvas editor** - layered, drag-and-drop thumbnail design with zoom/pan, text, shapes, and image layers.
- **AI generation & editing** - text-to-image generation, background removal, and vision-based analysis via multiple AI providers.
- **Brand kits** - reusable colors, fonts, and logos for consistent branding.
- **Visual search** - vector-based image search over your assets.
- **A/B testing & analytics** - compare thumbnail variants and track engagement metrics.
- **Templates marketplace** - browse and reuse thumbnail templates.
- **Video tools** - video proxy/editing with in-browser FFmpeg and YouTube trending insights.
- **Collaboration** - projects, teams, sharing, and real-time chat.
- **Billing & credits** - Stripe and Polar subscriptions with a credit system.
- **Admin panel** - user management, moderation, notifications, and system monitoring.
- **Auth** - email/password, Google and GitHub OAuth, MFA (TOTP), and password reset.

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Radix UI, Zustand, TanStack Query, React Router, Framer Motion, TensorFlow.js / MediaPipe, Zod.

**Backend:** Node.js, Express 5, TypeScript, Prisma (PostgreSQL), Redis + BullMQ, Passport (OAuth), JWT, Sharp, Cloudinary, Stripe, Polar, Winston/Axiom, Opossum (circuit breakers), Zod.

**Tooling:** Jest, Playwright, ESLint, Husky, lint-staged, secretlint, Commitizen.

## Architecture

The codebase follows a modular, feature-oriented layout:

```
ThumPiks/
├── src/                # Express backend
│   ├── modules/        # Feature modules (auth, thumbnail, billing, ai, admin, ...)
│   ├── middleware/     # Security, auth, error handling
│   └── services/       # Shared services
├── client/             # React frontend
│   ├── src/features/   # Feature UIs
│   └── src/components/  # Shared components
└── prisma/             # Database schema & migrations
```

Each backend feature is organized into route/controller/service layers with a defined dependency direction. Security middleware (Helmet, rate limiting, input sanitization, secret scanning) is applied across the stack.

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL
- Redis

### Setup

```bash
# install dependencies (backend + client)
npm install

# configure environment
cp .env.example .env   # fill in database, Redis, and provider keys

# apply the database schema
npx prisma db push

# start the dev servers
npm run dev
```

### Common Scripts

```bash
npm test      # run the test suite
npm run lint  # lint the codebase
npm run build # production build
```

## Testing

The project uses Jest for unit/integration tests and Playwright for end-to-end tests, with security-focused test suites and coverage enforcement via pre-push hooks.

## License

This project is a portfolio project. All rights reserved unless otherwise noted.
