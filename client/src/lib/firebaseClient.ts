// src/lib/firebaseClient.ts
import { getApps, initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier } from "firebase/auth";

export function getFirebaseAuth() {
  const app = getApps().length ? getApps()[0] : initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  });
  return getAuth(app);
}

export function createInvisibleRecaptcha(auth: ReturnType<typeof getFirebaseAuth>) {
  return new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
}
