'use client';
import { Bell, X, AlertTriangle, Users, FileText, CreditCard, Calendar, MessageSquare, UserPlus, DollarSign, Megaphone, CheckCircle, Trash2, Mail, Eye } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { motion } from 'framer-motion';

const getIcon = (type?: string) => {
  switch (type) {
    case 'alert': return AlertTriangle;
    case 'chat': return MessageSquare;
    case 'visitor': return Users;
    case 'complaint': return FileText;
    case 'payment': return DollarSign;
    case 'booking': return Calendar;
    case 'reactivation': return UserPlus;
    case 'announcement': return Megaphone;
    default: return Bell;
  }
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 25 } },
};

export default function NotificationPanel({
  notifications, onClose, onClear, onClick,
  onMarkRead, onMarkUnread, onDelete, onViewDetail,
}: {
  notifications: any[]; onClose: () => void; onClear: () => void; onClick?: (n: any) => void;
  onMarkRead?: (id: string) => void; onMarkUnread?: (id: string) => void; onDelete?: (id: string) => void;
  onViewDetail?: (n: any) => void;
}) {
  return (
    <div className="absolute right-4 top-16 w-80 glass-card-strong border border-surface-200/50 dark:border-surface-700/50 shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-surface-100 dark:border-surface-800">
        <h3 className="text-sm font-semibold">Notifications</h3>
        <div className="flex gap-2">
          <button onClick={onClear} className="text-[10px] text-primary-600 dark:text-primary-400 hover:underline">Clear all</button>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto scrollbar-hide">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-surface-400">No new notifications</div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show">
            {notifications.map((n, i) => {
              const Icon = getIcon(n.type);
              const notifId = n._id || n.userNotificationId;
              const isPersistent = !!(n.userNotificationId && (onMarkRead || onMarkUnread || onDelete));
              return (
                <motion.div key={notifId || i} variants={itemVariants}
                  className={cn('flex items-start gap-3 p-3 border-b border-surface-50 dark:border-surface-800/50 transition-colors cursor-default', n.severity === 'critical' ? 'bg-danger-50/30 dark:bg-danger-500/5 hover:bg-danger-50/50' : 'hover:bg-surface-50 dark:hover:bg-surface-800/30')}>
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative', n.severity === 'critical' ? 'bg-danger-50 text-danger-500' : n.read ? 'bg-surface-100 text-surface-400' : 'bg-primary-50 text-primary-500')}>
                    <Icon className="w-4 h-4" />
                    {isPersistent && !n.read && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary-500 rounded-full"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs truncate', n.read ? 'text-surface-500' : 'font-semibold text-surface-900 dark:text-surface-100')}>{n.title || n.message}</p>
                    {n.title && <p className={cn('text-[10px] truncate', n.read ? 'text-surface-400' : 'text-surface-500')}>{n.message}</p>}
                    <p className="text-[10px] text-surface-400">
                      {n.sender?.name && <span className="font-medium text-surface-500">{n.sender.name} </span>}
                      {timeAgo(n.createdAt || Date.now())}
                      {n.severity && n.severity !== 'medium' && <span className={cn('ml-1 text-[9px] uppercase font-bold', n.severity === 'critical' ? 'text-danger-500' : n.severity === 'high' ? 'text-warning-500' : 'text-surface-400')}>{n.severity}</span>}
                    </p>
                    {isPersistent && (
                      <div className="flex gap-1 mt-1.5">
                        <button onClick={(e) => { e.stopPropagation(); onViewDetail?.(n); }}
                          className="text-[9px] text-primary-500 hover:underline flex items-center gap-0.5">
                          <Eye className="w-2.5 h-2.5" /> View
                        </button>
                        {!n.read ? (
                          <button onClick={(e) => { e.stopPropagation(); onMarkRead?.(notifId); }} className="text-[9px] text-secondary-600 hover:underline flex items-center gap-0.5"><CheckCircle className="w-2.5 h-2.5" /> Read</button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); onMarkUnread?.(notifId); }} className="text-[9px] text-surface-500 hover:underline flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" /> Unread</button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); onDelete?.(notifId); }} className="text-[9px] text-danger-500 hover:underline flex items-center gap-0.5"><Trash2 className="w-2.5 h-2.5" /> Delete</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
