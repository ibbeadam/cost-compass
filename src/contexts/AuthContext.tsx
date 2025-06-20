"use client";

import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getFirestoreUserProfileByUid } from "@/lib/firestoreUtils";
import type { User as FirestoreUser } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  userProfile: FirestoreUser | null;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<FirestoreUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const signOut = useCallback(async () => {
    try {
      if (!auth) {
        throw new Error("Firebase Auth is not initialized");
      }
      await firebaseSignOut(auth);
      // User state will be updated by onAuthStateChanged
      // router.push will be handled by useEffect below or PrivateRoute
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (user) {
      // Only set a new timer if a user is logged in
      inactivityTimerRef.current = setTimeout(() => {
        // console.log("User inactive, signing out."); // Optional: for debugging
        signOut();
      }, INACTIVITY_TIMEOUT);
    }
  }, [user, signOut]);

  useEffect(() => {
    const activityEvents: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "mousedown",
      "touchstart",
      "scroll",
    ];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    if (user) {
      activityEvents.forEach((event) =>
        window.addEventListener(event, handleActivity)
      );
      resetInactivityTimer(); // Start timer when user logs in or becomes active
    } else {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      activityEvents.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      activityEvents.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
    };
  }, [user, resetInactivityTimer]);

  useEffect(() => {
    if (!auth) {
      console.error("Firebase Auth is not initialized");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser?.email && currentUser?.uid) {
        try {
          console.log(
            "AuthContext: Attempting to fetch user profile for email:",
            currentUser.email,
            " and UID:",
            currentUser.uid
          );
          // Fetch user profile from Firestore using the client-side utility
          let firestoreUser = await getFirestoreUserProfileByUid(
            currentUser.uid
          );

          // If user doesn't exist in Firestore, create a default profile (still using server action)
          if (!firestoreUser) {
            console.warn(
              "AuthContext: User profile not found in Firestore for",
              currentUser.email,
              ". Attempting to create default profile..."
            );
            try {
              const response = await fetch("/api/createUser", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: currentUser.email,
                  displayName:
                    currentUser.displayName || currentUser.email.split("@")[0],
                  role: "user", // Default role
                  department: "",
                  phoneNumber: "",
                  permissions: [],
                }),
              });

              if (!response.ok) {
                throw new Error(
                  `Failed to create user profile: ${response.statusText}`
                );
              }

              firestoreUser = await response.json();
              console.log(
                "AuthContext: Default user profile created via API:",
                firestoreUser
              );
            } catch (createError) {
              console.error(
                "AuthContext: Error creating default user profile via API:",
                createError
              );
              // Continue with null profile - user will need to be created by admin
            }
          } else {
            // Ensure Firestore displayName is prioritized (do not mutate currentUser)
            // Use Firestore displayName in your UI by referencing userProfile?.displayName
            // Example: setUserProfile({ ...firestoreUser, displayName: firestoreUser.displayName });
          }
          setUserProfile(firestoreUser);
          setIsAdmin(firestoreUser?.role === "admin" || false);
        } catch (error) {
          console.error(
            "AuthContext: Error fetching user profile during onAuthStateChanged:",
            error
          );
          setUserProfile(null);
          setIsAdmin(false);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }

      setLoading(false);
      if (currentUser) {
        resetInactivityTimer(); // Reset timer if user state changes to logged in
      } else {
        // User is signed out or session expired server-side
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
        // Redirect to login if not already on an auth page and not loading
        // This handles cases like token revocation or remote sign-out
        if (
          !loading &&
          pathname &&
          !pathname.startsWith("/login") &&
          pathname &&
          !pathname.startsWith("/signup") &&
          pathname !== "/"
        ) {
          router.push("/login");
        }
      }
    });
    return () => unsubscribe();
  }, [loading, pathname, router, resetInactivityTimer]);

  const refreshUserProfile = useCallback(async () => {
    if (user?.uid) {
      try {
        const updatedProfile = await getFirestoreUserProfileByUid(user.uid);
        setUserProfile(updatedProfile);
        setIsAdmin(updatedProfile?.role === "admin" || false);
      } catch (error) {
        console.error("Error refreshing user profile:", error);
      }
    }
  }, [user]);

  if (
    loading &&
    pathname &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/signup") &&
    pathname !== "/"
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="space-y-4 p-8 rounded-lg shadow-xl bg-card w-full max-w-sm text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto bg-primary/20" />
          <Skeleton className="h-6 w-3/4 mx-auto bg-muted" />
          <Skeleton className="h-4 w-1/2 mx-auto bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        userProfile,
        signOut,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
