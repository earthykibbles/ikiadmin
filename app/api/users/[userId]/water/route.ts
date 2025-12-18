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

    const authCheck = await requirePermission(request, RESOURCE_TYPES.WATER, 'read', userId);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    initFirebase();
    const db = admin.firestore();

    // Fetch water logs
    const waterLogsSnapshot = await db
      .collection('water_logs')
      .doc(userId)
      .collection('logs')
      .orderBy('timestamp', 'desc')
      .limit(200)
      .get();

    const waterLogs = waterLogsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        amountMl: data.amountMl || 0,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
        weather: data.weather || null,
        location: data.location || null,
        activityLevel: data.activityLevel || null,
        bodyWeightKg: data.bodyWeightKg || null,
        age: data.age || null,
        gender: data.gender || null,
      };
    });

    // Calculate daily totals
    const dailyTotals: { [key: string]: number } = {};
    waterLogs.forEach((log) => {
      if (log.timestamp) {
        const date = new Date(log.timestamp).toISOString().split('T')[0];
        dailyTotals[date] = (dailyTotals[date] || 0) + (log.amountMl || 0);
      }
    });

    // Calculate summary
    const totalIntake = waterLogs.reduce((sum, log) => sum + (log.amountMl || 0), 0);
    const averageDailyIntake =
      Object.keys(dailyTotals).length > 0
        ? Object.values(dailyTotals).reduce((sum, val) => sum + val, 0) /
          Object.keys(dailyTotals).length
        : 0;

    // Get today's intake
    const today = new Date().toISOString().split('T')[0];
    const todayIntake = dailyTotals[today] || 0;

    // Get recent logs (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLogs = waterLogs.filter((log) => {
      if (!log.timestamp) return false;
      const logDate = new Date(log.timestamp);
      return logDate >= sevenDaysAgo;
    });

    const summary = {
      totalLogs: waterLogs.length,
      totalIntakeMl: totalIntake,
      totalIntakeL: totalIntake / 1000,
      averageDailyIntakeMl: averageDailyIntake,
      averageDailyIntakeL: averageDailyIntake / 1000,
      todayIntakeMl: todayIntake,
      todayIntakeL: todayIntake / 1000,
      uniqueDays: Object.keys(dailyTotals).length,
      recentLogsCount: recentLogs.length,
    };

    return NextResponse.json({
      waterLogs,
      dailyTotals,
      summary,
    });
  } catch (error: unknown) {
    console.error('Error fetching water data:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch water data', details }, { status: 500 });
  }
}
