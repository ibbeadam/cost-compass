"use client";

import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserByEmailAction } from "@/actions/prismaUserActions";
import type { User } from "@/types";

interface AuthContextType {
  user: any | null;
  loading: boolean;
  isAdmin: boolean;
  userProfile: User | null;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const loading = status === "loading";
  const user = session?.user || null;

  const signOut = useCallback(async () => {
    try {
      await nextAuthSignOut({ 
        callbackUrl: "/login",
        redirect: true 
      });
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  }, []);

  useEffect(() => {
    if (user?.email) {
      // Fetch user profile from database
      const fetchUserProfile = async () => {
        try {
          const dbUser = await getUserByEmailAction(user.email);
          if (dbUser) {
            setUserProfile(dbUser);
            setIsAdmin(dbUser.role === "super_admin");
          } else {
            setUserProfile(null);
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile(null);
          setIsAdmin(false);
        }
      };
      
      fetchUserProfile();
    } else {
      setUserProfile(null);
      setIsAdmin(false);
    }
  }, [user?.email]);

  const refreshUserProfile = useCallback(async () => {
    if (user?.email) {
      try {
        const updatedProfile = await getUserByEmailAction(user.email);
        if (updatedProfile) {
          setUserProfile(updatedProfile);
          setIsAdmin(updatedProfile.role === "super_admin");
        }
      } catch (error) {
        console.error("Error refreshing user profile:", error);
      }
    }
  }, [user?.email]);

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
