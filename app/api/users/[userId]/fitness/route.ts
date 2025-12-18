import { initFirebase } from '@/lib/firebase';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const authCheck = await requirePermission(request, RESOURCE_TYPES.FITNESS, 'read', userId);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    initFirebase();
    const db = admin.firestore();

    // Fetch fitness profile
    const profileDoc = await db.collection('users').doc(userId).get();
    const profileData = profileDoc.exists ? profileDoc.data() : null;

    const profile = profileData
      ? {
          userId: userId,
          username: profileData.username || 'User Name',
          bio: profileData.bio || 'Fitness Enthusiast',
          avatarInitial: profileData.avatarInitial || 'U',
          experienceLevel: profileData.experienceLevel || null,
          trainingLocation: profileData.trainingLocation || null,
          targetMuscle: profileData.targetMuscle || null,
          equipment: profileData.equipment || [],
          workoutFrequency: profileData.workoutFrequency || null,
          workoutDurationMinutes: profileData.workoutDurationMinutes || null,
          fitnessGoal: profileData.fitnessGoal || null,
          updatedAt: profileData.updatedAt?.toDate?.()?.toISOString() || null,
        }
      : null;

    // Fetch fitness onboarding data
    const onboardingDoc = await db
      .collection('users')
      .doc(userId)
      .collection('fitness')
      .doc('onboarding')
      .get();

    const onboarding = onboardingDoc.exists ? onboardingDoc.data() : null;

    // Fetch workouts/exercise sessions if they exist
    // Try different possible paths for workouts
    let workouts: any[] = [];
    try {
      // Try path: users/{userId}/fitness/data/workouts
      const workoutsSnapshot1 = await db
        .collection('users')
        .doc(userId)
        .collection('fitness')
        .doc('data')
        .collection('workouts')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      if (!workoutsSnapshot1.empty) {
        workouts = workoutsSnapshot1.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
            completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
          };
        });
      }
    } catch (e) {
      // Try alternative path: users/{userId}/outdoor_exercises (for outdoor workouts)
      try {
        const outdoorExercisesSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('outdoor_exercises')
          .orderBy('timestamp', 'desc')
          .limit(50)
          .get();

        workouts = outdoorExercisesSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt:
              data.timestamp?.toDate?.()?.toISOString() ||
              data.createdAt?.toDate?.()?.toISOString() ||
              null,
            completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
          };
        });
      } catch (e2) {
        // No workouts found, leave as empty array
        console.log('No workouts found for user:', userId);
      }
    }

    // Calculate summary
    const summary = {
      hasProfile: profile !== null,
      hasOnboarding: onboarding !== null,
      onboardingComplete: onboarding?.complete || false,
      totalWorkouts: workouts.length,
      fitnessGoal: profile?.fitnessGoal || onboarding?.fitnessGoal || null,
      experienceLevel: profile?.experienceLevel || onboarding?.fitnessLevel || null,
      workoutFrequency: profile?.workoutFrequency || onboarding?.workoutFrequency || null,
    };

    return NextResponse.json({
      profile,
      onboarding,
      workouts,
      summary,
    });
  } catch (error: unknown) {
    console.error('Error fetching fitness data:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch fitness data', details }, { status: 500 });
  }
}
