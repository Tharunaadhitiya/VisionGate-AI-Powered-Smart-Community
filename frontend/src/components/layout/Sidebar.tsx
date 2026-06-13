'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  Home, Users, Shield, Bell, AlertTriangle, FileText, CreditCard,
  Calendar, Camera, BarChart3, MessageSquare, LogOut,
  X, Menu,   BookUser, Megaphone, Bug, Package, Search, Briefcase, Settings,
} from 'lucide-react';
import { useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';

const roleLinks: Record<string, { href: string; label: string; icon: any }[]> = {
  admin: [
    { href: '/dashboard/admin', label: 'Dashboard', icon: Home },
    { href: '/visitors', label: 'Visitors', icon: Users },
    { href: '/directory', label: 'Directory', icon: BookUser },
    { href: '/surveillance', label: 'Surveillance', icon: Camera },
    { href: '/complaints', label: 'Complaints', icon: FileText },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/notices', label: 'Notices', icon: Megaphone },
    { href: '/incidents', label: 'Incidents', icon: Bug },
    { href: '/alerts', label: 'Alerts', icon: Bell },
    { href: '/inbox', label: 'Inbox', icon: MessageSquareText },
    { href: '/packages', label: 'Packages', icon: Package },
    { href: '/lost-and-found', label: 'Lost & Found', icon: Search },
    { href: '/skills', label: 'Skills', icon: Briefcase },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  security: [
    { href: '/dashboard/security', label: 'Dashboard', icon: Home },
    { href: '/visitors', label: 'Visitor Entry', icon: Users },
    { href: '/packages', label: 'Packages', icon: Package },
    { href: '/lost-and-found', label: 'Lost & Found', icon: Search },
    { href: '/skills', label: 'Skills', icon: Briefcase },
    { href: '/directory', label: 'Directory', icon: BookUser },
    { href: '/surveillance', label: 'Surveillance', icon: Camera },
    { href: '/notices', label: 'Notices', icon: Megaphone },
    { href: '/alerts', label: 'Alerts', icon: Bell },
    { href: '/inbox', label: 'Inbox', icon: MessageSquareText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  resident: [
    { href: '/dashboard/resident', label: 'Dashboard', icon: Home },
    { href: '/visitors', label: 'My Visitors', icon: Users },
    { href: '/packages', label: 'My Packages', icon: Package },
    { href: '/lost-and-found', label: 'Lost & Found', icon: Search },
    { href: '/skills', label: 'Skills', icon: Briefcase },
    { href: '/directory', label: 'Directory', icon: BookUser },
    { href: '/complaints', label: 'Complaints', icon: FileText },
    { href: '/maintenance', label: 'Maintenance', icon: CreditCard },
    { href: '/amenities', label: 'Amenities', icon: Calendar },
    { href: '/notices', label: 'Notices', icon: Megaphone },
    { href: '/incidents', label: 'Incidents', icon: Bug },
    { href: '/alerts', label: 'Alerts', icon: Bell },
    { href: '/inbox', label: 'Inbox', icon: MessageSquareText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 25 } },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const isContrastBlack = theme === 'contrast-black';
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = user ? roleLinks[user.role] || roleLinks.resident : [];

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 glass-card"
      >
        <Menu className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-64 glass-card-strong border-r border-surface-200/50 dark:border-surface-700/50 transform transition-transform duration-300 ease-out lg:translate-x-0',
        isContrastBlack && 'dark:bg-surface-950/95',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b border-surface-200/50 dark:border-surface-700/50">
            <Link href="/" className="flex items-center gap-2.5 group">
              <motion.div
                whileHover={{ rotate: -10, scale: 1.1 }}
                className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow"
              >
                <Shield className="w-4.5 h-4.5 text-white" />
              </motion.div>
              <span className="font-bold text-lg tracking-tight">
                <span className="text-gradient-premium">Vision</span><span className="text-surface-400">Gate</span>
              </span>
            </Link>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-hide">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-0.5"
            >
              {links.map((link, i) => {
                const Icon = link.icon;
                const active = pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <motion.div key={link.href} variants={itemVariants}>
                    <Link href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group overflow-hidden',
                        active
                          ? 'text-primary-700 dark:text-primary-400'
                          : 'text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200'
                      )}
                    >
                      {active && (
                        <motion.div
                          layoutId="sidebar-active"
                          className={cn(
                            'absolute inset-0 rounded-xl',
                            isContrastBlack ? 'bg-primary-500/15' : 'bg-primary-50 dark:bg-primary-500/10'
                          )}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                      {active && (
                        <motion.div
                          layoutId="sidebar-glow"
                          className={cn(
                            'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full',
                            isContrastBlack ? 'shadow-lg shadow-primary-500/70' : 'shadow-lg shadow-primary-500/50'
                          )}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                      <motion.div
                        whileHover={{ x: 3 }}
                        transition={{ duration: 0.12 }}
                        className={cn(
                          'relative z-10 w-5 h-5 flex items-center justify-center transition-colors duration-200',
                          active ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 group-hover:text-surface-600 dark:group-hover:text-surface-300'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </motion.div>
                      <span className="relative z-10">{link.label}</span>
                      {active && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-auto relative z-10 w-1.5 h-1.5 rounded-full bg-primary-500 shadow-sm shadow-primary-500/50"
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </nav>

          <div className="p-3 border-t border-surface-200/50 dark:border-surface-700/50">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-secondary-500 border-2 border-white dark:border-surface-900 rounded-full" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-surface-900 dark:text-surface-100">{user?.name}</p>
                <p className="text-xs text-surface-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-surface-500 dark:text-surface-400 hover:bg-danger-50 dark:hover:bg-danger-500/10 hover:text-danger-600 dark:hover:text-danger-400 transition-all duration-200 group"
            >
              <LogOut className="w-4.5 h-4.5 transition-transform group-hover:-translate-x-0.5" />
              Sign Out
            </motion.button>
          </div>
        </div>
      </aside>
    </>
  );
}
