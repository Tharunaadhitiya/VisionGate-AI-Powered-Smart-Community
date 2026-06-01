'use client';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { useTheme } from '@/hooks/useTheme';
import { Bell, MessageSquare, Sun, Moon, User, Settings, Lock, Palette, LogOut, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import NotificationDetail from '@/components/notifications/NotificationDetail';
import EditProfileModal from '@/components/profile/EditProfileModal';
import ViewProfileModal from '@/components/profile/ViewProfileModal';
import ChangePasswordModal from '@/components/profile/ChangePasswordModal';
import ThemeSettingsModal from '@/components/profile/ThemeSettingsModal';
import GlobalSearch from '@/components/search/GlobalSearch';
import { motion, AnimatePresence } from 'framer-motion';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

const menuItems = [
  { id: 'profile', label: 'View Profile', icon: User },
  { id: 'edit', label: 'Edit Profile', icon: Settings },
  { id: 'password', label: 'Change Password', icon: Lock },
  { id: 'theme', label: 'Theme Settings', icon: Palette },
];

export default function Header() {
  const { user, logout } = useAuth();
  const { myNotifications, notifications, chatNotifications, clearNotifications, clearChatNotifications, connected, setOpenChatTarget, unreadCount, markNotificationRead, markNotificationUnread, deleteNotification, clearAllNotifications } = useSocket();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [detailNotification, setDetailNotification] = useState<any | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showViewProfile, setShowViewProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const totalNotifications = unreadCount + chatNotifications.length;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showProfileMenu]);

  const handleViewDetail = (n: any) => {
    setShowNotifications(false);
    setDetailNotification(n);
  };

  const handleNotificationClick = (n: any) => {
    setShowNotifications(false);
    if (n.type === 'chat') {
      const targetId = n.senderId || n.conversationId;
      if (targetId) setOpenChatTarget(targetId);
    }
  };

  const handleMenuClick = (id: string) => {
    setShowProfileMenu(false);
    if (id === 'profile') setShowViewProfile(true);
    if (id === 'edit') setShowEditProfile(true);
    if (id === 'password') setShowChangePassword(true);
    if (id === 'theme') setShowThemeSettings(true);
    if (id === 'logout') logout();
  };

  return (
    <>
      <header className="sticky top-0 z-30 glass-card-strong border-b border-surface-200/50 dark:border-surface-700/50 rounded-none">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-100 capitalize">
              {user?.role} Dashboard
            </h1>
            <p className="text-xs text-surface-400">{getGreeting()}, {user?.name}</p>
          </div>

          <div className="flex items-center gap-3">
            <motion.div className="flex items-center gap-1.5 text-xs" animate={{ opacity: connected ? 1 : 0.7 }}>
              <motion.span
                className={cn('w-2 h-2 rounded-full', connected ? 'bg-secondary-500' : 'bg-danger-500')}
                animate={{ scale: connected ? [1, 1.3, 1] : 1 }}
                transition={{ repeat: connected ? Infinity : 0, duration: 2 }}
              />
              {connected ? 'Live' : 'Offline'}
            </motion.div>

            <AnimatePresence>
              {chatNotifications.length > 0 && (
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="relative"
                >
                  <MessageSquare className="w-5 h-5 text-primary-500" />
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center"
                  >
                    {chatNotifications.length}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            <GlobalSearch />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              className="relative p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-5 h-5 text-surface-600 dark:text-surface-400" />
              <AnimatePresence>
                {totalNotifications > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-danger-500/30"
                  >
                    {totalNotifications > 9 ? '9+' : totalNotifications}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4.5 h-4.5 text-surface-600 dark:text-surface-400" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-surface-600 dark:text-surface-400" />
              )}
            </motion.button>

            <div ref={profileRef} className="relative flex items-center gap-2 pl-3 border-l border-surface-200 dark:border-surface-700">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <motion.span
                    className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white dark:border-surface-900 rounded-full', connected ? 'bg-secondary-500' : 'bg-surface-300')}
                    animate={{ scale: connected ? [1, 1.3, 1] : 1 }}
                    transition={{ repeat: connected ? Infinity : 0, duration: 2 }}
                  />
                </div>
                <span className="text-sm font-medium hidden sm:block text-surface-700 dark:text-surface-300">{user?.name}</span>
              </motion.button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="absolute top-full right-0 mt-2 w-64 glass-card-strong border border-surface-200/50 dark:border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden origin-top-right"
                  >
                    <div className="p-4 border-b border-surface-100 dark:border-surface-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold shadow-md shrink-0">
                          {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">{user?.name}</p>
                          <p className="text-[11px] text-surface-400 truncate">{user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 capitalize">{user?.role}</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-medium',
                          connected ? 'bg-secondary-50 dark:bg-secondary-500/10 text-secondary-600 dark:text-secondary-400' : 'bg-surface-100 dark:bg-surface-800 text-surface-400'
                        )}>
                          {connected ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    <div className="p-1.5">
                      {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <motion.button
                            key={item.id}
                            whileHover={{ x: 2 }}
                            onClick={() => handleMenuClick(item.id)}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800/50 hover:text-surface-900 dark:hover:text-surface-200 transition-all duration-150 group"
                          >
                            <Icon className="w-4 h-4 text-surface-400 group-hover:text-primary-500 transition-colors" />
                            <span className="flex-1 text-left">{item.label}</span>
                            <ChevronRight className="w-3 h-3 text-surface-300 group-hover:text-surface-400 transition-colors opacity-0 group-hover:opacity-100" />
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="border-t border-surface-100 dark:border-surface-800 p-1.5">
                      <motion.button
                        whileHover={{ x: 2 }}
                        onClick={() => { setShowProfileMenu(false); logout(); }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-surface-500 dark:text-surface-400 hover:bg-danger-50 dark:hover:bg-danger-500/10 hover:text-danger-600 dark:hover:text-danger-400 transition-all duration-150 group"
                      >
                        <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                        <span className="flex-1 text-left">Sign Out</span>
                        <ChevronRight className="w-3 h-3 text-surface-300 group-hover:text-danger-400 transition-colors opacity-0 group-hover:opacity-100" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <NotificationPanel
                notifications={[...myNotifications, ...chatNotifications.map((n: any) => ({ ...n, type: 'chat', title: 'Message from ' + n.from, message: n.message }))]}
                onClose={() => setShowNotifications(false)}
                onClear={clearAllNotifications}
                onClick={handleNotificationClick}
                onMarkRead={markNotificationRead}
                onMarkUnread={markNotificationUnread}
                onDelete={deleteNotification}
                onViewDetail={handleViewDetail}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {detailNotification && (
        <NotificationDetail
          notification={detailNotification}
          onClose={() => setDetailNotification(null)}
          onMarkRead={markNotificationRead}
          onMarkUnread={markNotificationUnread}
          onDelete={deleteNotification}
        />
      )}

      <EditProfileModal open={showEditProfile} onClose={() => setShowEditProfile(false)} />
      <ViewProfileModal open={showViewProfile} onClose={() => setShowViewProfile(false)} />
      <ChangePasswordModal open={showChangePassword} onClose={() => setShowChangePassword(false)} />
      <ThemeSettingsModal open={showThemeSettings} onClose={() => setShowThemeSettings(false)} />
    </>
  );
}
