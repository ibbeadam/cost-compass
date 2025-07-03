"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export function useNextAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const login = async (email: string, password: string) => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push("/dashboard");
    }

    return result;
  };

  const logout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return {
    user: session?.user || null,
    loading: status === "loading",
    isAdmin: session?.user?.role === "admin",
    userProfile: session?.user || null,
    signIn: login,
    signOut: logout,
    session,
  };
}