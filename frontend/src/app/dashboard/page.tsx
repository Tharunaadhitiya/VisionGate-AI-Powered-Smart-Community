'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    router.replace(`/dashboard/${user.role}`);
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
    </div>
  );
}
