# Deployment Setup Guide

## Database Setup for New Environments

### What's in Git ✅
- `prisma/schema.prisma` - Database schema definition
- `prisma/migrations/` - Database migration files
- Package configuration files
- Source code and components

### What's NOT in Git ❌
- Actual database files (`database/` directory)
- Environment variables (`.env` files)
- Generated files and logs
- Large binaries and installations

## Setting Up on New Machine/Deployment

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd Thumbnail_maker
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install client dependencies
cd pikzels-clone/client
npm install
cd ..

# Install server dependencies  
cd pikzels-clone
npm install
cd ..
```

### 3. Database Setup
```bash
# Option A: Use your existing setup scripts
cd pikzels-clone
node setup-postgres.js

# Option B: Manual PostgreSQL setup
# 1. Install PostgreSQL on target machine
# 2. Create database
# 3. Set environment variables
```

### 4. Environment Configuration
Create `.env` file in `pikzels-clone/` directory:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/thumbnail_maker"
JWT_SECRET="your-jwt-secret"
PORT=3001
```

### 5. Run Database Migrations
```bash
cd pikzels-clone
npx prisma migrate deploy
npx prisma generate
```

### 6. Seed Initial Data
```bash
# Seed test users (recommended for development/testing)
npm run prisma:seed

# OR use the complete setup command (migrations + seed)
npm run db:setup

# Create admin user (if needed)
node create-default-admin.ts
```

**📖 For detailed test user setup, see:** `pikzels-clone/TEST_USER_SETUP_GUIDE.md`

### 7. Start the Application
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Secret for JWT tokens | `your-secure-secret-here` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` or `production` |

## Production Deployment Checklist

- [ ] PostgreSQL database created
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Database migrations applied
- [ ] Test users seeded (development/test only)
- [ ] Admin user created (production)
- [ ] Security configurations verified
- [ ] SSL certificates configured (if applicable)
- [ ] Backup strategy implemented

## Troubleshooting

### Database Connection Issues
```bash
# Test database connection
npx prisma db pull
```

### Migration Issues
```bash
# Reset database (DANGER: destroys data)
npx prisma migrate reset

# Apply specific migration
npx prisma migrate deploy
```

### Port Conflicts
```bash
# Check running processes (Windows)
tasklist | findstr node

# Kill process by port (Windows)
netstat -ano | findstr :3001
```

## Notes
- Database files are intentionally excluded from Git
- Each environment needs its own database setup
- Migrations ensure schema consistency across environments
- Use environment variables for configuration differences