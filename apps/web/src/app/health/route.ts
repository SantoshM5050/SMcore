import { NextResponse } from 'next/server';
import { GET as apiHealthGET, HEAD as apiHealthHEAD } from '../api/health/route';

export const dynamic = 'force-dynamic';

export async function GET() {
  return apiHealthGET();
}

export async function HEAD() {
  return apiHealthHEAD();
}
