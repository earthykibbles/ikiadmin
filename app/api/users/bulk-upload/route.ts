import { initFirebase } from '@/lib/firebase';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// Helper function to generate a random password
function generatePassword(length = 12): string {
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

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
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
    // RBAC check
    const authCheck = await requirePermission(request, RESOURCE_TYPES.USERS, 'write');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }

    // Read and parse CSV
    const csvContent = await file.text();
    let rows: any[];
    try {
      rows = parseCSV(csvContent);
    } catch (error: unknown) {
      return NextResponse.json(
        { error: `CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
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
            } catch (error: unknown) {
              const errorObj =
                error && typeof error === 'object' ? (error as { code?: string }) : null;
              if (errorObj?.code !== 'auth/user-not-found') {
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
              displayName:
                row.firstname && row.lastname
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
              age: row.age ? Number.parseInt(row.age) : null,
              activityLevel: row.activitylevel?.trim() || row.activity_level?.trim() || '',
              bodyWeightKg: row.bodyweightkg ? Number.parseFloat(row.bodyweightkg) : null,
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
            await firestore
              .collection('user_tags')
              .doc(firebaseUser.uid)
              .set({ initialize: 'start' });
            await firestore
              .collection('ob_questions')
              .doc(firebaseUser.uid)
              .set({ initialize: 'start' });

            results.success.push({
              email,
              userId: firebaseUser.uid,
              password,
            });
          } catch (error: unknown) {
            console.error(`Error creating user ${row.email}:`, error);
            const errorMsg = error instanceof Error ? error.message : 'Failed to create user';
            results.errors.push({
              email: row.email || 'unknown',
              error: errorMsg,
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
  } catch (error: unknown) {
    console.error('Error in bulk upload:', error);
    const message = error instanceof Error ? error.message : 'Failed to process bulk upload';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
