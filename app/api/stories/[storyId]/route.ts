import { NextRequest, NextResponse } from 'next/server';
import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';

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
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }
    
    // Delete the story
    await db.collection('stories').doc(storyId).delete();
    
    return NextResponse.json({
      success: true,
      message: 'Story deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting story:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete story' },
      { status: 500 }
    );
  }
}

