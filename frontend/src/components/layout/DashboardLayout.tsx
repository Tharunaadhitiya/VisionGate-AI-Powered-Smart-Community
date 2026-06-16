'use client';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatBot from '@/components/chatbot/ChatBot';
import VoiceCommandButton from '@/components/voice/VoiceCommandButton';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar, SidebarProvider } from '@/hooks/useSidebar';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition } from '@/lib/animation';
import { cn } from '@/lib/utils';

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { expanded } = useSidebar();
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <Sidebar />
      <ChatBot />
      <VoiceCommandButton />
      <div className={cn(
        'bg-surface-50 dark:bg-surface-950 main-content-area transition-all duration-300 ease-out',
        expanded ? 'lg:ml-64' : 'lg:ml-20'
      )}>
        <Header />
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          <AnimatePresence>
            <motion.div
              key={pathname}
              variants={pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  );
}
