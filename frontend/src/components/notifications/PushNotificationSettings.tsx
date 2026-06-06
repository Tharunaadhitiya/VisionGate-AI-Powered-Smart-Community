'use client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, BellOff, Loader2, Send, Smartphone, History } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PushNotificationSettings({ onViewHistory }: { onViewHistory?: () => void }) {
  const { permission, subscribed, loading, subscribe, unsubscribe, testPush } = usePushNotifications();

  if (permission === 'unsupported') {
    return (
      <div className="flex items-center gap-2 text-sm text-surface-400 p-3 rounded-lg bg-surface-800/50">
        <Smartphone className="w-4 h-4" />
        <span>Push notifications are not supported on this browser/device.</span>
      </div>
    );
  }

  const handleToggle = async () => {
    if (subscribed) {
      await unsubscribe();
      toast.success('Push notifications disabled');
    } else {
      await subscribe();
      toast.success('Push notifications enabled');
    }
  };

  const handleTest = async () => {
    await testPush();
    toast.success('Test push sent!');
  };

  return (
    <div className="space-y-3 p-4 rounded-lg bg-surface-800/30 border border-surface-700/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-medium">Push Notifications</span>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            subscribed
              ? 'bg-primary-600/20 text-primary-400 hover:bg-primary-600/30'
              : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
          }`}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : subscribed ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
          {subscribed ? 'Disable' : 'Enable'}
        </button>
      </div>

      {permission === 'denied' && (
        <p className="text-xs text-red-400">Notifications are blocked. Update your browser settings to allow notifications.</p>
      )}

      {permission === 'default' && !subscribed && (
        <p className="text-xs text-surface-400">Enable push notifications to receive alerts even when the app is closed.</p>
      )}

      {subscribed && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-green-400">● Subscribed</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTest}
              className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              <Send className="w-3 h-3" />
              Send Test
            </button>
          </div>
        </div>
      )}
      {onViewHistory && (
        <button
          onClick={onViewHistory}
          className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 transition-colors pt-1"
        >
          <History className="w-3 h-3" />
          View Notification History
        </button>
      )}
    </div>
  );
}
