'use client';
import { useState } from 'react';
import { Send, X, Users, AlertTriangle, Megaphone, Bell, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const targetTypes = [
  { value: 'all', label: 'All Users', icon: Users },
  { value: 'residents', label: 'Residents', icon: Users },
  { value: 'security', label: 'Security Staff', icon: Users },
  { value: 'admin', label: 'Admins', icon: Users },
  { value: 'individuals', label: 'Select Individuals', icon: Users },
];

const notifTypes = [
  { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'text-danger-500 bg-danger-50' },
  { value: 'announcement', label: 'Announcement', icon: Megaphone, color: 'text-primary-500 bg-primary-50' },
  { value: 'reminder', label: 'Reminder', icon: Bell, color: 'text-warning-500 bg-warning-50' },
  { value: 'warning', label: 'Warning', icon: AlertCircle, color: 'text-orange-500 bg-orange-50' },
];

export default function NotificationComposer({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notifType, setNotifType] = useState('announcement');
  const [target, setTarget] = useState('all');
  const [targetUsers, setTargetUsers] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      await api.post('/notifications/send', { title, message, type: notifType, target, targetUsers: target === 'individuals' ? targetUsers : undefined });
      toast.success('Notification sent!');
      onClose();
    } catch { toast.error('Failed to send notification'); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-lg w-full animate-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Send Notification</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Notification Type</label>
            <div className="grid grid-cols-2 gap-2">
              {notifTypes.map((nt) => {
                const Icon = nt.icon;
                return (
                  <button key={nt.value} onClick={() => setNotifType(nt.value)}
                    className={cn('flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-medium transition-all', notifType === nt.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10' : 'border-surface-100 dark:border-surface-700 hover:border-surface-300')}>
                    <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center', nt.color)}><Icon className="w-3.5 h-3.5" /></div>
                    {nt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Target Audience</label>
            <div className="flex flex-wrap gap-2">
              {targetTypes.map((tt) => {
                const Icon = tt.icon;
                return (
                  <button key={tt.value} onClick={() => setTarget(tt.value)}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all', target === tt.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700' : 'border-surface-100 dark:border-surface-700 hover:border-surface-300')}>
                    <Icon className="w-3 h-3" /> {tt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <input className="input-field" placeholder="Notification title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input-field h-20 resize-none" placeholder="Notification message..." value={message} onChange={(e) => setMessage(e.target.value)} />

          <button onClick={handleSend} disabled={!title.trim() || !message.trim() || sending} className="btn-primary w-full">
            <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
}
