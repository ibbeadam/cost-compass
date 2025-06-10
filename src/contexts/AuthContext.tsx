
"use client";

import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton"; 

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      if (!pathname.startsWith('/login')) { 
        router.push("/login");
      }
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (loading && !pathname.startsWith('/login') && !pathname.startsWith('/signup') && pathname !== '/') {
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
    <AuthContext.Provider value={{ user, loading, signOut }}>
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
