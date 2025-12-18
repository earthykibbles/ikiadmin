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

    const authCheck = await requirePermission(request, RESOURCE_TYPES.MOOD, 'read', userId);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    initFirebase();
    const db = admin.firestore();

    // Fetch mood entries
    const moodsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('moods')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const moods = moodsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        moodEmoji: data.moodEmoji || '',
        intensity: data.intensity || 0,
        valence: data.valence || 0,
        scaledMoodIndex: data.scaledMoodIndex || 0,
        notes: data.notes || null,
        createdAt: data.createdAt || null,
        timestamp: data.createdAt || null,
      };
    });

    // Fetch gratitude entries
    const gratitudeEntriesSnapshot = await db
      .collection('gratitude')
      .doc(userId)
      .collection('entries')
      .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
      .limit(100)
      .get();

    const gratitudeEntries: any[] = [];
    for (const doc of gratitudeEntriesSnapshot.docs) {
      const data = doc.data();
      // Gratitude entries can be stored as an array in the document or as individual documents
      if (data.entries && Array.isArray(data.entries)) {
        for (const entry of data.entries) {
          gratitudeEntries.push({
            id: entry.id || doc.id,
            text: entry.text || '',
            timestamp: entry.timestamp?.toDate?.()?.toISOString() || doc.id,
          });
        }
      } else {
        // If it's a single entry document
        gratitudeEntries.push({
          id: doc.id,
          text: data.text || '',
          timestamp: data.timestamp?.toDate?.()?.toISOString() || doc.id,
        });
      }
    }

    // Fetch journal entries
    const journalEntriesSnapshot = await db
      .collection('journals')
      .doc(userId)
      .collection('entries')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const journalEntries = journalEntriesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        content: data.content || '',
        mood: data.mood || null,
        tags: data.tags || [],
        createdAt: data.createdAt || null,
        activityId: data.activityId || null,
        activityType: data.activityType || null,
      };
    });

    // Calculate summary
    const summary = {
      totalMoods: moods.length,
      totalGratitudeEntries: gratitudeEntries.length,
      totalJournalEntries: journalEntries.length,
      recentMoodCount: moods.filter((m) => {
        if (!m.createdAt) return false;
        const moodDate =
          typeof m.createdAt === 'string' ? new Date(m.createdAt) : m.createdAt.toDate();
        const today = new Date();
        return moodDate.toDateString() === today.toDateString();
      }).length,
      averageMoodIntensity:
        moods.length > 0 ? moods.reduce((sum, m) => sum + (m.intensity || 0), 0) / moods.length : 0,
    };

    return NextResponse.json({
      moods,
      gratitudeEntries,
      journalEntries,
      summary,
    });
  } catch (error: unknown) {
    console.error('Error fetching mood data:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch mood data', details }, { status: 500 });
  }
}
