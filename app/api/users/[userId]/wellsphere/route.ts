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

    const authCheck = await requirePermission(request, RESOURCE_TYPES.WELLSPHERE, 'read', userId);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    initFirebase();
    const db = admin.firestore();

    // Fetch wellsphere profile (conditions, onboarding status)
    const wellsphereProfileDoc = await db.collection('wellsphere_profiles').doc(userId).get();

    let conditionName: string | null = null;
    let conditionData: any = null;
    let onboardingFinished = false;
    let onboardingData: any = null;

    if (wellsphereProfileDoc.exists) {
      const profileData = wellsphereProfileDoc.data();
      conditionName = profileData?.condition || null;
      onboardingFinished = profileData?.onboarding_finished || false;
      onboardingData = profileData || null;

      // Fetch condition details if condition exists
      if (conditionName) {
        const conditionDoc = await db.collection('wellsphere_conditions').doc(conditionName).get();

        if (conditionDoc.exists) {
          conditionData = conditionDoc.data();
        }
      }
    }

    // Fetch user drugs
    const drugsSnapshot = await db.collection('users').doc(userId).collection('drugs').get();

    const drugs = drugsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        drugName: data.drugName || '',
        drugStrength: data.drugStrength || '',
        drugId: data.drugId || '',
        dosage: data.dosage || '',
        timesPerDay: data.timesPerDay || 1,
        startDate: data.startDate?.toDate?.()?.toISOString() || null,
        endDate: data.endDate?.toDate?.()?.toISOString() || null,
        notes: data.notes || '',
        takenToday: data.takenToday || false,
        lastIntake: data.lastIntake?.toDate?.()?.toISOString() || null,
        scheduledTimes: data.scheduledTimes || [],
        frequency: data.frequency || null,
      };
    });

    // Fetch emergency contacts
    const emergencyContactsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('emergency_contacts')
      .get();

    const emergencyContacts = emergencyContactsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        phone: data.phone || '',
        relationship: data.relationship || 'Unknown',
      };
    });

    // Fetch medical info
    const medicalInfoDoc = await db
      .collection('users')
      .doc(userId)
      .collection('medical_info')
      .doc('profile')
      .get();

    let medicalInfo: any = null;
    if (medicalInfoDoc.exists) {
      const data = medicalInfoDoc.data();
      medicalInfo = {
        conditions: data?.conditions || [],
        allergies: data?.allergies || [],
        medications: data?.medications || [],
        bloodType: data?.bloodType || 'Unknown',
      };
    }

    // Fetch symptoms (if available) - correct path: symptoms/{userId}/entries
    const symptomsSnapshot = await db
      .collection('symptoms')
      .doc(userId)
      .collection('entries')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const symptoms = symptomsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        symptom: data.symptom || '',
        severity: data.severity || 1,
        notes: data.notes || '',
        tags: data.tags || [],
        timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
      };
    });

    // Fetch daily check-ins (if available) - path: dailycheckin/{userId}/dates
    const dailyCheckInsSnapshot = await db
      .collection('dailycheckin')
      .doc(userId)
      .collection('dates')
      .orderBy('date', 'desc')
      .limit(50)
      .get();

    const dailyCheckIns = dailyCheckInsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date?.toDate?.()?.toISOString() || null,
        sleepQuality: data.sleepQuality || '',
        energyLevel: data.energyLevel || 0,
        mood: data.mood || '',
        painLevel: data.painLevel || 0,
        medication: data.medication || '',
      };
    });

    return NextResponse.json({
      condition: conditionName,
      conditionData: conditionData?.data || null,
      onboardingFinished,
      onboardingData,
      drugs,
      emergencyContacts,
      medicalInfo,
      symptoms,
      dailyCheckIns,
      summary: {
        totalDrugs: drugs.length,
        totalEmergencyContacts: emergencyContacts.length,
        totalSymptoms: symptoms.length,
        totalDailyCheckIns: dailyCheckIns.length,
        hasCondition: !!conditionName,
        hasMedicalInfo: !!medicalInfo,
        onboardingComplete: onboardingFinished,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching wellsphere data:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch wellsphere data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
