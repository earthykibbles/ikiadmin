import { NextRequest, NextResponse } from 'next/server';
import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';

// Send FCM message to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    initFirebase();
    const db = admin.firestore();
    const messaging = admin.messaging();
    
    const body = await request.json();
    const { title, body: messageBody, data: customData = {} } = body;
    
    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
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
  } catch (error: any) {
    console.error('Error sending FCM message:', error);
    
    // Handle invalid token error
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
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
    
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}

