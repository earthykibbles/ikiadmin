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

// Helper function to generate a random password
function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Helper function to parse CSV content
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) {
      throw new Error(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
    }

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'CSV file is required' },
        { status: 400 }
      );
    }

    // Read and parse CSV
    const csvContent = await file.text();
    let rows: any[];
    try {
      rows = parseCSV(csvContent);
    } catch (error: any) {
      return NextResponse.json(
        { error: `CSV parsing error: ${error.message}` },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    // Initialize Firebase
    initFirebase();
    const firebaseAuth = admin.auth();
    const firestore = admin.firestore();

    const results = {
      success: [] as Array<{ email: string; userId: string; password: string }>,
      errors: [] as Array<{ email: string; error: string }>,
    };

    // Process users in batches to avoid overwhelming Firebase
    const batchSize = 10;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (row) => {
          try {
            const email = row.email?.trim();
            if (!email) {
              results.errors.push({ email: email || 'unknown', error: 'Email is required' });
              return;
            }

            // Check if user already exists
            try {
              await firebaseAuth.getUserByEmail(email);
              results.errors.push({ email, error: 'User already exists' });
              return;
            } catch (error: any) {
              if (error.code !== 'auth/user-not-found') {
                throw error;
              }
            }

            // Generate password if not provided
            const password = row.password?.trim() || generatePassword();

            // Create user in Firebase Auth
            const firebaseUser = await firebaseAuth.createUser({
              email,
              password,
              emailVerified: false,
              displayName: row.firstname && row.lastname 
                ? `${row.firstname} ${row.lastname}` 
                : row.firstname || row.username || undefined,
            });

            // Prepare user data
            const trimmedUsername = row.username?.trim() || '';
            const normalizedUsername = trimmedUsername.toLowerCase();

            const userData: any = {
              firstname: row.firstname?.trim() || '',
              lastname: row.lastname?.trim() || '',
              phone: row.phone?.trim() || '',
              username: trimmedUsername,
              usernameLowercase: normalizedUsername,
              email: email,
              time: admin.firestore.FieldValue.serverTimestamp(),
              id: firebaseUser.uid,
              bio: '',
              country: row.country?.trim() || '',
              photoUrl: '',
              gender: row.gender?.trim() || '',
              birthday: row.birthday?.trim() || '',
              points: 0,
              age: row.age ? parseInt(row.age) : null,
              activityLevel: row.activitylevel?.trim() || row.activity_level?.trim() || '',
              bodyWeightKg: row.bodyweightkg ? parseFloat(row.bodyweightkg) : null,
              health_stats: [
                { id: 'quarterly_wellness', name: 'Quarterly Wellness', value: 0 },
                { id: 'prevention_wellness', name: 'Prevention Wellness', value: 0 },
                { id: 'nutritional_wellness', name: 'Nutritional Wellness', value: 0 },
                { id: 'mental_wellness', name: 'Mental Wellness', value: 0 },
                { id: 'physical_wellness', name: 'Physical Wellness', value: 0 },
                { id: 'financial_wellness', name: 'Financial Wellness', value: 0 },
              ],
              onboardingCompleted: false,
              onboardingData: null,
            };

            // Create user document in Firestore
            await firestore.collection('users').doc(firebaseUser.uid).set(userData);

            // Initialize user tags and onboarding questions
            await firestore.collection('user_tags').doc(firebaseUser.uid).set({ initialize: 'start' });
            await firestore.collection('ob_questions').doc(firebaseUser.uid).set({ initialize: 'start' });

            results.success.push({
              email,
              userId: firebaseUser.uid,
              password,
            });
          } catch (error: any) {
            console.error(`Error creating user ${row.email}:`, error);
            results.errors.push({
              email: row.email || 'unknown',
              error: error.message || 'Failed to create user',
            });
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${rows.length} users`,
      created: results.success.length,
      failed: results.errors.length,
      results: {
        successful: results.success,
        errors: results.errors,
      },
    });
  } catch (error: any) {
    console.error('Error in bulk upload:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process bulk upload' },
      { status: 500 }
    );
  }
}

