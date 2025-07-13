import { Suspense } from 'react';
import PermissionManagementDashboard from '@/components/dashboard/permissions/PermissionManagementDashboard';
import { Shield } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';

export default function PermissionsPage() {
  return (
    <PermissionGate 
      permissions={["users.permissions.grant", "users.permissions.revoke", "users.roles.manage"]}
      requireAll={false}
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You don't have permission to access permission management.
            </p>
          </div>
        </div>
      }
    >
      <div className="container mx-auto py-6">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto mb-4 animate-spin" />
              <p>Loading permission management dashboard...</p>
            </div>
          </div>
        }>
          <PermissionManagementDashboard />
        </Suspense>
      </div>
    </PermissionGate>
  );
}