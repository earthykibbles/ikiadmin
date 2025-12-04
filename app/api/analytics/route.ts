import { NextRequest, NextResponse } from 'next/server';
import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { cache, createCacheKey } from '@/lib/cache';
import { analyticsRateLimiter, getClientId } from '@/lib/rateLimit';

// Route segment config for caching
export const revalidate = 300; // Revalidate every 5 minutes
export const dynamic = 'force-dynamic'; // Allow dynamic rendering but with cache

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientId(request);
    const rateLimit = analyticsRateLimiter.check(clientId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again after ${new Date(rateLimit.resetAt).toISOString()}`,
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // Check cache first
    const cacheKey = createCacheKey('analytics');
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'HIT',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      });
    }

    initFirebase();
    const db = admin.firestore();

    // Reduce initial user fetch to avoid quota issues
    const usersSnapshot = await db.collection('users').limit(100).get();
    const userIds = usersSnapshot.docs.map(doc => doc.id);

    // Aggregate user signups over time
    const signupsByDate: { [key: string]: number } = {};
    const activityLevels: { [key: string]: number } = {};
    const countries: { [key: string]: number } = {};
    let totalPoints = 0;
    let totalUsers = 0;
    let onlineUsers = 0;

    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      totalUsers++;

      // Signups by date
      if (data.time) {
        const signupDate = data.time.toDate().toISOString().split('T')[0];
        signupsByDate[signupDate] = (signupsByDate[signupDate] || 0) + 1;
      }

      // Activity levels
      const activityLevel = data.activityLevel || 'unknown';
      activityLevels[activityLevel] = (activityLevels[activityLevel] || 0) + 1;

      // Countries
      if (data.country) {
        countries[data.country] = (countries[data.country] || 0) + 1;
      }

      // Points
      totalPoints += data.points || 0;

      // Online users
      if (data.isOnline) {
        onlineUsers++;
      }
    });

    // Aggregate mood data across all users (reduced sample size)
    const moodDistribution: { [key: string]: number } = {};
    const moodIntensities: number[] = [];
    const moodsByDate: { [key: string]: number } = {};
    let totalMoods = 0;

    // Reduce to 20 users for mood data to avoid quota issues
    for (const userId of userIds.slice(0, 20)) {
      try {
        const moodsSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('moods')
          .limit(20) // Reduced from 50
          .get();

        moodsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          totalMoods++;
          
          const moodEmoji = data.moodEmoji || 'unknown';
          moodDistribution[moodEmoji] = (moodDistribution[moodEmoji] || 0) + 1;
          
          if (data.intensity) {
            moodIntensities.push(data.intensity);
          }

          if (data.createdAt) {
            const date = data.createdAt.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : new Date(data.createdAt).toISOString().split('T')[0];
            moodsByDate[date] = (moodsByDate[date] || 0) + 1;
          }
        });
      } catch (err) {
        // Skip if collection doesn't exist
        continue;
      }
    }

    // Aggregate water intake data (reduced sample size)
    const waterByDate: { [key: string]: { total: number; count: number } } = {};
    let totalWaterMl = 0;
    let totalWaterLogs = 0;

    // Reduce to 20 users for water data
    for (const userId of userIds.slice(0, 20)) {
      try {
        const waterSnapshot = await db
          .collection('water_logs')
          .doc(userId)
          .collection('logs')
          .limit(30) // Reduced from 100
          .get();

        waterSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          const amountMl = data.amountMl || 0;
          totalWaterMl += amountMl;
          totalWaterLogs++;

          if (data.timestamp) {
            const date = data.timestamp.toDate ? data.timestamp.toDate().toISOString().split('T')[0] : new Date(data.timestamp).toISOString().split('T')[0];
            if (!waterByDate[date]) {
              waterByDate[date] = { total: 0, count: 0 };
            }
            waterByDate[date].total += amountMl;
            waterByDate[date].count += 1;
          }
        });
      } catch (err) {
        continue;
      }
    }

    // Aggregate nutrition data (reduced sample size)
    const caloriesByDate: { [key: string]: { total: number; count: number } } = {};
    const macroTotals = { protein: 0, carbs: 0, fats: 0, calories: 0 };
    let totalMeals = 0;

    // Reduce to 20 users for nutrition data
    for (const userId of userIds.slice(0, 20)) {
      try {
        // Nutrition data is stored in meals/{userId}/dates/{date}/foods
        // Get dates (limited to reduce reads) and sort in memory
        const datesSnapshot = await db
          .collection('meals')
          .doc(userId)
          .collection('dates')
          .limit(30) // Limit to 30 date documents max per user
          .get();
        
        // Sort date documents by ID (date string) in descending order and limit to last 7 days
        const sortedDateDocs = datesSnapshot.docs
          .sort((a, b) => b.id.localeCompare(a.id))
          .slice(0, 7);

        for (const dateDoc of sortedDateDocs) {
          const dateKey = dateDoc.id;
          const foodsSnapshot = await db
            .collection('meals')
            .doc(userId)
            .collection('dates')
            .doc(dateKey)
            .collection('foods')
            .get();

          foodsSnapshot.docs.forEach((foodDoc) => {
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

            // Use dateKey or timestamp for date grouping
            const date = dateKey || (data.timestamp?.toDate ? data.timestamp.toDate().toISOString().split('T')[0] : new Date(data.timestamp).toISOString().split('T')[0]);
            if (date && date.length === 10) { // Ensure valid date format YYYY-MM-DD
              if (!caloriesByDate[date]) {
                caloriesByDate[date] = { total: 0, count: 0 };
              }
              caloriesByDate[date].total += calories;
              caloriesByDate[date].count += 1;
            }
          });
        }
      } catch (err) {
        continue;
      }
    }

    // Aggregate finance data (reduced sample size)
    let totalBudgets = 0;
    let totalDebts = 0;
    let totalGoals = 0;
    let totalIncome = 0;
    let totalExpenses = 0;
    let financeUsers = 0;

    // Reduce to 20 users for finance data
    for (const userId of userIds.slice(0, 20)) {
      try {
        const budgetsSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('budgets')
          .limit(10) // Limit budgets
          .get();
        
        const debtsSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('debts')
          .limit(10) // Limit debts
          .get();
        
        const goalsSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('goals')
          .limit(10) // Limit goals
          .get();

        if (budgetsSnapshot.size > 0 || debtsSnapshot.size > 0 || goalsSnapshot.size > 0) {
          financeUsers++;
        }

        budgetsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          totalBudgets++;
          totalIncome += data.income || 0;
          totalExpenses += data.expenses || 0;
        });

        debtsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          totalDebts++;
          totalIncome += data.amount || 0;
        });

        goalsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          totalGoals++;
        });
      } catch (err) {
        continue;
      }
    }

    // Format signups data for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const signupsData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      signupsData.push({
        date: dateStr,
        count: signupsByDate[dateStr] || 0,
      });
    }

    // Format water data for last 7 days
    const waterData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = waterByDate[dateStr] || { total: 0, count: 0 };
      waterData.push({
        date: dateStr,
        totalLiters: (dayData.total / 1000).toFixed(2),
        averageMl: dayData.count > 0 ? (dayData.total / dayData.count).toFixed(0) : 0,
        userCount: dayData.count,
      });
    }

    // Format mood data for last 7 days
    const moodData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      moodData.push({
        date: dateStr,
        count: moodsByDate[dateStr] || 0,
      });
    }

    // Format calories data for last 7 days
    const caloriesData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = caloriesByDate[dateStr] || { total: 0, count: 0 };
      caloriesData.push({
        date: dateStr,
        total: Math.round(dayData.total),
        average: dayData.count > 0 ? Math.round(dayData.total / dayData.count) : 0,
        mealCount: dayData.count,
      });
    }

    const averageMoodIntensity = moodIntensities.length > 0
      ? moodIntensities.reduce((sum, val) => sum + val, 0) / moodIntensities.length
      : 0;

    const averageWaterMl = totalWaterLogs > 0 ? totalWaterMl / totalWaterLogs : 0;
    const averageDailyWaterMl = Object.keys(waterByDate).length > 0
      ? Object.values(waterByDate).reduce((sum, val) => sum + val.total, 0) / Object.keys(waterByDate).length
      : 0;

    const responseData = {
      users: {
        total: totalUsers,
        online: onlineUsers,
        totalPoints,
        averagePoints: totalUsers > 0 ? totalPoints / totalUsers : 0,
        signupsByDate: signupsData,
        activityLevels: Object.entries(activityLevels).map(([level, count]) => ({ level, count })),
        topCountries: Object.entries(countries)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([country, count]) => ({ country, count })),
      },
      moods: {
        total: totalMoods,
        averageIntensity: averageMoodIntensity,
        distribution: Object.entries(moodDistribution).map(([emoji, count]) => ({ emoji, count })),
        moodsByDate: moodData,
      },
      water: {
        totalLogs: totalWaterLogs,
        totalLiters: totalWaterMl / 1000,
        averagePerLog: averageWaterMl,
        averageDaily: averageDailyWaterMl,
        waterByDate: waterData,
      },
      nutrition: {
        totalMeals,
        totalCalories: Math.round(macroTotals.calories),
        totalProtein: Math.round(macroTotals.protein),
        totalCarbs: Math.round(macroTotals.carbs),
        totalFats: Math.round(macroTotals.fats),
        caloriesByDate: caloriesData,
        macroTotals: {
          protein: Math.round(macroTotals.protein),
          carbs: Math.round(macroTotals.carbs),
          fats: Math.round(macroTotals.fats),
        },
      },
      finance: {
        users: financeUsers,
        totalBudgets,
        totalDebts,
        totalGoals,
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
      },
    };

    // Cache the response
    cache.set(cacheKey, responseData, 300000); // 5 minutes

    const response = NextResponse.json(responseData);
    // Add caching headers (5 minutes cache)
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    response.headers.set('X-Cache', 'MISS');
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());

    return response;
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    
    // Check if it's a quota exceeded error
    if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('Quota exceeded')) {
      // Try to return cached data if available
      const cacheKey = createCacheKey('analytics');
      const cached = cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            'X-Cache': 'HIT-STALE',
            'X-Error': 'Quota exceeded, returning cached data',
          },
        });
      }
      
      return NextResponse.json(
        { 
          error: 'Firestore quota exceeded. Please try again later.',
          details: 'The database quota has been exceeded. The request will be retried automatically.',
          code: 'QUOTA_EXCEEDED'
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500 }
    );
  }
}

