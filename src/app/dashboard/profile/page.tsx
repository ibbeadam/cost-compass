"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserAction } from "@/actions/prismaUserActions";
import { showToast } from "@/lib/toast";
import { User2, Phone, Mail, Building, Shield, Calendar, Activity, Settings, Eye, EyeOff, Camera, Clock, MapPin, Monitor, FileText, ChevronLeft, ChevronRight, Upload, Trash2 } from "lucide-react";

// Import the shared User type
import type { User, AuditLog } from "@/types";
import { RecordsPerPageSelector } from "@/components/ui/records-per-page-selector";

export default function ProfilePage() {
  const { user: sessionUser, userProfile, refreshUserProfile } = useAuth();
  const user = userProfile || sessionUser; // Use userProfile for complete data, fallback to sessionUser
  const [userData, setUserData] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  // Initialize from localStorage if available
  const getInitialPerPage = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('profileActivityLogPerPage');
      return stored ? parseInt(stored, 10) : 25;
    }
    return 25;
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(getInitialPerPage());
  const [total, setTotal] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setUserData(userProfile);
      setDisplayName(userProfile.name || "");
      setPhoneNumber(userProfile.phoneNumber || "");
      // Load activity logs when user data is available
      loadActivityLogs();
    }
  }, [userProfile, itemsPerPage]);

  const handleUpdateDetails = async () => {
    if (!userProfile?.id) return;

    setIsUpdating(true);
    try {
      const result = await updateUserAction(userProfile.id, {
        name: displayName,
        phoneNumber,
      });

      // Since result does not have 'success' or 'error', just assume success if no error thrown
      showToast.success("Profile updated successfully.");
      await refreshUserProfile();
    } catch (error) {
      console.error("Error updating details:", error);
      showToast.error("Failed to update profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!userProfile?.id) return;

    if (newPassword !== confirmPassword) {
      showToast.error("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 8) {
      showToast.error("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      // This would need to be implemented in your user actions
      // For now, showing a placeholder
      showToast.info("Password change functionality needs to be implemented.");
      
      // Reset form
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      showToast.error("Failed to change password.");
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-100 text-red-800";
      case "property_owner":
        return "bg-purple-100 text-purple-800";
      case "property_admin":
        return "bg-blue-100 text-blue-800";
      case "regional_manager":
        return "bg-green-100 text-green-800";
      case "property_manager":
        return "bg-orange-100 text-orange-800";
      case "supervisor":
        return "bg-yellow-100 text-yellow-800";
      case "user":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatRole = (role: string) => {
    return role.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "login":
        return <User2 className="w-4 h-4" />;
      case "logout":
        return <User2 className="w-4 h-4" />;
      case "create":
        return <FileText className="w-4 h-4" />;
      case "update":
        return <Settings className="w-4 h-4" />;
      case "delete":
        return <Settings className="w-4 h-4" />;
      case "view":
        return <Eye className="w-4 h-4" />;
      case "export":
        return <FileText className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "login":
        return "text-green-600";
      case "logout":
        return "text-gray-600";
      case "create":
        return "text-blue-600";
      case "update":
        return "text-orange-600";
      case "delete":
        return "text-red-600";
      case "view":
        return "text-purple-600";
      case "export":
        return "text-indigo-600";
      default:
        return "text-gray-600";
    }
  };

  const loadActivityLogs = async (page = 1) => {
    if (!userProfile?.id) return;
    setLoadingActivity(true);
    try {
      // Fetch user's recent activity from the last 30 days
      const response = await fetch(`/api/user/activity?limit=${itemsPerPage}&page=${page}&days=30`);
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      const data = await response.json();
      setActivityLogs(data.logs || []);
      setCurrentPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error loading activity logs:", error);
      showToast.error("Failed to load activity logs");
    } finally {
      setLoadingActivity(false);
    }
  };

  const getRelativeTime = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(date);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || loadingActivity) return;
    setCurrentPage(page);
    loadActivityLogs(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('profileActivityLogPerPage', newItemsPerPage.toString());
    }
    // Reload activity logs with new page size
    loadActivityLogs(1);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage, endPage;

    if (totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalPages;
    } else {
      if (currentPage <= Math.ceil(maxPagesToShow / 2)) {
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (currentPage + Math.floor(maxPagesToShow / 2) >= totalPages) {
        startPage = totalPages - maxPagesToShow + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - Math.floor(maxPagesToShow / 2);
        endPage = currentPage + Math.floor(maxPagesToShow / 2);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="icon"
          className="h-9 w-9"
          onClick={() => handlePageChange(i)}
          disabled={loadingActivity}
        >
          {i}
        </Button>
      );
    }
    return pageNumbers;
  };

  const startIndexDisplay = total > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndexDisplay = total > 0 ? Math.min(currentPage * itemsPerPage, total) : 0;

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast.error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast.error('File size too large. Maximum size is 5MB.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/user/profile-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        showToast.success('Profile image updated successfully!');
        await refreshUserProfile();
        setImagePreview(null);
      } else {
        showToast.error(data.error || 'Failed to upload image');
        setImagePreview(null);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast.error('Failed to upload image');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
      // Reset the input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    setUploadingImage(true);
    try {
      const response = await fetch('/api/user/profile-image', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        showToast.success('Profile image removed successfully!');
        await refreshUserProfile();
      } else {
        showToast.error(data.error || 'Failed to remove image');
      }
    } catch (error) {
      console.error('Error removing image:', error);
      showToast.error('Failed to remove image');
    } finally {
      setUploadingImage(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <p className="text-muted-foreground">Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative group">
              <Avatar className="w-24 h-24">
                <AvatarImage 
                  src={imagePreview || user?.profileImage || undefined} 
                  alt={user?.name || "User"}
                />
                <AvatarFallback className="text-2xl">
                  {getInitials(user.name || user.email)}
                </AvatarFallback>
              </Avatar>
              
              {/* Upload overlay */}
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex gap-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="profile-image-upload"
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="profile-image-upload"
                    className="cursor-pointer bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-white" />
                  </label>
                  
                  {(user.profileImage || imagePreview) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 h-auto"
                      onClick={handleRemoveImage}
                      disabled={uploadingImage}
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Loading indicator */}
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
              
              {/* Camera icon for desktop */}
              <div className="absolute -bottom-2 -right-2 bg-background border rounded-full p-1 group-hover:scale-110 transition-transform">
                <Camera className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{user.name || "Unnamed User"}</h1>
              <p className="text-muted-foreground mb-2">{user.email}</p>
              <div className="flex flex-wrap gap-2">
                <Badge className={getRoleColor(user.role)}>
                  <Shield className="w-3 h-3 mr-1" />
                  {formatRole(user.role)}
                </Badge>
                <Badge variant={user.isActive ? "default" : "secondary"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Member Since</p>
                <p className="text-2xl font-bold">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Last Login</p>
                <p className="text-2xl font-bold">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Properties Access</p>
                <p className="text-2xl font-bold">{user.propertyAccess?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Management Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Personal Details</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="access">Property Access</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Image Upload Section */}
              <div className="flex flex-col items-center space-y-4 pb-6 border-b">
                <Avatar className="w-32 h-32">
                  <AvatarImage 
                    src={imagePreview || user?.profileImage || undefined} 
                    alt={user?.name || "User"}
                  />
                  <AvatarFallback className="text-4xl">
                    {getInitials(user.name || user.email)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="profile-image-upload-details"
                    disabled={uploadingImage}
                  />
                  <label htmlFor="profile-image-upload-details">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingImage}
                      className="cursor-pointer"
                      asChild
                    >
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingImage ? "Uploading..." : "Upload Photo"}
                      </span>
                    </Button>
                  </label>
                  
                  {(user.profileImage || imagePreview) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={uploadingImage}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Upload a profile picture. Max size: 5MB. Supported formats: JPEG, PNG, WebP.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={user.email}
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
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={user.department || ""}
                    disabled
                    className="mt-2"
                  />
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleUpdateDetails}
                  disabled={isUpdating}
                  className="min-w-32"
                >
                  {isUpdating ? "Updating..." : "Update Details"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and password settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="old-password">Current Password</Label>
                  <div className="relative mt-2">
                    <Input
                      id="old-password"
                      type={showPassword ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Enter your current password"
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
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={isLoading || !oldPassword || !newPassword || !confirmPassword}
                  className="min-w-32"
                >
                  {isLoading ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Property Access</CardTitle>
              <CardDescription>
                View your property access permissions and roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.propertyAccess && user.propertyAccess.length > 0 ? (
                <div className="space-y-4">
                  {user.propertyAccess.map((access: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{access.property?.name || "Unknown Property"}</h4>
                        <p className="text-sm text-muted-foreground">
                          Access Level: {formatRole(access.accessLevel)}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {access.expiresAt ? `Expires ${formatDate(access.expiresAt)}` : "Permanent"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No property access permissions assigned.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                View your recent actions and account activity history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm font-medium">Last 30 days ({total} total entries)</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadActivityLogs(currentPage)}
                  disabled={loadingActivity}
                >
                  {loadingActivity ? "Loading..." : "Refresh"}
                </Button>
              </div>
              
              {loadingActivity ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading activity...</p>
                </div>
              ) : activityLogs.length > 0 ? (
                <div className="space-y-4">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={`p-2 rounded-full bg-muted ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {log.action.charAt(0) + log.action.slice(1).toLowerCase()}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {log.resource.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          {log.resourceId && (
                            <Badge variant="secondary" className="text-xs">
                              ID: {log.resourceId}
                            </Badge>
                          )}
                        </div>
                        
                        {log.details && (
                          <div className="text-sm text-muted-foreground mb-2">
                            {log.action === "LOGIN" && log.details.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{log.details.location}</span>
                                <span className="mx-1">•</span>
                                <Monitor className="w-3 h-3" />
                                <span>{log.details.device}</span>
                              </div>
                            )}
                            {log.action === "UPDATE" && log.details.changes && (
                              <span>
                                {Object.keys(log.details.changes).length} field(s) updated
                              </span>
                            )}
                            {log.action === "VIEW" && log.details.reportType && (
                              <span>
                                Viewed {log.details.reportType} ({log.details.dateRange})
                              </span>
                            )}
                            {log.action === "EXPORT" && log.details.format && (
                              <span>
                                Exported {log.details.recordCount || log.details.exportCount} records as {log.details.format || 'CSV'}
                              </span>
                            )}
                            {log.action === "CREATE" && log.details.created && (
                              <span>
                                Created {log.resource.replace('_', ' ')}
                              </span>
                            )}
                            {log.action === "DELETE" && log.details.deleted && (
                              <span>
                                Deleted {log.resource.replace('_', ' ')}
                              </span>
                            )}
                            {/* Fallback for other details */}
                            {!['LOGIN', 'UPDATE', 'VIEW', 'EXPORT', 'CREATE', 'DELETE'].includes(log.action) && (
                              <span>
                                {JSON.stringify(log.details).substring(0, 100)}...
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{getRelativeTime(log.timestamp)}</span>
                          {log.ipAddress && (
                            <>
                              <span className="mx-1">•</span>
                              <span>{log.ipAddress}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No recent activity</p>
                  <p className="text-sm text-muted-foreground">
                    Your account activity from the last 30 days will appear here
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="mt-4"
                  >
                    Refresh Activity
                  </Button>
                </div>
              )}
              
              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndexDisplay} to {endIndexDisplay} of {total} results
                  </div>
                  <RecordsPerPageSelector
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    disabled={loadingActivity}
                    options={[10, 25, 50, 100]}
                  />
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loadingActivity}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous Page</span>
                    </Button>
                    {renderPageNumbers()}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || loadingActivity}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next Page</span>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
