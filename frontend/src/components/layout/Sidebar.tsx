'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/hooks/useSidebar';
import {
  Home, Users, Shield, Bell, AlertTriangle, FileText, CreditCard,
  Calendar, Camera, BarChart3, MessageSquare, LogOut,
  X, Menu, BookUser, Megaphone, Bug, Package, Search, Briefcase, Settings,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
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

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const isContrastBlack = theme === 'contrast-black';
  const { expanded, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const pathname = usePathname();
  const links = user ? roleLinks[user.role] || roleLinks.resident : [];

  return (
    <>
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
        'fixed top-0 left-0 z-50 h-full glass-card-strong border-r border-surface-200/50 dark:border-surface-700/50 transition-all duration-300 ease-out',
        isContrastBlack && 'dark:bg-surface-950/95',
        'lg:translate-x-0',
        expanded ? 'w-64' : 'w-20',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          <div className={cn(
            'flex items-center border-b border-surface-200/50 dark:border-surface-700/50 transition-all duration-300 ease-out',
            expanded ? 'justify-between p-5' : 'justify-center p-4'
          )}>
            <Link href="/" className={cn(
              'flex items-center group',
              expanded ? 'gap-2.5' : 'gap-0 justify-center'
            )}>
              <motion.div
                whileHover={{ rotate: -10, scale: 1.1 }}
                className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow shrink-0"
              >
                <Shield className="w-4.5 h-4.5 text-white" />
              </motion.div>
              <span className={cn(
                'font-bold text-lg tracking-tight overflow-hidden transition-all duration-300 ease-out',
                expanded ? 'max-w-[120px] opacity-100 ml-0' : 'max-w-0 opacity-0 ml-0'
              )}>
                <span className="text-gradient-premium">Vision</span><span className="text-surface-400">Gate</span>
              </span>
            </Link>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors',
                expanded ? 'lg:hidden' : 'hidden'
              )}
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-hide">
            <div className="space-y-0.5">
              {links.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link key={link.href} href={link.href}
                    onClick={() => setMobileOpen(false)}
                    title={!expanded ? link.label : undefined}
                    className={cn(
                      'relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 group overflow-hidden',
                      expanded ? 'gap-3 px-3 py-2.5' : 'gap-0 px-0 py-2.5 justify-center',
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
                    <div className={cn(
                      'relative z-10 w-5 h-5 flex items-center justify-center shrink-0 transition-colors duration-200',
                      active ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 group-hover:text-surface-600 dark:group-hover:text-surface-300'
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      'relative z-10 overflow-hidden whitespace-nowrap transition-all duration-300 ease-out',
                      expanded ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0'
                    )}>
                      {link.label}
                    </span>
                    {active && expanded && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto relative z-10 w-1.5 h-1.5 rounded-full bg-primary-500 shadow-sm shadow-primary-500/50 shrink-0"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="p-3 border-t border-surface-200/50 dark:border-surface-700/50">
            <div className={cn(
              'flex items-center mb-2 transition-all duration-300 ease-out',
              expanded ? 'gap-3 px-3 py-2' : 'gap-0 px-0 py-2 justify-center'
            )}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative shrink-0"
                title={!expanded ? user?.name : undefined}
              >
                <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-secondary-500 border-2 border-white dark:border-surface-900 rounded-full" />
              </motion.div>
              <div className={cn(
                'flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-out',
                expanded ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0'
              )}>
                <p className="text-sm font-medium truncate text-surface-900 dark:text-surface-100">{user?.name}</p>
                <p className="text-xs text-surface-400 capitalize">{user?.role}</p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={logout}
              title={!expanded ? 'Sign Out' : undefined}
              className={cn(
                'flex items-center w-full rounded-xl text-sm font-medium transition-all duration-200 group',
                expanded ? 'gap-3 px-3 py-2.5' : 'gap-0 px-0 py-2.5 justify-center',
                'text-surface-500 dark:text-surface-400 hover:bg-danger-50 dark:hover:bg-danger-500/10 hover:text-danger-600 dark:hover:text-danger-400'
              )}
            >
              <LogOut className={cn(
                'w-4.5 h-4.5 shrink-0 transition-transform group-hover:-translate-x-0.5',
                expanded ? '' : 'group-hover:translate-x-0'
              )} />
              <span className={cn(
                'overflow-hidden whitespace-nowrap transition-all duration-300 ease-out',
                expanded ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0'
              )}>
                Sign Out
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggle}
              title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
              className={cn(
                'hidden lg:flex items-center justify-center w-full mt-2 p-2 rounded-xl text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200',
              )}
            >
              {expanded ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </motion.button>
          </div>
        </div>
      </aside>
    </>
  );
}
