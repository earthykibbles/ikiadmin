import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    // Check if any users exist in the database
    const users = await db.select().from(user).limit(1);
    const hasUsers = users.length > 0;
    
    return NextResponse.json({ hasUsers });
  } catch (error: any) {
    console.error('Error checking users:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check users', hasUsers: false },
      { status: 500 }
    );
  }
}

