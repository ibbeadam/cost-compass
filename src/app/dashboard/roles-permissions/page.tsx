import { Suspense } from 'react';
import RolePermissionManagement from '@/components/dashboard/roles-permissions/RolePermissionManagement';
import { Shield, Loader2 } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';

export const metadata = {
  title: 'Role & Permission Management | Cost Compass',
  description: 'Manage role-based permissions and access control for your organization',
};

export default function RolePermissionPage() {
  return (
    <PermissionGate 
      permissions={["users.roles.manage", "system.roles.read", "system.roles.update"]}
      requireAll={false}
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You don't have permission to access role and permission management.
            </p>
          </div>
        </div>
      }
    >
      <div className="container mx-auto py-6">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 mr-2 text-blue-600" />
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
              <p className="text-gray-600">Loading role and permission management...</p>
            </div>
          </div>
        }>
          <RolePermissionManagement />
        </Suspense>
      </div>
    </PermissionGate>
  );
}