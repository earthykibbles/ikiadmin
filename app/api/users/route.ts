import { NextRequest, NextResponse } from 'next/server';
import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { cache, createCacheKey } from '@/lib/cache';
import { usersRateLimiter, getClientId } from '@/lib/rateLimit';
import { requirePermission, RESOURCE_TYPES } from '@/lib/rbac';

// Route segment config for caching
export const revalidate = 60; // Revalidate every minute for user lists
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // RBAC check
    const authCheck = await requirePermission(request, RESOURCE_TYPES.USERS, 'read');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    // Rate limiting
    const clientId = getClientId(request);
    const rateLimit = usersRateLimiter.check(clientId);
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
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Cap at 100
    const lastDocId = searchParams.get('lastDocId');
    
    // Only cache first page (no pagination)
    const cacheKey = createCacheKey('users', { limit, page: lastDocId || 'first' });
    if (!lastDocId) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            'X-Cache': 'HIT',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          },
        });
      }
    }

    initFirebase();
    const db = admin.firestore();
    
    let query = db.collection('users').orderBy('time', 'desc').limit(limit);
    
    // Pagination support
    if (lastDocId) {
      const lastDoc = await db.collection('users').doc(lastDocId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }
    
    const snapshot = await query.get();
    
    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        firstname: data.firstname || '',
        lastname: data.lastname || '',
        username: data.username || '',
        email: data.email || '',
        photoUrl: data.photoUrl || '',
        country: data.country || '',
        bio: data.bio || '',
        gender: data.gender || '',
        birthday: data.birthday || '',
        phone: data.phone || '',
        signedUpAt: data.time ? data.time.toDate().toISOString() : null,
        lastSeen: data.lastSeen ? data.lastSeen.toDate().toISOString() : null,
        isOnline: data.isOnline || false,
        points: data.points || 0,
        activityLevel: data.activityLevel || '',
        bodyWeightKg: data.bodyWeightKg || null,
        age: data.age || null,
        onboardingData: data.onboardingData || null,
        healthStats: data.health_stats || [],
      };
    });
    
    const responseData = {
      users,
      total: users.length,
      hasMore: snapshot.docs.length === limit,
      lastDocId: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null,
    };

    // Cache first page only
    if (!lastDocId) {
      cache.set(cacheKey, responseData, 60000); // 1 minute cache
    }
    
    const response = NextResponse.json(responseData);
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    response.headers.set('X-Cache', lastDocId ? 'N/A' : 'MISS');
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    
    return response;
  } catch (error: any) {
    console.error('Error fetching users:', error);
    
    // Check if it's a quota exceeded error
    if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('Quota exceeded')) {
      // Try to return cached data if available
      const searchParams = request.nextUrl.searchParams;
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const lastDocId = searchParams.get('lastDocId');
      const cacheKey = createCacheKey('users', { limit, page: lastDocId || 'first' });
      
      const cached = cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
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
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

