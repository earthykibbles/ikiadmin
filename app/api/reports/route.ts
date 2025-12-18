import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// GET all reports (post_reports, story_reports, user_reports)
export async function GET(request: NextRequest) {
  try {
    initFirebase();
    const db = admin.firestore();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all'; // 'all', 'posts', 'stories', 'users'
    const status = searchParams.get('status'); // 'pending', 'reviewed', 'resolved', 'dismissed'
    const limit = Number.parseInt(searchParams.get('limit') || '50');
    const lastDocId = searchParams.get('lastDocId');

    const results: any = {
      postReports: [],
      storyReports: [],
      userReports: [],
    };

    // Fetch post reports
    if (type === 'all' || type === 'posts') {
      let postQuery: admin.firestore.Query = db.collection('post_reports');

      // Apply status filter first if provided
      if (status) {
        postQuery = postQuery.where('status', '==', status);
      }

      // Then order by createdAt
      postQuery = postQuery.orderBy('createdAt', 'desc').limit(limit);

      if (lastDocId && type === 'posts') {
        const lastDoc = await db.collection('post_reports').doc(lastDocId).get();
        if (lastDoc.exists) {
          postQuery = postQuery.startAfter(lastDoc);
        }
      }

      const postSnapshot = await postQuery.get();
      results.postReports = await Promise.all(
        postSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          
          // Fetch reporter and reported post/user info
          let reporterInfo = null;
          let reportedPostInfo = null;

          if (data.reporterId) {
            try {
              const reporterDoc = await db.collection('users').doc(data.reporterId).get();
              if (reporterDoc.exists) {
                const reporterData = reporterDoc.data();
                reporterInfo = {
                  id: reporterDoc.id,
                  username: reporterData?.username || '',
                  email: reporterData?.email || '',
                  photoUrl: reporterData?.photoUrl || '',
                };
              }
            } catch (e) {
              console.error('Error fetching reporter:', e);
            }
          }

          if (data.postId) {
            try {
              const postDoc = await db.collection('posts').doc(data.postId).get();
              if (postDoc.exists) {
                const postData = postDoc.data();
                reportedPostInfo = {
                  id: postDoc.id,
                  description: postData?.description || '',
                  mediaUrl: postData?.mediaUrl || '',
                  ownerId: postData?.ownerId || '',
                  username: postData?.username || '',
                };
              }
            } catch (e) {
              console.error('Error fetching post:', e);
            }
          }

          return {
            id: doc.id,
            reportType: 'post',
            reporterId: data.reporterId || '',
            reporterInfo,
            postId: data.postId || '',
            reportedPostInfo,
            reason: data.reason || '',
            additionalDetails: data.additionalDetails || '',
            status: data.status || 'pending',
            createdAt: data.createdAt
              ? data.createdAt.toDate
                ? data.createdAt.toDate().toISOString()
                : data.createdAt
              : null,
            updatedAt: data.updatedAt
              ? data.updatedAt.toDate
                ? data.updatedAt.toDate().toISOString()
                : data.updatedAt
              : null,
          };
        })
      );
    }

    // Fetch story reports
    if (type === 'all' || type === 'stories') {
      let storyQuery: admin.firestore.Query = db.collection('story_reports');

      // Apply status filter first if provided
      if (status) {
        storyQuery = storyQuery.where('status', '==', status);
      }

      // Then order by createdAt
      storyQuery = storyQuery.orderBy('createdAt', 'desc').limit(limit);

      if (lastDocId && type === 'stories') {
        const lastDoc = await db.collection('story_reports').doc(lastDocId).get();
        if (lastDoc.exists) {
          storyQuery = storyQuery.startAfter(lastDoc);
        }
      }

      const storySnapshot = await storyQuery.get();
      results.storyReports = await Promise.all(
        storySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          
          // Fetch reporter and reported story info
          let reporterInfo = null;
          let reportedStoryInfo = null;

          if (data.reporterId) {
            try {
              const reporterDoc = await db.collection('users').doc(data.reporterId).get();
              if (reporterDoc.exists) {
                const reporterData = reporterDoc.data();
                reporterInfo = {
                  id: reporterDoc.id,
                  username: reporterData?.username || '',
                  email: reporterData?.email || '',
                  photoUrl: reporterData?.photoUrl || '',
                };
              }
            } catch (e) {
              console.error('Error fetching reporter:', e);
            }
          }

          if (data.storyId) {
            try {
              const storyDoc = await db.collection('stories').doc(data.storyId).get();
              if (storyDoc.exists) {
                const storyData = storyDoc.data();
                reportedStoryInfo = {
                  id: storyDoc.id,
                  caption: storyData?.caption || '',
                  imageUrl: storyData?.imageUrl || '',
                  userId: storyData?.userId || '',
                  username: storyData?.username || '',
                };
              }
            } catch (e) {
              console.error('Error fetching story:', e);
            }
          }

          return {
            id: doc.id,
            reportType: 'story',
            reporterId: data.reporterId || '',
            reporterInfo,
            storyId: data.storyId || '',
            reportedStoryInfo,
            reason: data.reason || '',
            additionalDetails: data.additionalDetails || '',
            status: data.status || 'pending',
            createdAt: data.createdAt
              ? data.createdAt.toDate
                ? data.createdAt.toDate().toISOString()
                : data.createdAt
              : null,
            updatedAt: data.updatedAt
              ? data.updatedAt.toDate
                ? data.updatedAt.toDate().toISOString()
                : data.updatedAt
              : null,
          };
        })
      );
    }

    // Fetch user reports
    if (type === 'all' || type === 'users') {
      let userQuery: admin.firestore.Query = db.collection('user_reports');

      // Apply status filter first if provided
      if (status) {
        userQuery = userQuery.where('status', '==', status);
      }

      // Then order by createdAt
      userQuery = userQuery.orderBy('createdAt', 'desc').limit(limit);

      if (lastDocId && type === 'users') {
        const lastDoc = await db.collection('user_reports').doc(lastDocId).get();
        if (lastDoc.exists) {
          userQuery = userQuery.startAfter(lastDoc);
        }
      }

      const userSnapshot = await userQuery.get();
      results.userReports = await Promise.all(
        userSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          
          // Fetch reporter and reported user info
          let reporterInfo = null;
          let reportedUserInfo = null;

          if (data.reporterId) {
            try {
              const reporterDoc = await db.collection('users').doc(data.reporterId).get();
              if (reporterDoc.exists) {
                const reporterData = reporterDoc.data();
                reporterInfo = {
                  id: reporterDoc.id,
                  username: reporterData?.username || '',
                  email: reporterData?.email || '',
                  photoUrl: reporterData?.photoUrl || '',
                };
              }
            } catch (e) {
              console.error('Error fetching reporter:', e);
            }
          }

          if (data.reportedUserId) {
            try {
              const reportedUserDoc = await db.collection('users').doc(data.reportedUserId).get();
              if (reportedUserDoc.exists) {
                const reportedUserData = reportedUserDoc.data();
                reportedUserInfo = {
                  id: reportedUserDoc.id,
                  username: reportedUserData?.username || '',
                  email: reportedUserData?.email || '',
                  photoUrl: reportedUserData?.photoUrl || '',
                };
              }
            } catch (e) {
              console.error('Error fetching reported user:', e);
            }
          }

          return {
            id: doc.id,
            reportType: 'user',
            reporterId: data.reporterId || '',
            reporterInfo,
            reportedUserId: data.reportedUserId || '',
            reportedUserInfo,
            reason: data.reason || '',
            additionalDetails: data.additionalDetails || '',
            status: data.status || 'pending',
            createdAt: data.createdAt
              ? data.createdAt.toDate
                ? data.createdAt.toDate().toISOString()
                : data.createdAt
              : null,
            updatedAt: data.updatedAt
              ? data.updatedAt.toDate
                ? data.updatedAt.toDate().toISOString()
                : data.updatedAt
              : null,
          };
        })
      );
    }

    // Combine and sort all reports by createdAt
    const allReports = [
      ...results.postReports,
      ...results.storyReports,
      ...results.userReports,
    ].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({
      reports: allReports,
      postReports: results.postReports,
      storyReports: results.storyReports,
      userReports: results.userReports,
      counts: {
        total: allReports.length,
        posts: results.postReports.length,
        stories: results.storyReports.length,
        users: results.userReports.length,
        pending: allReports.filter((r) => r.status === 'pending').length,
        reviewed: allReports.filter((r) => r.status === 'reviewed').length,
        resolved: allReports.filter((r) => r.status === 'resolved').length,
        dismissed: allReports.filter((r) => r.status === 'dismissed').length,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching reports:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}







