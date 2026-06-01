'use client';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { cn, formatDateTime } from '@/lib/utils';
import { X, Mail, Phone, Home, Building2, Shield, Calendar, Clock, Circle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ViewProfileModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const { connected } = useSocket();

  if (!open || !user) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-md glass-card-strong border border-surface-200/50 dark:border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white blur-3xl" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white blur-3xl" />
          </div>
        </div>

        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-black/20 text-white/80 hover:bg-black/30 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="pt-14 pb-6 px-6">
          <div className="flex justify-center -mt-20 mb-4">
            <div className="relative">
              <div className={cn(
                'w-24 h-24 rounded-full border-4 border-white dark:border-surface-800 bg-gradient-to-br from-primary-400 to-primary-600 shadow-xl flex items-center justify-center overflow-hidden'
              )}>
                {user.profileImage ? (
                  <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">{user.name?.charAt(0)?.toUpperCase()}</span>
                )}
              </div>
              <span className={cn(
                'absolute -bottom-0.5 -right-0.5 w-4 h-4 border-[3px] border-white dark:border-surface-800 rounded-full',
                connected ? 'bg-secondary-500' : 'bg-surface-300'
              )} />
            </div>
          </div>

          <div className="text-center mb-5">
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">{user.name}</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 capitalize">{user.role}</span>
              <span className={cn(
                'flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium',
                connected
                  ? 'bg-secondary-50 dark:bg-secondary-500/10 text-secondary-600 dark:text-secondary-400'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-400'
              )}>
                <Circle className="w-2 h-2 fill-current" />
                {connected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
              <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-primary-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-surface-400">Email</p>
                <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
              <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-primary-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-surface-400">Phone</p>
                <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{user.phone || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-primary-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-surface-400">Tower</p>
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{user.tower || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4 text-primary-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-surface-400">Flat</p>
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{user.flatNumber || '—'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
              <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-primary-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-surface-400">Role</p>
                <p className="text-sm font-medium text-surface-800 dark:text-surface-200 capitalize">{user.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-primary-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-surface-400">Member Since</p>
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{user.createdAt ? formatDateTime(user.createdAt) : '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-primary-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-surface-400">Last Active</p>
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{user.lastLogin ? formatDateTime(user.lastLogin) : '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
