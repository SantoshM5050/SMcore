import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let schemaPath = path.resolve(process.cwd(), '../../packages/database/prisma/schema.prisma');
    
    // Check fallback paths for Vercel deployment structure
    const fs = require('fs');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.resolve(process.cwd(), 'packages/database/prisma/schema.prisma');
    }
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.resolve(process.cwd(), '../database/prisma/schema.prisma');
    }

    console.log('[DB Push API] Resolved Schema path:', schemaPath);

    const output = execSync(`npx prisma db push --schema="${schemaPath}" --accept-data-loss`, {
      encoding: 'utf-8',
      env: { ...process.env },
    });

    return NextResponse.json({
      success: true,
      message: 'Database schema successfully pushed and synced with production PostgreSQL!',
      output,
    });
  } catch (err: any) {
    console.error('[DB Push API Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || String(err),
        stdout: err.stdout?.toString(),
        stderr: err.stderr?.toString(),
      },
      { status: 500 }
    );
  }
}
