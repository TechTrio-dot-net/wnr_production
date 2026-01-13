import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app: App;
if (!getApps().length) {
  console.log("Initializing Firebase Admin SDK");
  console.log(process.env.FIREBASE_PROJECT_ID);
  console.log(process.env.FIREBASE_CLIENT_EMAIL);
  console.log(process.env.FIREBASE_PRIVATE_KEY);
  console.log(process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"));
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
} else {
  console.log("Firebase Admin SDK already initialized");
  console.log(getApps()[0]);
  app = getApps()[0]!;
}

export const adminAuth = getAuth(app);
