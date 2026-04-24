import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Database optimization script
 * This script creates indexes for better query performance
 */
async function optimizeDatabase() {
  console.log('🚀 Starting database optimization...');

  try {
    // Check if we're using PostgreSQL
    const isPostgreSQL = process.env.DATABASE_URL?.includes('postgresql');

    if (isPostgreSQL) {
      console.log('📊 Creating PostgreSQL indexes...');

      // Create indexes for frequently queried columns
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_thumbnails_user_id_created_at 
        ON "Thumbnail" (user_id, created_at DESC);
      `;

      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_thumbnails_project_id 
        ON "Thumbnail" (project_id);
      `;

      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_id_created_at 
        ON "Project" (user_id, created_at DESC);
      `;

      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_thumbnails_title_search 
        ON "Thumbnail" USING gin(to_tsvector('english', title));
      `;

      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_thumbnails_prompt_search 
        ON "Thumbnail" USING gin(to_tsvector('english', prompt));
      `;

      // Composite index for filtering and sorting
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_thumbnails_user_project_date 
        ON "Thumbnail" (user_id, project_id, created_at DESC);
      `;

      console.log('✅ PostgreSQL indexes created successfully');

    } else if (process.env.DATABASE_URL?.includes('mysql')) {
      console.log('📊 Creating MySQL indexes...');

      // MySQL indexes
      await prisma.$executeRaw`
        CREATE INDEX idx_thumbnails_user_id_created_at 
        ON Thumbnail (user_id, created_at DESC);
      `;

      await prisma.$executeRaw`
        CREATE INDEX idx_thumbnails_project_id 
        ON Thumbnail (project_id);
      `;

      await prisma.$executeRaw`
        CREATE INDEX idx_projects_user_id_created_at 
        ON Project (user_id, created_at DESC);
      `;

      // Full-text search indexes for MySQL
      await prisma.$executeRaw`
        CREATE FULLTEXT INDEX idx_thumbnails_title_fulltext 
        ON Thumbnail (title);
      `;

      await prisma.$executeRaw`
        CREATE FULLTEXT INDEX idx_thumbnails_prompt_fulltext 
        ON Thumbnail (prompt);
      `;

      console.log('✅ MySQL indexes created successfully');

    } else {
      console.log('📊 SQLite detected - indexes will be created via Prisma schema');
      
      // For SQLite, we rely on the indexes defined in the Prisma schema
      // as SQLite doesn't support concurrent index creation
      console.log('ℹ️  For SQLite, ensure your Prisma schema includes proper indexes');
    }

    // Update table statistics (PostgreSQL specific)
    if (isPostgreSQL) {
      console.log('📈 Updating table statistics...');
      await prisma.$executeRaw`ANALYZE "Thumbnail";`;
      await prisma.$executeRaw`ANALYZE "Project";`;
      await prisma.$executeRaw`ANALYZE "User";`;
      console.log('✅ Table statistics updated');
    }

    console.log('🎉 Database optimization completed successfully!');

  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Check database performance and provide recommendations
 */
async function checkPerformance() {
  console.log('🔍 Checking database performance...');

  try {
    const isPostgreSQL = process.env.DATABASE_URL?.includes('postgresql');

    if (isPostgreSQL) {
      // Check slow queries
      const slowQueries = await prisma.$queryRaw`
        SELECT query, mean_time, calls, total_time
        FROM pg_stat_statements
        WHERE mean_time > 100
        ORDER BY mean_time DESC
        LIMIT 10;
      `;

      console.log('📊 Slow queries (>100ms average):', slowQueries);

      // Check index usage
      const indexUsage = await prisma.$queryRaw`
        SELECT schemaname, tablename, attname, n_distinct, correlation
        FROM pg_stats
        WHERE schemaname = 'public'
        AND tablename IN ('Thumbnail', 'Project', 'User')
        ORDER BY tablename, attname;
      `;

      console.log('📈 Index usage statistics:', indexUsage);
    }

    // Check table sizes
    const thumbnailCount = await prisma.thumbnail.count();
    const projectCount = await prisma.project.count();
    const userCount = await prisma.user.count();

    console.log('📊 Table statistics:');
    console.log(`  - Thumbnails: ${thumbnailCount.toLocaleString()}`);
    console.log(`  - Projects: ${projectCount.toLocaleString()}`);
    console.log(`  - Users: ${userCount.toLocaleString()}`);

    // Performance recommendations
    console.log('\n💡 Performance Recommendations:');
    
    if (thumbnailCount > 10000) {
      console.log('  - Consider implementing pagination for thumbnail listings');
      console.log('  - Enable database connection pooling');
    }

    if (projectCount > 1000) {
      console.log('  - Consider archiving old inactive projects');
    }

    console.log('  - Ensure Redis caching is properly configured');
    console.log('  - Monitor query performance regularly');
    console.log('  - Consider read replicas for high-traffic applications');

  } catch (error) {
    console.error('❌ Performance check failed:', error);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'optimize':
      await optimizeDatabase();
      break;
    case 'check':
      await checkPerformance();
      break;
    default:
      console.log('Usage:');
      console.log('  npm run db:optimize - Create database indexes');
      console.log('  npm run db:check - Check database performance');
      console.log('');
      console.log('Or run directly:');
      console.log('  npx ts-node src/scripts/optimize-database.ts optimize');
      console.log('  npx ts-node src/scripts/optimize-database.ts check');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { optimizeDatabase, checkPerformance };