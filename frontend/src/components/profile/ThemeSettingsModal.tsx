'use client';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { X, Sun, Moon, Globe, Bell, Mail, Phone, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

const accentOptions = [
  { value: 'blue', label: 'Indigo', color: 'bg-primary-500' },
  { value: 'purple', label: 'Purple', color: 'bg-purple-500' },
  { value: 'green', label: 'Green', color: 'bg-green-500' },
  { value: 'orange', label: 'Orange', color: 'bg-orange-500' },
  { value: 'red', label: 'Red', color: 'bg-red-500' },
];

export default function ThemeSettingsModal({ open, onClose }: Props) {
  const { user, updateUser } = useAuth();
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();

  const [notifPrefs, setNotifPrefs] = useState({ email: true, sms: true, push: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.preferences?.notifications) {
      setNotifPrefs({
        email: user.preferences.notifications.email ?? true,
        sms: user.preferences.notifications.sms ?? true,
        push: user.preferences.notifications.push ?? true,
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/users/${user?._id}`, {
        preferences: { ...user?.preferences, notifications: notifPrefs },
      });
      updateUser(res.data.user);
      toast.success('Preferences saved');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200/50 dark:border-surface-700/50">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Theme Settings</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <X className="w-4 h-4 text-surface-400" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2.5 block">Theme Mode</label>
            <div className="grid grid-cols-4 gap-2">
              {(['light', 'dark', 'contrast-black', 'system'] as const).map((t) => (
                <button key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all capitalize',
                    theme === t
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700'
                  )}
                >
                  {t === 'light' ? <Sun className="w-4 h-4" /> : t === 'dark' ? <Moon className="w-4 h-4" /> : t === 'contrast-black' ? <Monitor className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  {t.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2.5 block">Accent Color</label>
            <div className="flex gap-3">
              {accentOptions.map((opt) => (
                <button key={opt.value}
                  onClick={() => setAccentColor(opt.value as any)}
                  className={cn(
                    'w-10 h-10 rounded-xl transition-all',
                    opt.color,
                    accentColor === opt.value && 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-surface-900 ring-primary-500 scale-110'
                  )}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2.5 block">Notification Preferences</label>
            <div className="space-y-2">
              {([
                { key: 'email' as const, label: 'Email Notifications', icon: Mail },
                { key: 'sms' as const, label: 'SMS Notifications', icon: Phone },
                { key: 'push' as const, label: 'Push Notifications', icon: Bell },
              ]).map((n) => (
                <label key={n.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 cursor-pointer transition-colors">
                  <span className="text-sm text-surface-600 dark:text-surface-400 flex items-center gap-2.5">
                    <n.icon className="w-4 h-4 text-surface-400" />
                    {n.label}
                  </span>
                  <div
                    onClick={() => setNotifPrefs((prev) => ({ ...prev, [n.key]: !prev[n.key] }))}
                    className={cn(
                      'w-10 h-5 rounded-full transition-colors relative cursor-pointer shrink-0',
                      notifPrefs[n.key] ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'
                    )}
                  >
                    <div className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      notifPrefs[n.key] ? 'translate-x-[21px]' : 'translate-x-0.5'
                    )} />
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200/50 dark:border-surface-700/50 bg-surface-50/50 dark:bg-surface-900/50">
          <button onClick={onClose} className="btn-ghost text-sm px-4 py-2">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Globe className="w-4 h-4" />}
            Save Preferences
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
