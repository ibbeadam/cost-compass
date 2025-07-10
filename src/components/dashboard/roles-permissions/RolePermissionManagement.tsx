"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Users,
  Key,
  Search,
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  Minus,
  Filter,
  BarChart3,
  Settings,
  Check,
  X,
  AlertTriangle,
  Loader2,
  RefreshCw
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { showToast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { UserRole } from "@/types";
import { PermissionCategory, PermissionAction } from "@/lib/permissions";

interface Permission {
  id: number;
  name: string;
  description: string | null;
  category: PermissionCategory;
  resource: string;
  action: PermissionAction;
  assigned: boolean;
}

interface RoleWithPermissions {
  role: UserRole;
  permissions: Permission[];
}

interface RolePermissionStats {
  totalRoles: number;
  totalPermissions: number;
  totalAssignments: number;
  roleStats: Array<{
    role: UserRole;
    permissionCount: number;
    percentage: number;
  }>;
  categoryStats: Array<{
    category: PermissionCategory;
    totalPermissions: number;
    assignedPermissions: number;
    coverage: number;
  }>;
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  property_owner: "Property Owner",
  property_admin: "Property Admin",
  regional_manager: "Regional Manager",
  property_manager: "Property Manager",
  supervisor: "Supervisor",
  user: "User",
  readonly: "Read Only"
};

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "bg-red-100 text-red-800",
  property_owner: "bg-purple-100 text-purple-800",
  property_admin: "bg-blue-100 text-blue-800",
  regional_manager: "bg-indigo-100 text-indigo-800",
  property_manager: "bg-green-100 text-green-800",
  supervisor: "bg-yellow-100 text-yellow-800",
  user: "bg-gray-100 text-gray-800",
  readonly: "bg-slate-100 text-slate-800"
};

const CATEGORY_COLORS: Record<PermissionCategory, string> = {
  SYSTEM_ADMIN: "bg-red-100 text-red-800",
  USER_MANAGEMENT: "bg-blue-100 text-blue-800",
  PROPERTY_MANAGEMENT: "bg-green-100 text-green-800",
  FINANCIAL_DATA: "bg-purple-100 text-purple-800",
  REPORTING: "bg-indigo-100 text-indigo-800",
  OUTLET_MANAGEMENT: "bg-orange-100 text-orange-800",
  COST_INPUT: "bg-teal-100 text-teal-800",
  DASHBOARD_ACCESS: "bg-cyan-100 text-cyan-800"
};

