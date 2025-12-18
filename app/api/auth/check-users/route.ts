import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if any users exist in the database
    const users = await db.select().from(user).limit(1);
    const hasUsers = users.length > 0;

    return NextResponse.json({ hasUsers });
  } catch (error: unknown) {
    console.error('Error checking users:', error);
    const message = error instanceof Error ? error.message : 'Failed to check users';
    return NextResponse.json({ error: message, hasUsers: false }, { status: 500 });
  }
}
