"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Key, AlertTriangle, CheckCircle, Copy, RefreshCw } from "lucide-react";
import { showToast } from "@/lib/toast";
import type { User } from "@/types";

interface PasswordResetDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordReset: () => void;
}

export function PasswordResetDialog({
  user,
  open,
  onOpenChange,
  onPasswordReset,
}: PasswordResetDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showGeneratedPassword, setShowGeneratedPassword] = useState(false);

  const validatePassword = (password: string) => {
    const errors = [];
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }
    return { isValid: errors.length === 0, errors };
  };

  const generateSecurePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    let password = "";
    
    // Ensure at least one character from each required category
    const categories = [
      "abcdefghijklmnopqrstuvwxyz", // lowercase
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ", // uppercase
      "0123456789", // numbers
      "!@#$%^&*()_+-=[]{}|;:,.<>?" // special characters
    ];
    
    // Add one character from each category
    categories.forEach(category => {
      password += category.charAt(Math.floor(Math.random() * category.length));
    });
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleGeneratePassword = () => {
    const generated = generateSecurePassword();
    setGeneratedPassword(generated);
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowGeneratedPassword(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast.success("Password copied to clipboard");
    } catch (error) {
      showToast.error("Failed to copy password to clipboard");
    }
  };

  const handleSubmit = () => {
    if (!user) return;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      showToast.error("Passwords do not match");
      return;
    }

    // Validate password strength
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      showToast.error(validation.errors[0]);
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmReset = async () => {
    if (!user) return;

    setIsResetting(true);
    try {
      const response = await fetch(`/api/users/${user.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast.success(`Password reset successfully for ${user.name || user.email}`);
        onPasswordReset();
        handleClose();
      } else {
        showToast.error(data.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      showToast.error("Failed to reset password");
    } finally {
      setIsResetting(false);
      setShowConfirmDialog(false);
    }
  };

  const handleClose = () => {
    setNewPassword("");
    setConfirmPassword("");
    setGeneratedPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowGeneratedPassword(false);
    setShowConfirmDialog(false);
    onOpenChange(false);
  };

  const passwordValidation = validatePassword(newPassword);
  const isFormValid = newPassword && confirmPassword && newPassword === confirmPassword && passwordValidation.isValid;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Reset the password for <strong>{user?.name || user?.email}</strong>. 
              The user will need to use the new password for their next login.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Password Generation Section */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Generate Secure Password</p>
                <p className="text-xs text-muted-foreground">
                  Create a strong password automatically
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeneratePassword}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Generate
              </Button>
            </div>

            {/* Generated Password Display */}
            {showGeneratedPassword && generatedPassword && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-green-800">
                    Secure password generated and filled in forms below
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedPassword)}
                    className="h-auto p-1 text-green-600 hover:text-green-700"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Manual Password Input */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Password Requirements */}
            {newPassword && !passwordValidation.isValid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Password requirements:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      {passwordValidation.errors.map((error, index) => (
                        <li key={index} className="list-disc">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Password Mismatch Warning */}
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Passwords do not match
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || isResetting}
              className="flex items-center gap-2"
            >
              <Key className="h-4 w-4" />
              {isResetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Password Reset
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the password for{" "}
              <strong>{user?.name || user?.email}</strong>?
              <br />
              <br />
              This action cannot be undone and the user will need to use the new password immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? "Resetting..." : "Reset Password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}