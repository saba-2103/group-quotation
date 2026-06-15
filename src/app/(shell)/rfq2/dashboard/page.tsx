'use client';

import { redirect } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import { SalesDashboard } from '@/components/dashboard/SalesDashboard';
import { SupervisorDashboard } from '@/components/dashboard/SupervisorDashboard';
import { HeadDashboard } from '@/components/dashboard/HeadDashboard';
import { UnderwriterDashboard } from '@/components/dashboard/UnderwriterDashboard';
import { ActuarialDashboard } from '@/components/dashboard/ActuarialDashboard';
import { OpsDashboard } from '@/components/dashboard/OpsDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';

export default function DashboardPage() {
  const { currentRole, salesLevel } = useRole();

  switch (currentRole) {
    case 'SALES':
      if (salesLevel >= 5) return <HeadDashboard />;
      if (salesLevel >= 4) return <SupervisorDashboard />;
      return <SalesDashboard level={salesLevel} />;
    case 'UNDERWRITER':
      return <UnderwriterDashboard />;
    case 'ACTUARY':
    case 'ACTUARIAL':
      return <ActuarialDashboard />;
    case 'OPS':
      return <OpsDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    default:
      redirect('/rfq2/quotes');
  }
}
