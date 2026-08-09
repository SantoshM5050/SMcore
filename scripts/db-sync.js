const { execSync } = require('child_process');
const path = require('path');

try {
  const schemaPath = path.resolve(__dirname, '../packages/database/prisma/schema.prisma');
  console.log(`[DB Sync] Generating Prisma client with schema: ${schemaPath}...`);
  execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: 'inherit' });
  console.log('[DB Sync] Prisma client successfully generated!');
} catch (err) {
  console.warn('[DB Sync] Database sync warning (non-fatal):', err.message);
}
