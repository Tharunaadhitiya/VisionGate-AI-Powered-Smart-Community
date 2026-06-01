'use client';
import { cn } from '@/lib/utils';
import { useSocket } from '@/hooks/useSocket';

export default function OnlineStatusBadge({ userId, showLabel = true }: { userId: string; showLabel?: boolean }) {
  const { onlineUsers } = useSocket();
  const isOnline = onlineUsers.some((u: any) => u.userId === userId);
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-secondary-500' : 'bg-surface-300')} />
      {showLabel && <span className="text-[10px] text-surface-400">{isOnline ? 'Online' : 'Offline'}</span>}
    </span>
  );
}
