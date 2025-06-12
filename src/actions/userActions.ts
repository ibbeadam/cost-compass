"use server";

import { db, auth } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import type { User, CreateUserData, UpdateUserData } from "@/types";

const USERS_COLLECTION = "users";

// Helper function to convert Firestore timestamps to dates
const convertTimestampsToDates = (user: any): User => {
  return {
    ...user,
    createdAt: user.createdAt instanceof Timestamp ? user.createdAt.toDate() : user.createdAt,
    updatedAt: user.updatedAt instanceof Timestamp ? user.updatedAt.toDate() : user.updatedAt,
    lastLoginAt: user.lastLoginAt instanceof Timestamp ? user.lastLoginAt.toDate() : user.lastLoginAt,
  };
};

// Get all users
export async function getAllUsersAction(): Promise<User[]> {
  try {
    if (!db) throw new Error("Firestore is not initialized");
    
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      users.push(convertTimestampsToDates({ id: doc.id, ...doc.data() }));
    });
    
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }
}

// Get user by ID
export async function getUserByIdAction(userId: string): Promise<User | null> {
  try {
    if (!db) throw new Error("Firestore is not initialized");
    
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return convertTimestampsToDates({ id: userSnap.id, ...userSnap.data() });
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw new Error("Failed to fetch user");
  }
}

// Get user by email
export async function getUserByEmailAction(email: string): Promise<User | null> {
  try {
    if (!db) throw new Error("Firestore is not initialized");
    
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return convertTimestampsToDates({ id: doc.id, ...doc.data() });
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    throw new Error("Failed to fetch user by email");
  }
}

// Create new user
export async function createUserAction(userData: CreateUserData): Promise<User> {
  try {
    if (!db) throw new Error("Firestore is not initialized");
    if (!auth) throw new Error("Firebase Auth is not initialized");
    
    // Check if user already exists
    const existingUser = await getUserByEmailAction(userData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }
    
    // Create Firebase Auth user with temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, tempPassword);
    
    // Create user document in Firestore
    const userDoc = {
      email: userData.email,
      displayName: userData.displayName || "",
      role: userData.role,
      isActive: true,
      department: userData.department || "",
      phoneNumber: userData.phoneNumber || "",
      permissions: userData.permissions || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, USERS_COLLECTION), userDoc);
    
    // Send password reset email so user can set their own password
    await sendPasswordResetEmail(auth, userData.email);
    
    return {
      id: docRef.id,
      ...userDoc,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create user");
  }
}

// Update user
export async function updateUserAction(userId: string, userData: UpdateUserData): Promise<User> {
  try {
    if (!db) throw new Error("Firestore is not initialized");
    
    const userRef = doc(db, USERS_COLLECTION, userId);
    
    const updateData = {
      ...userData,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(userRef, updateData);
    
    // Return updated user
    const updatedUser = await getUserByIdAction(userId);
    if (!updatedUser) {
      throw new Error("User not found after update");
    }
    
    return updatedUser;
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("Failed to update user");
  }
}

// Delete user
export async function deleteUserAction(userId: string): Promise<void> {
  try {
    if (!db) throw new Error("Firestore is not initialized");
    
    const userRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(userRef);
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new Error("Failed to delete user");
  }
}

// Toggle user active status
export async function toggleUserActiveStatusAction(userId: string): Promise<User> {
  try {
    const user = await getUserByIdAction(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    return await updateUserAction(userId, { isActive: !user.isActive });
  } catch (error) {
    console.error("Error toggling user status:", error);
    throw new Error("Failed to toggle user status");
  }
}

// Update user last login
export async function updateUserLastLoginAction(userId: string): Promise<void> {
  try {
    if (!db) throw new Error("Firestore is not initialized");
    
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating last login:", error);
    // Don't throw error for this as it's not critical
  }
} 