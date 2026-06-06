'use client';
import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] bg-warning-500/90 backdrop-blur-sm text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 shadow-lg">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>You&apos;re offline. Some features may be unavailable.</span>
    </div>
  );
}
