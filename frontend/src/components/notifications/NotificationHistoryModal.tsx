'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { X, Bell, AlertTriangle, DollarSign, Users, Home, Package, Vote, Search, EyeOff } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const typeIcons: Record<string, any> = {
  alert: AlertTriangle,
  payment: DollarSign,
  visitorRequests: Users,
  visitorApprovals: Users,
  rent_generated: Home,
  rent_reminder: Home,
  rent_overdue: Home,
  package_received: Package,
  new_poll: Vote,
  lost_found_match: Search,
  emergency_sos: AlertTriangle,
};

const typeColors: Record<string, string> = {
  alert: 'text-warning-500 bg-warning-50 dark:bg-warning-500/10',
  payment: 'text-primary-500 bg-primary-50 dark:bg-primary-500/10',
  visitorRequests: 'text-secondary-500 bg-secondary-50 dark:bg-secondary-500/10',
  visitorApprovals: 'text-secondary-500 bg-secondary-50 dark:bg-secondary-500/10',
  rent_generated: 'text-info-500 bg-info-50 dark:bg-info-500/10',
  rent_reminder: 'text-warning-500 bg-warning-50 dark:bg-warning-500/10',
  rent_overdue: 'text-danger-500 bg-danger-50 dark:bg-danger-500/10',
  package_received: 'text-accent-500 bg-accent-50 dark:bg-accent-500/10',
  new_poll: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',
  lost_found_match: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
  emergency_sos: 'text-danger-500 bg-danger-50 dark:bg-danger-500/10',
};

export default function NotificationHistoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [history, setHistory] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get('/push/history', { limit: '100' })
      .then((res: any) => {
        setHistory(res.data.history || []);
        setTotal(res.data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-bold">Notification History</h3>
                {total > 0 && <span className="text-xs text-surface-400">({total})</span>}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-surface-400">
                  <EyeOff className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                history.map((item: any, idx: number) => {
                  const Icon = typeIcons[item.type] || Bell;
                  const colorClass = typeColors[item.type] || 'text-surface-500 bg-surface-50 dark:bg-surface-700/50';
                  return (
                    <motion.div
                      key={item.id || idx}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700/50"
                    >
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{item.title}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 line-clamp-2">{item.body}</p>
                        <p className="text-[10px] text-surface-400 mt-1">{timeAgo(item.createdAt)}</p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
