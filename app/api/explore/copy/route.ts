import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

// POST copy explore page from one date to another date(s)
export async function POST(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const body = await request.json();
    const { sourceDateId, targetDateIds, copyLayouts = false } = body;

    if (
      !sourceDateId ||
      !targetDateIds ||
      !Array.isArray(targetDateIds) ||
      targetDateIds.length === 0
    ) {
      return NextResponse.json(
        { error: 'sourceDateId and targetDateIds (array) are required' },
        { status: 400 }
      );
    }

    // Get source document
    const sourceDoc = await db.collection('explore_landings').doc(sourceDateId).get();

    if (!sourceDoc.exists) {
      return NextResponse.json({ error: `Source date ${sourceDateId} not found` }, { status: 404 });
    }

    const sourceData = sourceDoc.data();
    const sourceVideos = (sourceData?.videos || []) as any[];
    const sourceLayouts = (sourceData?.layouts || []) as any[];

    if (sourceVideos.length === 0) {
      return NextResponse.json({ error: 'Source date has no videos to copy' }, { status: 400 });
    }

    const results = [];

    // Copy to each target date
    for (const targetDateId of targetDateIds) {
      try {
        const targetDocRef = db.collection('explore_landings').doc(targetDateId);
        const targetDoc = await targetDocRef.get();

        const targetData = targetDoc.exists ? targetDoc.data() : {};
        const existingVideos = (targetData?.videos || []) as any[];

        // Generate new IDs for copied videos to avoid conflicts
        const copiedVideos = sourceVideos.map((video: any) => ({
          ...video,
          id: nanoid(), // New ID for copied video
          created_at: new Date().toISOString(), // Update creation date
        }));

        // Merge with existing videos (or replace - you can change this behavior)
        const updatedVideos = [...existingVideos, ...copiedVideos];

        const updateData: any = {
          videos: updatedVideos,
        };

        // Optionally copy layouts
        if (copyLayouts && sourceLayouts.length > 0) {
          updateData.layouts = sourceLayouts;
        }

        await targetDocRef.set(
          {
            ...targetData,
            ...updateData,
          },
          { merge: true }
        );

        results.push({
          targetDateId,
          success: true,
          videosCopied: copiedVideos.length,
          totalVideos: updatedVideos.length,
        });
      } catch (err: any) {
        results.push({
          targetDateId,
          success: false,
          error: err.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      sourceDateId,
      results,
      summary: {
        total: targetDateIds.length,
        successful: successCount,
        failed: failCount,
      },
    });
  } catch (error: unknown) {
    console.error('Error copying explore page:', error);
    const message = error instanceof Error ? error.message : 'Failed to copy explore page';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
