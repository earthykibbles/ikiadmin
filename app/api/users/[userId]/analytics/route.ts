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

    const authCheck = await requirePermission(request, RESOURCE_TYPES.ANALYTICS, 'read', userId);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    initFirebase();
    const db = admin.firestore();

    // Calculate date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Parallelize all data fetching
    const [moodsData, waterData, nutritionData, financeData] = await Promise.all([
      // Fetch moods (last 30 days only)
      (async () => {
        try {
          const moodsSnapshot = await db
            .collection('users')
            .doc(userId)
            .collection('moods')
            .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .orderBy('createdAt', 'desc')
            .limit(500)
            .get();

          const moods = moodsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              moodEmoji: data.moodEmoji || '',
              intensity: data.intensity || 0,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
            };
          });

          const moodDistribution: { [key: string]: number } = {};
          const moodIntensities: number[] = [];
          const moodsByDate: { [key: string]: number } = {};

          moods.forEach((mood) => {
            if (mood.moodEmoji) {
              moodDistribution[mood.moodEmoji] = (moodDistribution[mood.moodEmoji] || 0) + 1;
            }
            if (mood.intensity) {
              moodIntensities.push(mood.intensity);
            }
            if (mood.createdAt) {
              const date = mood.createdAt.split('T')[0];
              moodsByDate[date] = (moodsByDate[date] || 0) + 1;
            }
          });

          return {
            moods,
            moodDistribution,
            moodIntensities,
            moodsByDate,
          };
        } catch (err) {
          return { moods: [], moodDistribution: {}, moodIntensities: [], moodsByDate: {} };
        }
      })(),

      // Fetch water (last 7 days only)
      (async () => {
        try {
          const waterLogsSnapshot = await db
            .collection('water_logs')
            .doc(userId)
            .collection('logs')
            .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
            .orderBy('timestamp', 'desc')
            .limit(200)
            .get();

          const waterLogs = waterLogsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              amountMl: data.amountMl || 0,
              timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
            };
          });

          const waterByDate: { [key: string]: { total: number; count: number } } = {};
          let totalWaterMl = 0;

          waterLogs.forEach((log) => {
            totalWaterMl += log.amountMl || 0;
            if (log.timestamp) {
              const date = log.timestamp.split('T')[0];
              if (!waterByDate[date]) {
                waterByDate[date] = { total: 0, count: 0 };
              }
              waterByDate[date].total += log.amountMl || 0;
              waterByDate[date].count += 1;
            }
          });

          return { waterLogs, waterByDate, totalWaterMl };
        } catch (err) {
          return { waterLogs: [], waterByDate: {}, totalWaterMl: 0 };
        }
      })(),

      // Fetch nutrition (last 7 days only, optimized with parallel queries)
      (async () => {
        try {
          // Get date strings for last 7 days
          const dateStrings: string[] = [];
          for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            dateStrings.push(date.toISOString().split('T')[0]);
          }

          // Fetch all dates in parallel
          const nutritionQueries = dateStrings.map(
            (dateStr) =>
              db
                .collection('meals')
                .doc(userId)
                .collection('dates')
                .doc(dateStr)
                .collection('foods')
                .get()
                .catch(() => ({ docs: [] })) // Handle missing dates gracefully
          );

          const nutritionResults = await Promise.all(nutritionQueries);

          const caloriesByDate: { [key: string]: { total: number; count: number } } = {};
          const macroTotals = { protein: 0, carbs: 0, fats: 0, calories: 0 };
          let totalMeals = 0;

          nutritionResults.forEach((snapshot, index) => {
            const dateStr = dateStrings[index];
            snapshot.docs.forEach((foodDoc) => {
              const data = foodDoc.data();
              totalMeals++;

              const calories = data.calories || 0;
              const protein = data.protein || 0;
              const carbs = data.carbs || 0;
              const fats = data.fats || 0;

              macroTotals.calories += calories;
              macroTotals.protein += protein;
              macroTotals.carbs += carbs;
              macroTotals.fats += fats;

              if (!caloriesByDate[dateStr]) {
                caloriesByDate[dateStr] = { total: 0, count: 0 };
              }
              caloriesByDate[dateStr].total += calories;
              caloriesByDate[dateStr].count += 1;
            });
          });

          return { caloriesByDate, macroTotals, totalMeals };
        } catch (err) {
          return {
            caloriesByDate: {},
            macroTotals: { protein: 0, carbs: 0, fats: 0, calories: 0 },
            totalMeals: 0,
          };
        }
      })(),

      // Fetch finance data
      (async () => {
        try {
          const [budgetsSnapshot, debtsSnapshot, goalsSnapshot] = await Promise.all([
            db.collection('users').doc(userId).collection('budgets').get(),
            db.collection('users').doc(userId).collection('debts').get(),
            db.collection('users').doc(userId).collection('goals').get(),
          ]);

          let totalBudgets = 0;
          let totalDebts = 0;
          let totalGoals = 0;
          let totalIncome = 0;
          let totalExpenses = 0;

          budgetsSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            totalBudgets++;
            totalIncome += data.income || 0;
            totalExpenses += data.expenses || 0;
          });

          debtsSnapshot.docs.forEach(() => {
            totalDebts++;
          });

          goalsSnapshot.docs.forEach(() => {
            totalGoals++;
          });

          return {
            totalBudgets,
            totalDebts,
            totalGoals,
            totalIncome,
            totalExpenses,
          };
        } catch (err) {
          return {
            totalBudgets: 0,
            totalDebts: 0,
            totalGoals: 0,
            totalIncome: 0,
            totalExpenses: 0,
          };
        }
      })(),
    ]);

    // Format data for charts
    const moodData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      moodData.push({
        date: dateStr,
        count: moodsData.moodsByDate[dateStr] || 0,
      });
    }

    const formattedWaterData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = waterData.waterByDate[dateStr] || { total: 0, count: 0 };
      formattedWaterData.push({
        date: dateStr,
        totalLiters: (dayData.total / 1000).toFixed(2),
        averageMl: dayData.count > 0 ? (dayData.total / dayData.count).toFixed(0) : 0,
        logCount: dayData.count,
      });
    }

    const caloriesData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = nutritionData.caloriesByDate[dateStr] || { total: 0, count: 0 };
      caloriesData.push({
        date: dateStr,
        total: Math.round(dayData.total),
        average: dayData.count > 0 ? Math.round(dayData.total / dayData.count) : 0,
        mealCount: dayData.count,
      });
    }

    const averageMoodIntensity =
      moodsData.moodIntensities.length > 0
        ? moodsData.moodIntensities.reduce((sum, val) => sum + val, 0) /
          moodsData.moodIntensities.length
        : 0;

    const averageWaterMl =
      waterData.waterLogs.length > 0 ? waterData.totalWaterMl / waterData.waterLogs.length : 0;
    const uniqueWaterDays = Object.keys(waterData.waterByDate).length;
    const averageDailyWaterMl =
      uniqueWaterDays > 0
        ? Object.values(waterData.waterByDate).reduce((sum, val) => sum + val.total, 0) /
          uniqueWaterDays
        : 0;

    const response = NextResponse.json({
      moods: {
        total: moodsData.moods.length,
        averageIntensity: averageMoodIntensity,
        distribution: Object.entries(moodsData.moodDistribution)
          .map(([emoji, count]) => ({ emoji, count }))
          .sort((a, b) => b.count - a.count),
        moodsByDate: moodData,
      },
      water: {
        totalLogs: waterData.waterLogs.length,
        totalLiters: waterData.totalWaterMl / 1000,
        averagePerLog: averageWaterMl,
        averageDaily: averageDailyWaterMl,
        waterByDate: formattedWaterData,
      },
      nutrition: {
        totalMeals: nutritionData.totalMeals,
        totalCalories: Math.round(nutritionData.macroTotals.calories),
        totalProtein: Math.round(nutritionData.macroTotals.protein),
        totalCarbs: Math.round(nutritionData.macroTotals.carbs),
        totalFats: Math.round(nutritionData.macroTotals.fats),
        caloriesByDate: caloriesData,
        macroTotals: {
          protein: Math.round(nutritionData.macroTotals.protein),
          carbs: Math.round(nutritionData.macroTotals.carbs),
          fats: Math.round(nutritionData.macroTotals.fats),
        },
      },
      finance: {
        totalBudgets: financeData.totalBudgets,
        totalDebts: financeData.totalDebts,
        totalGoals: financeData.totalGoals,
        totalIncome: financeData.totalIncome,
        totalExpenses: financeData.totalExpenses,
        netBalance: financeData.totalIncome - financeData.totalExpenses,
      },
    });

    // Add caching headers (5 minutes cache)
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return response;
  } catch (error: unknown) {
    console.error('Error fetching user analytics:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch user analytics', details }, { status: 500 });
  }
}
