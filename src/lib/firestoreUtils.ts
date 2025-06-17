import { doc, getDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import type { User as FirestoreUser } from "@/types";

const USERS_COLLECTION = "users";

// Helper function to convert Firestore timestamps to dates
const convertTimestampsToDates = (user: any): FirestoreUser => {
  return {
    ...user,
    createdAt: user.createdAt instanceof Timestamp ? user.createdAt.toDate() : user.createdAt,
    updatedAt: user.updatedAt instanceof Timestamp ? user.updatedAt.toDate() : user.updatedAt,
    lastLoginAt: user.lastLoginAt instanceof Timestamp ? user.lastLoginAt.toDate() : user.lastLoginAt,
  };
};

/**
 * Fetches a user's Firestore profile by their UID.
 * This function is intended to be used on the client-side where Firebase Auth context is available.
 * It directly reads the user document by its UID.
 */
export async function getFirestoreUserProfileByUid(uid: string): Promise<FirestoreUser | null> {
  try {
    if (!db) {
      console.error("getFirestoreUserProfileByUid: Firestore 'db' instance is not available.");
      throw new Error("Firestore is not initialized");
    }

    const userRef = doc(db, USERS_COLLECTION, uid);
    console.log(`getFirestoreUserProfileByUid: Attempting to fetch user profile for UID: ${uid}`);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = { id: userSnap.id, ...userSnap.data() };
      console.log(`getFirestoreUserProfileByUid: Found user profile for UID: ${uid}`);
      return convertTimestampsToDates(userData);
    } else {
      console.log(`getFirestoreUserProfileByUid: No user profile found for UID: ${uid}`);
      return null;
    }
  } catch (error) {
    console.error(`getFirestoreUserProfileByUid: Error fetching user profile for UID (${uid}):`, error);
    throw new Error(`Failed to fetch user profile by UID: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetches a user's Firestore profile by their email.
 * This function is intended to be used on the client-side where Firebase Auth context is available.
 * It performs a query for the user document by email. (Less efficient than by UID).
 */
export async function getFirestoreUserProfileByEmail(email: string): Promise<FirestoreUser | null> {
  try {
    if (!db) {
      console.error("getFirestoreUserProfileByEmail: Firestore 'db' instance is not available.");
      throw new Error("Firestore is not initialized");
    }

    const usersRef = collection(db, USERS_COLLECTION);
    console.log(`getFirestoreUserProfileByEmail: Attempting to query user profile for email: ${email}`);
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      console.log(`getFirestoreUserProfileByEmail: Found user profile for email: ${email}, UID: ${userDoc.id}`);
      return convertTimestampsToDates({ id: userDoc.id, ...userDoc.data() });
    } else {
      console.log(`getFirestoreUserProfileByEmail: No user profile found for email: ${email}`);
      return null;
    }
  } catch (error) {
    console.error(`getFirestoreUserProfileByEmail: Error fetching user profile by email (${email}):`, error);
    throw new Error(`Failed to fetch user profile by email: ${error instanceof Error ? error.message : String(error)}`);
  }
} 