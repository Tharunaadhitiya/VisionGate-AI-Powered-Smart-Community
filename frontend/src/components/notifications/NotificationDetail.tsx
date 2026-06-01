'use client';
import { useEffect } from 'react';
import { X, Bell, AlertTriangle, MessageSquare, Users, FileText, DollarSign, Calendar, UserPlus, Megaphone, Clock, Shield, Mail, Trash2, CheckCircle, Eye } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

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

const severityBadge: Record<string, string> = {
  low: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300',
  medium: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
  high: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  critical: 'bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-400',
};

const typeLabels: Record<string, string> = {
  alert: 'Alert',
  emergency_sos: 'Emergency SOS',
  general: 'General',
  chat: 'Chat Message',
  visitor: 'Visitor',
  complaint: 'Complaint',
  payment: 'Payment',
  booking: 'Booking',
  reactivation: 'Reactivation',
  announcement: 'Announcement',
};

export default function NotificationDetail({
  notification, onClose, onMarkRead, onMarkUnread, onDelete,
}: {
  notification: any; onClose: () => void;
  onMarkRead?: (id: string) => void; onMarkUnread?: (id: string) => void; onDelete?: (id: string) => void;
}) {
  const Icon = getIcon(notification.type);
  const notifId = notification._id || notification.userNotificationId;
  const severity = notification.severity || 'low';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[700px] max-h-[85vh] md:max-h-[80vh] glass-card border border-surface-200/50 dark:border-surface-700/50 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-surface-100 dark:border-surface-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-surface-900 dark:text-surface-100 truncate">
                {notification.title || 'Notification Details'}
              </h3>
              {notification.type && (
                <p className="text-xs text-surface-400 capitalize">{typeLabels[notification.type] || notification.type}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors shrink-0 ml-2">
            <X className="w-4 h-4 text-surface-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {notification.message && (
            <div>
              <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed whitespace-pre-wrap">
                {notification.message}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {notification.sender?.name && (
              <InfoBox label="Sender">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                    {notification.sender.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium truncate text-surface-900 dark:text-surface-100">{notification.sender.name}</p>
                    {notification.sender.role && (
                      <p className="text-[10px] text-surface-400 capitalize">{notification.sender.role}</p>
                    )}
                  </div>
                </div>
              </InfoBox>
            )}

            {notification.createdAt && (
              <InfoBox label="Created">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-surface-400 shrink-0" />
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{formatDateTime(notification.createdAt)}</p>
                </div>
              </InfoBox>
            )}

            {notification.type && (
              <InfoBox label="Alert Type">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-surface-400 shrink-0" />
                  <p className="text-sm font-medium capitalize text-surface-900 dark:text-surface-100">{typeLabels[notification.type] || notification.type}</p>
                </div>
              </InfoBox>
            )}

            <InfoBox label="Priority">
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', severityBadge[severity] || severityBadge.low)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', severity === 'critical' ? 'bg-danger-500 animate-pulse' : severity === 'high' ? 'bg-orange-500' : severity === 'medium' ? 'bg-warning-500' : 'bg-surface-400')} />
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </span>
            </InfoBox>

            <InfoBox label="Status">
              <div className="flex items-center gap-2">
                {notification.read ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-secondary-500" />
                    <span className="text-sm font-medium text-secondary-600 dark:text-secondary-400">Read</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 text-primary-500" />
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Unread</span>
                  </>
                )}
              </div>
            </InfoBox>
          </div>

          {notification.location && (
            <InfoBox label="Location" fullWidth>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-surface-400 shrink-0" />
                <p className="text-sm text-surface-700 dark:text-surface-300">{notification.location}</p>
              </div>
            </InfoBox>
          )}
        </div>

        {notifId && (onMarkRead || onMarkUnread || onDelete) && (
          <div className="flex items-center gap-2 p-4 md:p-5 border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30 shrink-0">
            {!notification.read ? (
              <button onClick={() => { onMarkRead?.(notifId); onClose(); }}
                className="btn-primary text-sm flex-1">
                <CheckCircle className="w-4 h-4" /> Mark as Read
              </button>
            ) : (
              <button onClick={() => { onMarkUnread?.(notifId); onClose(); }}
                className="btn-secondary text-sm flex-1">
                <Mail className="w-4 h-4" /> Mark as Unread
              </button>
            )}
            {onDelete && (
              <button onClick={() => { onDelete(notifId); onClose(); }}
                className="btn-danger text-sm">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
            <button onClick={onClose}
              className="btn-ghost text-sm">
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoBox({ label, children, fullWidth }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={cn('p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50', fullWidth && 'sm:col-span-2')}>
      <p className="text-[10px] text-surface-400 uppercase tracking-wider mb-1.5">{label}</p>
      {children}
    </div>
  );
}
