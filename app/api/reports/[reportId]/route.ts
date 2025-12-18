import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// PATCH update report status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    initFirebase();
    const db = admin.firestore();

    const { reportId } = await params;
    const body = await request.json();
    const { status, reportType } = body;

    if (!status || !reportType) {
      return NextResponse.json(
        { error: 'status and reportType are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: pending, reviewed, resolved, dismissed' },
        { status: 400 }
      );
    }

    const validTypes = ['post', 'story', 'user'];
    if (!validTypes.includes(reportType)) {
      return NextResponse.json(
        { error: 'Invalid reportType. Must be one of: post, story, user' },
        { status: 400 }
      );
    }

    // Determine collection based on report type
    let collectionName = '';
    switch (reportType) {
      case 'post':
        collectionName = 'post_reports';
        break;
      case 'story':
        collectionName = 'story_reports';
        break;
      case 'user':
        collectionName = 'user_reports';
        break;
    }

    const reportRef = db.collection(collectionName).doc(reportId);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    await reportRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Report status updated successfully',
    });
  } catch (error: unknown) {
    console.error('Error updating report:', error);
    const message = error instanceof Error ? error.message : 'Failed to update report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE a report
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    initFirebase();
    const db = admin.firestore();

    const { reportId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type');

    if (!reportType) {
      return NextResponse.json(
        { error: 'reportType query parameter is required' },
        { status: 400 }
      );
    }

    const validTypes = ['post', 'story', 'user'];
    if (!validTypes.includes(reportType)) {
      return NextResponse.json(
        { error: 'Invalid reportType. Must be one of: post, story, user' },
        { status: 400 }
      );
    }

    // Determine collection based on report type
    let collectionName = '';
    switch (reportType) {
      case 'post':
        collectionName = 'post_reports';
        break;
      case 'story':
        collectionName = 'story_reports';
        break;
      case 'user':
        collectionName = 'user_reports';
        break;
    }

    const reportRef = db.collection(collectionName).doc(reportId);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    await reportRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting report:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}







