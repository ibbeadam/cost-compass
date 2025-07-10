import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SecurityDashboardContainer from '@/components/dashboard/security/SecurityDashboardContainer';
import { Shield } from 'lucide-react';

export default async function SecurityPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Only super admins can access security dashboard
  if (session.user.role !== 'super_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="w-8 h-8 mx-auto mb-4 animate-spin" />
            <p>Loading security dashboard...</p>
          </div>
        </div>
      }>
        <SecurityDashboardContainer />
      </Suspense>
    </div>
  );
}