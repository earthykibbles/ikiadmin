import { initFirebase } from '@/lib/firebase';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// GET user points data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const authCheck = await requirePermission(request, RESOURCE_TYPES.POINTS, 'read', userId);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    initFirebase();
    const db = admin.firestore();

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = userDoc.data()!;
    const pointsData = {
      totalPoints: data.totalPoints || 0,
      level: data.level || 1,
      earnedPoints: data.earnedPoints || {},
      pointsDailyTotals: data.pointsDailyTotals || {},
      pointsDailyCounters: data.pointsDailyCounters || {},
      lastPointsAwardedAt: data.lastPointsAwardedAt
        ? data.lastPointsAwardedAt.toDate
          ? data.lastPointsAwardedAt.toDate().toISOString()
          : data.lastPointsAwardedAt
        : null,
    };

    return NextResponse.json({ points: pointsData });
  } catch (error: unknown) {
    console.error('Error fetching points:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch points';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// UPDATE user points
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const authCheck = await requirePermission(request, RESOURCE_TYPES.POINTS, 'write', userId);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    initFirebase();
    const db = admin.firestore();

    const body = await request.json();
    const { totalPoints, level, earnedPoints, pointsDailyTotals } = body;

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (totalPoints !== undefined) {
      updateData.totalPoints = totalPoints;
      // Recalculate level if totalPoints changed
      if (level === undefined) {
        updateData.level = Math.floor(totalPoints / 100) + 1;
      }
    }

    if (level !== undefined) updateData.level = level;
    if (earnedPoints !== undefined) updateData.earnedPoints = earnedPoints;
    if (pointsDailyTotals !== undefined) updateData.pointsDailyTotals = pointsDailyTotals;

    await db.collection('users').doc(userId).update(updateData);

    return NextResponse.json({ success: true, message: 'Points updated successfully' });
  } catch (error: unknown) {
    console.error('Error updating points:', error);
    const message = error instanceof Error ? error.message : 'Failed to update points';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
