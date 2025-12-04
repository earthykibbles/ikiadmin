import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { user as adminUser } from '@/lib/db/schema';
import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';

// Helper function to check if user is admin or superadmin
async function checkAdminAccess(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session?.user) {
    return { authorized: false, error: 'Unauthorized' };
  }

  const currentUser = await db.query.user.findFirst({
    where: (users, { eq }) => eq(users.id, session.user.id),
  });

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
    return { authorized: false, error: 'Forbidden' };
  }

  return { authorized: true, user: currentUser };
}

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess(request);
    if (!accessCheck.authorized) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const body = await request.json();
    const { 
      email, 
      password, 
      firstname, 
      lastname, 
      username, 
      phone, 
      country, 
      gender, 
      birthday,
      age,
      activityLevel,
      bodyWeightKg
    } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Initialize Firebase
    initFirebase();
    const firebaseAuth = admin.auth();
    const firestore = admin.firestore();

    // Check if user already exists in Firebase Auth
    let firebaseUser;
    try {
      firebaseUser = await firebaseAuth.getUserByEmail(email);
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    } catch (error: any) {
      // User doesn't exist, which is what we want
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create user in Firebase Auth
    firebaseUser = await firebaseAuth.createUser({
      email,
      password,
      emailVerified: false, // Let them verify on first login
      displayName: firstname && lastname ? `${firstname} ${lastname}` : firstname || username || undefined,
    });

    // Prepare user data for Firestore
    const trimmedUsername = username?.trim() || '';
    const normalizedUsername = trimmedUsername.toLowerCase();
    
    const userData: any = {
      firstname: firstname || '',
      lastname: lastname || '',
      phone: phone || '',
      username: trimmedUsername,
      usernameLowercase: normalizedUsername,
      email: email,
      time: admin.firestore.FieldValue.serverTimestamp(),
      id: firebaseUser.uid,
      bio: '',
      country: country || '',
      photoUrl: '',
      gender: gender || '',
      birthday: birthday || '',
      points: 0,
      age: age || null,
      activityLevel: activityLevel || '',
      bodyWeightKg: bodyWeightKg || null,
      health_stats: [
        { id: 'quarterly_wellness', name: 'Quarterly Wellness', value: 0 },
        { id: 'prevention_wellness', name: 'Prevention Wellness', value: 0 },
        { id: 'nutritional_wellness', name: 'Nutritional Wellness', value: 0 },
        { id: 'mental_wellness', name: 'Mental Wellness', value: 0 },
        { id: 'physical_wellness', name: 'Physical Wellness', value: 0 },
        { id: 'financial_wellness', name: 'Financial Wellness', value: 0 },
      ],
      // Don't mark onboarding as complete - let them continue onboarding on login
      onboardingCompleted: false,
      onboardingData: null,
    };

    // Create user document in Firestore
    await firestore.collection('users').doc(firebaseUser.uid).set(userData);

    // Initialize user tags and onboarding questions
    await firestore.collection('user_tags').doc(firebaseUser.uid).set({ initialize: 'start' });
    await firestore.collection('ob_questions').doc(firebaseUser.uid).set({ initialize: 'start' });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      userId: firebaseUser.uid,
      email: firebaseUser.email,
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Handle Firebase Auth errors
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    if (error.code === 'auth/weak-password') {
      return NextResponse.json(
        { error: 'Password is too weak' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}