export default function RolePermissionManagement() {
  const [rolesData, setRolesData] = useState<RoleWithPermissions[]>([]);
  const [stats, setStats] = useState<RolePermissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState("manage");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PermissionCategory | "all">("all");
  const [showOnlyAssigned, setShowOnlyAssigned] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<PermissionCategory>>(new Set());
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copySettings, setCopySettings] = useState({
    sourceRole: null as UserRole | null,
    targetRole: null as UserRole | null,
    overwrite: false
  });
  const [submitting, setSubmitting] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load roles and permissions
      const rolesResponse = await fetch("/api/roles-permissions");
      if (!rolesResponse.ok) {
        throw new Error("Failed to fetch roles and permissions");
      }
      const rolesResult = await rolesResponse.json();
      setRolesData(rolesResult.roles || []);

      // Load stats
      const statsResponse = await fetch("/api/roles-permissions?action=stats");
      if (!statsResponse.ok) {
        throw new Error("Failed to fetch statistics");
      }
      const statsResult = await statsResponse.json();
      setStats(statsResult);

    } catch (error) {
      console.error("Failed to load data:", error);
      showToast.error("Failed to load role permission data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get current role data
  const currentRoleData = selectedRole ? rolesData.find(r => r.role === selectedRole) : null;

  // Filter permissions
  const filteredPermissions = currentRoleData?.permissions.filter(permission => {
    const matchesSearch = !searchTerm || 
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.resource.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || permission.category === selectedCategory;
    const matchesAssignedFilter = !showOnlyAssigned || permission.assigned;
    
    return matchesSearch && matchesCategory && matchesAssignedFilter;
  }) || [];

  // Group permissions by category
  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<PermissionCategory, Permission[]>);

  // Handle permission toggle
  const handlePermissionToggle = async (permissionId: number, currentlyAssigned: boolean) => {
    if (!selectedRole) return;

    try {
      setSubmitting(true);

      if (currentlyAssigned) {
        // Remove permission
        const response = await fetch("/api/roles-permissions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "remove",
            role: selectedRole,
            permissionId
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to remove permission");
        }

        showToast.success("Permission removed successfully");
      } else {
        // Add permission
        const response = await fetch("/api/roles-permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "assign",
            role: selectedRole,
            permissionId
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to assign permission");
        }

        showToast.success("Permission assigned successfully");
      }

      // Reload data
      await loadData();
    } catch (error) {
      console.error("Error toggling permission:", error);
      showToast.error((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle bulk operations
  const handleBulkOperation = async (operation: "assign" | "remove") => {
    if (!selectedRole || selectedPermissions.size === 0) return;

    try {
      setSubmitting(true);

      const permissionIds = Array.from(selectedPermissions);
      const response = await fetch("/api/roles-permissions", {
        method: operation === "assign" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: operation === "assign" ? "bulk-assign" : "bulk-remove",
          role: selectedRole,
          permissionIds
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${operation} permissions`);
      }

      const result = await response.json();
      
      if (operation === "assign") {
        showToast.success(`${result.assigned} permissions assigned, ${result.skipped} skipped`);
      } else {
        showToast.success(`${result.removed} permissions removed, ${result.notFound} not found`);
      }

      // Clear selection and reload data
      setSelectedPermissions(new Set());
      setShowBulkActions(false);
      await loadData();
    } catch (error) {
      console.error("Error in bulk operation:", error);
      showToast.error((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle copy permissions
  const handleCopyPermissions = async () => {
    if (!copySettings.sourceRole || !copySettings.targetRole) return;

    try {
      setSubmitting(true);

      const response = await fetch("/api/roles-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "copy",
          sourceRole: copySettings.sourceRole,
          targetRole: copySettings.targetRole,
          overwrite: copySettings.overwrite
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to copy permissions");
      }

      const result = await response.json();
      showToast.success(`${result.copied} permissions copied, ${result.skipped} skipped`);

      // Reset and reload
      setShowCopyDialog(false);
      setCopySettings({ sourceRole: null, targetRole: null, overwrite: false });
      await loadData();
    } catch (error) {
      console.error("Error copying permissions:", error);
      showToast.error((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle category expansion
  const toggleCategory = (category: PermissionCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Role & Permission Management
          </h1>
          <p className="text-gray-600">Manage role-based permissions for your system</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setShowCopyDialog(true)}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Permissions
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRoles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPermissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssignments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Coverage</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(stats.totalAssignments / (stats.totalRoles * stats.totalPermissions) * 100)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="manage">Manage Permissions</TabsTrigger>
          <TabsTrigger value="overview">Role Overview</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6">
          {/* Role Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Role to Manage</CardTitle>
              <CardDescription>Choose a role to view and modify its permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedRole || ""} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent>
                  {rolesData.map((roleData) => {
                    const assignedCount = roleData.permissions.filter(p => p.assigned).length;
                    const totalCount = roleData.permissions.length;
                    const percentage = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0;
                    
                    return (
                      <SelectItem key={roleData.role} value={roleData.role}>
                        <div className="flex items-center justify-between w-full">
                          <span>{ROLE_LABELS[roleData.role]}</span>
                          <Badge variant="outline" className="ml-2">
                            {assignedCount}/{totalCount} ({percentage}%)
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Permission Management */}
          {selectedRole && currentRoleData && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Permissions for 
                      <Badge className={cn("ml-2", ROLE_COLORS[selectedRole])}>
                        {ROLE_LABELS[selectedRole]}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {currentRoleData.permissions.filter(p => p.assigned).length} of {currentRoleData.permissions.length} permissions assigned
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPermissions.size > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBulkActions(!showBulkActions)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Bulk Actions ({selectedPermissions.size})
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search permissions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as PermissionCategory | "all")}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.values(PermissionCategory).map(category => (
                        <SelectItem key={category} value={category}>
                          {category.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-assigned"
                      checked={showOnlyAssigned}
                      onCheckedChange={setShowOnlyAssigned}
                    />
                    <Label htmlFor="show-assigned">Assigned only</Label>
                  </div>
                </div>

                {/* Bulk Actions */}
                {showBulkActions && selectedPermissions.size > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-800">
                        {selectedPermissions.size} permissions selected
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleBulkOperation("assign")}
                          disabled={submitting}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Assign All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkOperation("remove")}
                          disabled={submitting}
                        >
                          <Minus className="h-4 w-4 mr-1" />
                          Remove All
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedPermissions(new Set());
                            setShowBulkActions(false);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Permissions List */}
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([category, permissions]) => (
                    <div key={category} className="border rounded-lg">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleCategory(category as PermissionCategory)}
                      >
                        <div className="flex items-center gap-3">
                          {expandedCategories.has(category as PermissionCategory) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <Badge className={CATEGORY_COLORS[category as PermissionCategory]}>
                            {category.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {permissions.filter(p => p.assigned).length}/{permissions.length} assigned
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={permissions.every(p => selectedPermissions.has(p.id))}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedPermissions);
                              if (checked) {
                                permissions.forEach(p => newSelected.add(p.id));
                              } else {
                                permissions.forEach(p => newSelected.delete(p.id));
                              }
                              setSelectedPermissions(newSelected);
                            }}
                          />
                        </div>
                      </div>
                      
                      {expandedCategories.has(category as PermissionCategory) && (
                        <div className="border-t">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">Select</TableHead>
                                <TableHead>Permission</TableHead>
                                <TableHead>Resource</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-center">Assigned</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {permissions.map((permission) => (
                                <TableRow key={permission.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedPermissions.has(permission.id)}
                                      onCheckedChange={(checked) => {
                                        const newSelected = new Set(selectedPermissions);
                                        if (checked) {
                                          newSelected.add(permission.id);
                                        } else {
                                          newSelected.delete(permission.id);
                                        }
                                        setSelectedPermissions(newSelected);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">{permission.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{permission.resource}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{permission.action}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-gray-600">
                                    {permission.description || "-"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {permission.assigned ? (
                                      <Check className="h-4 w-4 text-green-500 mx-auto" />
                                    ) : (
                                      <X className="h-4 w-4 text-gray-400 mx-auto" />
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      size="sm"
                                      variant={permission.assigned ? "outline" : "default"}
                                      onClick={() => handlePermissionToggle(permission.id, permission.assigned)}
                                      disabled={submitting}
                                    >
                                      {submitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : permission.assigned ? (
                                        <>
                                          <Minus className="h-4 w-4 mr-1" />
                                          Remove
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="h-4 w-4 mr-1" />
                                          Assign
                                        </>
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {filteredPermissions.length === 0 && (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No permissions found matching your filters</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          {/* Role Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rolesData.map((roleData) => {
              const assignedCount = roleData.permissions.filter(p => p.assigned).length;
              const totalCount = roleData.permissions.length;
              const percentage = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0;
              
              return (
                <Card key={roleData.role}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <Badge className={ROLE_COLORS[roleData.role]}>
                        {ROLE_LABELS[roleData.role]}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRole(roleData.role);
                          setActiveTab("manage");
                        }}
                      >
                        Manage
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Permissions Assigned</span>
                          <span>{assignedCount}/{totalCount}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Category breakdown */}
                      <div className="space-y-2">
                        <span className="text-sm font-medium">By Category:</span>
                        <div className="space-y-1">
                          {Object.values(PermissionCategory).map(category => {
                            const categoryPerms = roleData.permissions.filter(p => p.category === category);
                            const assignedCategoryPerms = categoryPerms.filter(p => p.assigned);
                            
                            if (categoryPerms.length === 0) return null;
                            
                            return (
                              <div key={category} className="flex justify-between text-xs">
                                <span className="text-gray-600">{category.replace(/_/g, " ")}</span>
                                <span>{assignedCategoryPerms.length}/{categoryPerms.length}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          {stats && (
            <>
              {/* Role Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Role Permission Statistics</CardTitle>
                  <CardDescription>Permission coverage by role</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Permissions Assigned</TableHead>
                        <TableHead>Coverage</TableHead>
                        <TableHead>Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.roleStats.map((roleStat) => (
                        <TableRow key={roleStat.role}>
                          <TableCell>
                            <Badge className={ROLE_COLORS[roleStat.role]}>
                              {ROLE_LABELS[roleStat.role]}
                            </Badge>
                          </TableCell>
                          <TableCell>{roleStat.permissionCount}</TableCell>
                          <TableCell>{roleStat.percentage}%</TableCell>
                          <TableCell>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${roleStat.percentage}%` }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Category Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Permission Statistics</CardTitle>
                  <CardDescription>Permission usage by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Total Permissions</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead>Coverage</TableHead>
                        <TableHead>Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.categoryStats.map((categoryStat) => (
                        <TableRow key={categoryStat.category}>
                          <TableCell>
                            <Badge className={CATEGORY_COLORS[categoryStat.category]}>
                              {categoryStat.category.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{categoryStat.totalPermissions}</TableCell>
                          <TableCell>{categoryStat.assignedPermissions}</TableCell>
                          <TableCell>{categoryStat.coverage}%</TableCell>
                          <TableCell>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${categoryStat.coverage}%` }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Copy Permissions Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Copy Role Permissions</DialogTitle>
            <DialogDescription>
              Copy permissions from one role to another. This helps quickly set up new roles.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source-role">Source Role</Label>
              <Select 
                value={copySettings.sourceRole || ""} 
                onValueChange={(value) => setCopySettings(prev => ({ ...prev, sourceRole: value as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source role..." />
                </SelectTrigger>
                <SelectContent>
                  {rolesData.map((roleData) => (
                    <SelectItem key={roleData.role} value={roleData.role}>
                      {ROLE_LABELS[roleData.role]} ({roleData.permissions.filter(p => p.assigned).length} permissions)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target-role">Target Role</Label>
              <Select 
                value={copySettings.targetRole || ""} 
                onValueChange={(value) => setCopySettings(prev => ({ ...prev, targetRole: value as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target role..." />
                </SelectTrigger>
                <SelectContent>
                  {rolesData.filter(r => r.role !== copySettings.sourceRole).map((roleData) => (
                    <SelectItem key={roleData.role} value={roleData.role}>
                      {ROLE_LABELS[roleData.role]} ({roleData.permissions.filter(p => p.assigned).length} permissions)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="overwrite"
                checked={copySettings.overwrite}
                onCheckedChange={(checked) => setCopySettings(prev => ({ ...prev, overwrite: checked }))}
              />
              <Label htmlFor="overwrite">Overwrite existing permissions</Label>
            </div>
            
            {copySettings.overwrite && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Warning</span>
                </div>
                <p className="text-sm text-yellow-600 mt-1">
                  This will remove all existing permissions from the target role before copying.
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCopyPermissions}
              disabled={!copySettings.sourceRole || !copySettings.targetRole || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Copying...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Permissions
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}