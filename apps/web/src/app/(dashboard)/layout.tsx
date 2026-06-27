'use client';

import { AppLayout } from '../../components/layout/AppLayout/AppLayout';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Basic title mapping for MVP
  const getTitle = () => {
    if (pathname.includes('/noc/chat')) return 'NOC Chatbot';
    if (pathname.includes('/operation/chat')) return 'Operation Chatbot';
    if (pathname.includes('/admin/dashboard')) return 'Admin Dashboard';
    if (pathname.includes('/admin/accounts')) return 'Manage Accounts';
    if (pathname.includes('/admin/sync')) return 'Knowledge Sync';
    if (pathname.includes('/admin/cases')) return 'Case Logs';
    if (pathname.includes('/admin/settings')) return 'Settings';
    return 'Chatbot Gate';
  };

  return <AppLayout title={getTitle()}>{children}</AppLayout>;
}
