import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// DELETE story
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    initFirebase();
    const db = admin.firestore();
    const { storyId } = await params;

    // Check if story exists
    const storyDoc = await db.collection('stories').doc(storyId).get();

    if (!storyDoc.exists) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Delete the story
    await db.collection('stories').doc(storyId).delete();

    return NextResponse.json({
      success: true,
      message: 'Story deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting story:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete story';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
