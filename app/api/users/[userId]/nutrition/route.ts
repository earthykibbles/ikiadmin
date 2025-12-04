import { NextRequest, NextResponse } from 'next/server';
import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    initFirebase();
    const db = admin.firestore();
    const { userId } = await params;

    // Fetch meal logs - need to iterate through date documents
    // Get all date documents (can't order by document ID without index, so we'll sort in memory)
    const datesSnapshot = await db
      .collection('meals')
      .doc(userId)
      .collection('dates')
      .get();

    // Sort date documents by ID (date string) in descending order and limit to last 30 days
    const sortedDateDocs = datesSnapshot.docs
      .sort((a, b) => b.id.localeCompare(a.id)) // Sort by date string descending
      .slice(0, 30); // Limit to last 30 days

    const mealLogs: any[] = [];
    const dailyMeals: { [key: string]: any[] } = {};

    for (const dateDoc of sortedDateDocs) {
      const dateKey = dateDoc.id;
      const foodsSnapshot = await db
        .collection('meals')
        .doc(userId)
        .collection('dates')
        .doc(dateKey)
        .collection('foods')
        .get();

      const dayMeals = foodsSnapshot.docs.map((foodDoc) => {
        const data = foodDoc.data();
        const meal = {
          id: foodDoc.id,
          name: data.name || '',
          calories: data.calories || 0,
          protein: data.protein || 0,
          carbs: data.carbs || 0,
          fats: data.fats || 0,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || dateKey,
          mealType: data.mealType || null,
          imageUrl: data.imageUrl || null,
          notes: data.notes || null,
          servingSize: data.servingSize || null,
          foodId: data.foodId || null,
          isFavorite: data.isFavorite || false,
          dateKey: dateKey,
        };
        return meal;
      });

      if (dayMeals.length > 0) {
        dailyMeals[dateKey] = dayMeals;
        mealLogs.push(...dayMeals);
      }
    }

    // Sort meals by timestamp (most recent first)
    mealLogs.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });

    // Calculate daily totals
    const dailyTotals: { [key: string]: any } = {};
    Object.keys(dailyMeals).forEach((dateKey) => {
      const meals = dailyMeals[dateKey];
      dailyTotals[dateKey] = {
        totalCalories: meals.reduce((sum, m) => sum + (m.calories || 0), 0),
        totalProtein: meals.reduce((sum, m) => sum + (m.protein || 0), 0),
        totalCarbs: meals.reduce((sum, m) => sum + (m.carbs || 0), 0),
        totalFats: meals.reduce((sum, m) => sum + (m.fats || 0), 0),
        mealCount: meals.length,
      };
    });

    // Calculate summary
    const totalCalories = mealLogs.reduce((sum, m) => sum + (m.calories || 0), 0);
    const totalProtein = mealLogs.reduce((sum, m) => sum + (m.protein || 0), 0);
    const totalCarbs = mealLogs.reduce((sum, m) => sum + (m.carbs || 0), 0);
    const totalFats = mealLogs.reduce((sum, m) => sum + (m.fats || 0), 0);

    const averageDailyCalories = Object.keys(dailyTotals).length > 0
      ? Object.values(dailyTotals).reduce((sum: number, day: any) => sum + (day.totalCalories || 0), 0) / Object.keys(dailyTotals).length
      : 0;

    // Get today's totals
    const today = new Date().toISOString().split('T')[0];
    const todayTotals = dailyTotals[today] || {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFats: 0,
      mealCount: 0,
    };

    // Get recent meals (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentMeals = mealLogs.filter((meal) => {
      const mealDate = new Date(meal.timestamp);
      return mealDate >= sevenDaysAgo;
    });

    const summary = {
      totalMeals: mealLogs.length,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFats,
      averageDailyCalories,
      todayCalories: todayTotals.totalCalories,
      todayProtein: todayTotals.totalProtein,
      todayCarbs: todayTotals.totalCarbs,
      todayFats: todayTotals.totalFats,
      todayMealCount: todayTotals.mealCount,
      uniqueDays: Object.keys(dailyTotals).length,
      recentMealsCount: recentMeals.length,
    };

    return NextResponse.json({
      mealLogs: mealLogs.slice(0, 200), // Limit to 200 most recent
      dailyMeals,
      dailyTotals,
      summary,
    });
  } catch (error: any) {
    console.error('Error fetching nutrition data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nutrition data', details: error.message },
      { status: 500 }
    );
  }
}

