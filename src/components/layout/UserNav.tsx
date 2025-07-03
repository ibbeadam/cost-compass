// src/components/layout/UserNav.tsx
"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Settings, LogIn } from "lucide-react";
import { useNextAuth } from "@/hooks/useNextAuth";
import { Skeleton } from "@/components/ui/skeleton";

export function UserNav() {
  const { user, userProfile, loading, signOut } = useNextAuth();

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Skeleton className="h-9 w-24 bg-muted" />
        <Skeleton className="h-9 w-9 rounded-full bg-muted" />
      </div>
    );
  }

  if (!user) {
    return (
      <Button asChild variant="outline">
        <Link href="/login">
          <LogIn className="mr-2 h-4 w-4" />
          Login
        </Link>
      </Button>
    );
  }

  // Use user's name from NextAuth session
  const userName = user?.name || "User";
  const userEmail = user?.email || "No email provided";

  const userAvatar =
    user?.image ||
    `https://placehold.co/40x40.png?text=${userName
      .substring(0, 2)
      .toUpperCase()}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={userAvatar}
              alt={userName}
              data-ai-hint="profile person"
            />
            <AvatarFallback>
              {userName.substring(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-card border-border shadow-lg"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-card-foreground">
              {userName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer hover:bg-accent">
            <Link href="/dashboard/profile" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer hover:bg-accent">
            <Link href="/dashboard/settings" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer hover:bg-accent text-destructive hover:text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
