import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// GET list all available dates in explore_landings
export async function GET(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const snapshot = await db.collection('explore_landings').get();

    const dates = snapshot.docs
      .map((doc) => ({
        dateId: doc.id,
        exists: doc.exists,
        videoCount: (doc.data()?.videos || []).length,
      }))
      .sort((a, b) => b.dateId.localeCompare(a.dateId)); // Sort descending (newest first)

    return NextResponse.json({
      dates,
      total: dates.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching explore dates:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch explore dates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
