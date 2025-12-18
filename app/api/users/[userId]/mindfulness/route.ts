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

    const authCheck = await requirePermission(request, RESOURCE_TYPES.MINDFULNESS, 'read', userId);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    initFirebase();
    const db = admin.firestore();

    // Fetch user mindfulness stats
    const statsDoc = await db
      .collection('users')
      .doc(userId)
      .collection('mindfulness')
      .doc('stats')
      .get();

    const stats = statsDoc.exists
      ? {
          totalSessions: statsDoc.data()?.totalSessions || 0,
          totalMinutes: statsDoc.data()?.totalMinutes || 0,
          currentStreak: statsDoc.data()?.currentStreak || 0,
          longestStreak: statsDoc.data()?.longestStreak || 0,
          lastSessionDate: statsDoc.data()?.lastSessionDate?.toDate?.()?.toISOString() || null,
          favoriteCategory: statsDoc.data()?.favoriteCategory || null,
        }
      : null;

    // Fetch user mindfulness history
    const historySnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('mindfulness')
      .doc('data')
      .collection('history')
      .orderBy('completedAt', 'desc')
      .limit(100)
      .get();

    const history = historySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        exerciseId: data.exerciseId || '',
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
        duration: data.duration || 0,
        rating: data.rating || null,
      };
    });

    // Fetch user favorites
    const favoritesSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('mindfulness')
      .doc('data')
      .collection('favorites')
      .limit(50)
      .get();

    const favorites = favoritesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        exerciseId: data.exerciseId || doc.id,
        addedAt: data.addedAt?.toDate?.()?.toISOString() || null,
      };
    });

    // Fetch all mindfulness exercises (for reference)
    const exercisesSnapshot = await db
      .collection('mindfulness_exercises')
      .where('isActive', '==', true)
      .limit(50)
      .get();

    const exercises = exercisesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        artist: data.artist || '',
        soundcloudUrl: data.soundcloudUrl || null,
        videoUrl: data.videoUrl || null,
        durationMinutes: data.durationMinutes || 0,
        imageUrl: data.imageUrl || '',
        thumbnailUrl: data.thumbnailUrl || null,
        category: data.category || '',
        tags: data.tags || [],
        difficulty: data.difficulty || 'beginner',
        featured: data.featured || false,
        popular: data.popular || false,
        playCount: data.playCount || 0,
        rating: data.rating || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    // Calculate summary
    const summary = {
      hasStats: stats !== null,
      totalSessions: stats?.totalSessions || 0,
      totalMinutes: stats?.totalMinutes || 0,
      currentStreak: stats?.currentStreak || 0,
      longestStreak: stats?.longestStreak || 0,
      totalHistoryEntries: history.length,
      totalFavorites: favorites.length,
      totalExercises: exercises.length,
      recentSessionsCount: history.filter((h) => {
        if (!h.completedAt) return false;
        const sessionDate = new Date(h.completedAt);
        const today = new Date();
        return sessionDate.toDateString() === today.toDateString();
      }).length,
    };

    return NextResponse.json({
      stats,
      history,
      favorites,
      exercises,
      summary,
    });
  } catch (error: unknown) {
    console.error('Error fetching mindfulness data:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch mindfulness data', details },
      { status: 500 }
    );
  }
}
