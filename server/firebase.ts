import admin from "firebase-admin";

let db: admin.firestore.Firestore | null = null;

export function getFirestore() {
  if (!db) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("Firebase credentials missing. Falling back to mock behavior or failing fast on requests.");
      return null;
    }

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    db = admin.firestore();
  }
  return db;
}

export { admin };
