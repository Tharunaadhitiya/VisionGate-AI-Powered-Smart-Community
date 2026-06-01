'use client';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatBot from '@/components/chatbot/ChatBot';
import VoiceCommandButton from '@/components/voice/VoiceCommandButton';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-surface-400 text-sm">Loading VisionGate...</p>
      </div>
    </div>
  );
  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <Sidebar />
      <ChatBot />
      <VoiceCommandButton />
      <div className="lg:ml-64">
        <Header />
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              variants={pageVariants}
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
