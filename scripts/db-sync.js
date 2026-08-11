const { execSync } = require('child_process');
const path = require('path');

try {
  const schemaPath = path.resolve(__dirname, '../packages/database/prisma/schema.prisma');
  console.log(`[DB Sync] Generating Prisma client with schema: ${schemaPath}...`);
  execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: 'inherit' });

  if (process.env.DATABASE_URL) {
    console.log('[DB Sync] Pushing Prisma schema changes to active database...');
    execSync(`npx prisma db push --skip-generate --schema="${schemaPath}"`, { stdio: 'inherit' });
  }

  console.log('[DB Sync] Prisma client & database sync completed successfully!');
} catch (err) {
  console.warn('[DB Sync] Database sync warning (non-fatal):', err.message);
}
