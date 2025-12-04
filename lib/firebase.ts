import admin from 'firebase-admin';

let initialized = false;

export function initFirebase() {
  if (initialized) return admin;
  if (admin.apps.length) {
    initialized = true;
    return admin;
  }

  const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey && privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (svcJson) {
    const creds = JSON.parse(svcJson);
    admin.initializeApp({
      credential: admin.credential.cert(creds),
    });
  } else if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    // Fallback to GOOGLE_APPLICATION_CREDENTIALS
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  initialized = true;
  return admin;
}

export async function writeToFirestore(
  collection: string,
  docs: { id: string; data: any }[]
): Promise<void> {
  initFirebase();
  const db = admin.firestore();
  const batchSize = 400;

  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const batch = db.batch();

    for (const doc of chunk) {
      const ref = db.collection(collection).doc(doc.id);
      batch.set(
        ref,
        {
          data: doc.data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    console.log(`✓ Wrote ${chunk.length} docs to ${collection}`);
  }
}

