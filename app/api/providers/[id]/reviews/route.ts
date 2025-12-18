import { initFirebase } from '@/lib/firebase';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

function parseId(raw: string) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authCheck = await requirePermission(req, RESOURCE_TYPES.PROVIDERS, 'read');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id: idParam } = await params;
    const providerId = parseId(idParam);
    if (!providerId) return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50) || 50, 1), 200);

    initFirebase();
    const db = admin.firestore();

    const snap = await db
      .collection('providers')
      .doc(String(providerId))
      .collection('reviews')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();

    const reviews = snap.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        userId: data.user_id ?? null,
        userName: data.user_name ?? 'Anonymous',
        providerId: data.provider_id ?? providerId,
        providerName: data.provider_name ?? null,
        rating: data.rating ?? null,
        comment: data.comment ?? '',
        appointmentId: data.appointment_id ?? null,
        createdAt: data.created_at?.toDate?.()?.toISOString?.() ?? null,
        updatedAt: data.updated_at?.toDate?.()?.toISOString?.() ?? null,
      };
    });

    // Lightweight stats
    const totalReviews = reviews.length;
    const avg =
      totalReviews === 0
        ? 0
        : reviews.reduce((sum: number, r: any) => sum + (Number(r.rating) || 0), 0) / totalReviews;

    return NextResponse.json({ reviews, stats: { totalReviews, averageRating: avg } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



