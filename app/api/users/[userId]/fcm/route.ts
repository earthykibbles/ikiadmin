import { initFirebase } from '@/lib/firebase';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// Send FCM message to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  try {
    // RBAC check: sending push is privileged.
    const authCheck = await requirePermission(request, RESOURCE_TYPES.FCM, 'write', userId);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    initFirebase();
    const db = admin.firestore();
    const messaging = admin.messaging();

    const body = await request.json();
    const { title, body: messageBody, data: customData = {} } = body;

    if (!title || !messageBody) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    // Get user's FCM token
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    // Check for both fcm_token (Flutter app) and fcmToken (legacy)
    const fcmToken = userData.fcm_token || userData.fcmToken || userData.device_token;

    if (!fcmToken) {
      return NextResponse.json(
        { error: 'User does not have an FCM token registered' },
        { status: 400 }
      );
    }

    // Send notification
    const message = {
      token: fcmToken,
      notification: {
        title,
        body: messageBody,
      },
      data: {
        ...customData,
        type: 'admin_message',
        userId: userId,
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await messaging.send(message);

    // Log the notification
    await db.collection('admin_notifications').add({
      userId: userId,
      title,
      body: messageBody,
      data: customData,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      messageId: response,
      sentBy: 'admin', // You can add admin user ID here
    });

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      messageId: response,
    });
  } catch (error: unknown) {
    console.error('Error sending FCM message:', error);

    // Handle invalid token error
    const errorObj =
      error && typeof error === 'object' ? (error as { code?: string; message?: string }) : null;
    if (
      errorObj?.code === 'messaging/invalid-registration-token' ||
      errorObj?.code === 'messaging/registration-token-not-registered'
    ) {
      // Remove invalid token from user document
      try {
        const db = admin.firestore();
        await db.collection('users').doc(userId).update({
          fcm_token: admin.firestore.FieldValue.delete(),
          fcmToken: admin.firestore.FieldValue.delete(),
          device_token: admin.firestore.FieldValue.delete(),
        });
      } catch (updateError) {
        console.error('Error removing invalid token:', updateError);
      }
    }

    const message = error instanceof Error ? error.message : 'Failed to send notification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
