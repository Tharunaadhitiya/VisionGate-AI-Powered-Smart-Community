'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import UserDirectory from '@/components/dashboard/UserDirectory';

export default function DirectoryPage() {
  return (
    <DashboardLayout>
      <UserDirectory onClose={() => {}} variant="page" />
    </DashboardLayout>
  );
}
