import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { user, account } from '@/lib/db/schema';
import { nanoid } from 'nanoid';
import { hash } from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated and is superadmin
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is superadmin (you should verify this from the database)
    const currentUser = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, session.user.id),
    });

    if (currentUser?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, password, name, role } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create user
    const userId = nanoid();
    const hashedPassword = await hash(password, 10);

    await db.transaction(async (tx) => {
      // Create user
      await tx.insert(user).values({
        id: userId,
        email,
        name,
        role: role || 'admin',
        emailVerified: true, // Admin accounts are pre-verified
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create account with password
      await tx.insert(account).values({
        id: nanoid(),
        accountId: email,
        providerId: 'credential',
        userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully',
      userId,
    });
  } catch (error: any) {
    console.error('Error creating admin:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create admin account' },
      { status: 500 }
    );
  }
}

