import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RolePermissionManagement from '@/components/dashboard/roles-permissions/RolePermissionManagement';
import { Shield, Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Role & Permission Management | Cost Compass',
  description: 'Manage role-based permissions and access control for your organization',
};

export default async function RolePermissionPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Only super admins can access role and permission management
  if (session.user.role !== 'super_admin') {
    redirect('/dashboard');
  }

  return (
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
  );
}