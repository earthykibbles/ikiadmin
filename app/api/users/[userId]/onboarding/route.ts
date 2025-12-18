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

    const authCheck = await requirePermission(request, RESOURCE_TYPES.ONBOARDING, 'read', userId);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    initFirebase();
    const db = admin.firestore();

    // Fetch main app onboarding (enhanced_details)
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    const mainOnboarding = userData
      ? {
          firstName: userData.firstname || userData.firstName || null,
          lastName: userData.lastname || userData.lastName || null,
          username: userData.username || null,
          gender: userData.gender || null,
          age: userData.age || null,
          country: userData.country || null,
          bodyWeightKg: userData.bodyWeightKg || userData.weight || null,
          heightCm: userData.heightCm || userData.height || null,
          activityLevel: userData.activityLevel || null,
          facet: userData.facet || null,
          photoUrl: userData.photoUrl || null,
          email: userData.email || null,
          phone: userData.phone || null,
          birthday: userData.birthday || null,
        }
      : null;

    // Fetch fitness onboarding
    const fitnessOnboardingDoc = await db
      .collection('users')
      .doc(userId)
      .collection('fitness')
      .doc('onboarding')
      .get();

    const fitnessOnboarding = fitnessOnboardingDoc.exists
      ? {
          ...fitnessOnboardingDoc.data(),
          completedAt: fitnessOnboardingDoc.data()?.completedAt?.toDate?.()?.toISOString() || null,
          updatedAt: fitnessOnboardingDoc.data()?.updatedAt?.toDate?.()?.toISOString() || null,
        }
      : null;

    // Fetch nutrition onboarding
    const nutritionOnboardingDoc = await db
      .collection('users')
      .doc(userId)
      .collection('nutrition')
      .doc('onboarding')
      .get();

    const nutritionOnboarding = nutritionOnboardingDoc.exists
      ? {
          ...nutritionOnboardingDoc.data(),
          completedAt:
            nutritionOnboardingDoc.data()?.completedAt?.toDate?.()?.toISOString() || null,
        }
      : null;

    // Fetch wellsphere onboarding
    const wellsphereProfileDoc = await db.collection('wellsphere_profiles').doc(userId).get();

    const wellsphereOnboarding = wellsphereProfileDoc.exists
      ? {
          ...wellsphereProfileDoc.data(),
          createdAt: wellsphereProfileDoc.data()?.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: wellsphereProfileDoc.data()?.updatedAt?.toDate?.()?.toISOString() || null,
        }
      : null;

    // Fetch wellsphere onboarding questions if they exist in a separate collection
    const wellsphereOnboardingQuestionsDoc = await db
      .collection('users')
      .doc(userId)
      .collection('wellsphere')
      .doc('onboarding')
      .get();

    const wellsphereOnboardingQuestions = wellsphereOnboardingQuestionsDoc.exists
      ? wellsphereOnboardingQuestionsDoc.data()
      : null;

    // Fetch onboardingData from users collection (contains enhanced_questions, enhanced_interests, enhanced_medical)
    const onboardingData = userData?.onboardingData || null;

    // Fetch userTags collection (interests)
    const userTagsDoc = await db.collection('userTags').doc(userId).get();
    const userTags = userTagsDoc.exists ? userTagsDoc.data() : null;

    // Fetch obQuestions collection
    const obQuestionsDoc = await db.collection('obQuestions').doc(userId).get();
    const obQuestions = obQuestionsDoc.exists ? obQuestionsDoc.data() : null;

    // Extract enhanced page data from onboardingData
    const enhancedQuestions = onboardingData?.questionAnswers || null;
    const enhancedInterests = onboardingData?.interests || null;
    const enhancedMedical =
      onboardingData?.hasMedicalCondition !== undefined
        ? {
            hasMedicalCondition: onboardingData.hasMedicalCondition,
            medicalCondition: onboardingData.medicalCondition || null,
            medicalDetails: onboardingData.medicalDetails || null,
          }
        : null;

    // Fetch security setup data from onboardingData
    const enhancedSecurity =
      onboardingData?.biometricEnabled !== undefined
        ? {
            biometricEnabled: onboardingData.biometricEnabled || false,
            pinEnabled: onboardingData.pinEnabled || false,
            pinSetAt: onboardingData.pinSetAt || null,
          }
        : null;

    // Calculate summary
    const summary = {
      hasMainOnboarding: mainOnboarding !== null,
      hasFitnessOnboarding: fitnessOnboarding !== null,
      fitnessOnboardingComplete: !!fitnessOnboarding?.completedAt,
      hasNutritionOnboarding: nutritionOnboarding !== null,
      nutritionOnboardingComplete: !!nutritionOnboarding?.completedAt,
      hasWellsphereOnboarding:
        wellsphereOnboarding !== null || wellsphereOnboardingQuestions !== null,
      hasEnhancedQuestions: enhancedQuestions !== null,
      hasEnhancedInterests: enhancedInterests !== null || userTags !== null,
      hasEnhancedMedical: enhancedMedical !== null,
      hasEnhancedSecurity: enhancedSecurity !== null,
      totalOnboardingCompleted: [
        mainOnboarding,
        fitnessOnboarding?.completedAt && fitnessOnboarding,
        nutritionOnboarding?.completedAt && nutritionOnboarding,
        (wellsphereOnboarding || wellsphereOnboardingQuestions) && {
          complete: true,
        },
        enhancedQuestions && { complete: true },
        (enhancedInterests || userTags) && { complete: true },
        enhancedMedical && { complete: true },
        enhancedSecurity && { complete: true },
      ].filter(Boolean).length,
    };

    return NextResponse.json({
      mainOnboarding,
      fitnessOnboarding,
      nutritionOnboarding,
      wellsphereOnboarding: wellsphereOnboarding || wellsphereOnboardingQuestions,
      enhancedQuestions,
      enhancedInterests,
      enhancedMedical,
      enhancedSecurity,
      userTags,
      obQuestions,
      onboardingData: onboardingData || null,
      summary,
    });
  } catch (error: unknown) {
    console.error('Error fetching onboarding data:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch onboarding data', details },
      { status: 500 }
    );
  }
}
