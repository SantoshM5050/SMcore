const { execSync } = require('child_process');

try {
  console.log('[DB Sync] Generating Prisma client...');
  execSync('npx prisma generate --schema=packages/database/prisma/schema.prisma', { stdio: 'inherit' });

  if (process.env.DATABASE_URL) {
    console.log('[DB Sync] Syncing production database schema (prisma db push)...');
    execSync('npx prisma db push --schema=packages/database/prisma/schema.prisma --accept-data-loss', { stdio: 'inherit' });
    console.log('[DB Sync] Production database schema successfully updated and synced!');
  } else {
    console.log('[DB Sync] DATABASE_URL not set in environment. Skipping database push.');
  }
} catch (err) {
  console.warn('[DB Sync] Database sync warning (non-fatal):', err.message);
}
