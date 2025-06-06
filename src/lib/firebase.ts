
import { initializeApp, getApp, getApps, FirebaseError } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// These variables will be sourced from your .env.local file
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

let appInstance;
let dbInstance;
let authInstance;

try {
  if (!firebaseConfig.projectId) {
    throw new Error("Firebase project ID is not configured. Check your .env.local file and NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
  }
  appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  dbInstance = getFirestore(appInstance);
  authInstance = getAuth(appInstance);
} catch (e: any) {
  console.error("!!!!!!!!!! FIREBASE INITIALIZATION ERROR !!!!!!!!!!");
  if (e instanceof FirebaseError) {
    console.error("Firebase Error Code:", e.code);
    console.error("Firebase Error Message:", e.message);
  } else if (e instanceof Error) {
    console.error("Generic Error during Firebase init:", e.message);
    console.error("Stack:", e.stack);
  } else {
    console.error("Unknown error during Firebase init:", e);
  }
  // If Firebase fails to initialize, dbInstance and authInstance might be undefined.
  // Subsequent calls to Firestore will likely fail.
}

export const app = appInstance;
export const db = dbInstance;
export const auth = authInstance;
