import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-200/70 dark:bg-surface-700/50', className)} {...props} />;
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={cn('flex gap-3', i % 2 === 0 ? '' : 'flex-row-reverse')}>
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className={cn('space-y-2', i % 2 === 0 ? '' : 'items-end flex flex-col')}>
            <Skeleton className={cn('h-10 rounded-2xl', i % 2 === 0 ? 'w-60' : 'w-44', i % 2 === 0 ? 'rounded-tl-sm' : 'rounded-tr-sm')} />
            <Skeleton className={cn('h-6 rounded-2xl', i % 2 === 0 ? 'w-40' : 'w-28')} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WidgetSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="glass-card p-5 space-y-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}
