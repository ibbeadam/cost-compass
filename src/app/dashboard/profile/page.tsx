"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { getFirestoreUserProfileByUid } from "@/lib/firestoreUtils";
import { updateDoc, doc } from "firebase/firestore";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

// Import the shared User type
import type { User } from "@/types";

export default function ProfilePage() {
  const { user, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [firestoreData, setFirestoreData] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function fetchFirestoreData() {
      if (user?.uid) {
        const data = await getFirestoreUserProfileByUid(user.uid);
        setFirestoreData(data);
        setPhoneNumber(data?.phoneNumber || "");
        setDisplayName(data?.displayName || ""); // Ensure displayName is updated
      }
    }
    fetchFirestoreData();
  }, [user?.uid]);

  // Update handleUpdateDetails to update all fields except photo
  const handleUpdateDetails = async () => {
    if (!user?.uid || !db) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName,
        phoneNumber,
        updatedAt: new Date(),
      });

      toast({ title: "Success", description: "Details updated successfully." });

      // After updating Firestore, refresh the user profile
      await refreshUserProfile();
    } catch (error) {
      console.error("Error updating details:", error);
      toast({
        title: "Error",
        description: "Failed to update details.",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast({
        title: "Success",
        description: "Password changed successfully.",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: "Failed to change password.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container border mx-auto p-6 card bg-card shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="password">Change Password</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <form className="space-y-4">
            <div>
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                className="mt-2"
              />
            </div>
            {firestoreData && (
              <>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={firestoreData.department || ""}
                    disabled
                    className="mt-2"
                  />
                </div>
              </>
            )}
            <Button
              type="button"
              onClick={handleUpdateDetails}
              className="mt-4"
            >
              Update Details
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="password">
          <form className="space-y-4">
            <div>
              <Label htmlFor="old-password">Old Password</Label>
              <Input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter your old password"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="mt-2"
              />
            </div>
            <Button
              type="button"
              onClick={handleChangePassword}
              className="mt-4"
            >
              Change Password
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
