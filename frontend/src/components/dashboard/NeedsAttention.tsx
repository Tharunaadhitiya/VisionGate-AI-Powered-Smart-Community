'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, UserPlus, Package, CreditCard, FileText, Shield, Bell, AlertCircle, Users, Camera, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-danger-500/10 border-danger-500/20 text-danger-400',
  high: 'bg-warning-500/10 border-warning-500/20 text-warning-400',
  medium: 'bg-primary-500/10 border-primary-500/20 text-primary-400',
  low: 'bg-surface-500/10 border-surface-500/20 text-surface-400',
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-danger-500/20 text-danger-400',
  high: 'bg-warning-500/20 text-warning-400',
  medium: 'bg-primary-500/20 text-primary-400',
  low: 'bg-surface-500/20 text-surface-400',
};

export interface AttentionItem {
  id: string;
  icon: string;
  label: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  link?: string;
  count?: number;
}

const ICON_MAP: Record<string, any> = {
  AlertTriangle, Clock, UserPlus, Package, CreditCard, FileText, Shield, Bell, AlertCircle, Users, Camera, Search,
};

function storageKey(userId?: string): string {
  return userId ? `na-viewed-${userId}` : 'na-viewed-ids';
}

function loadViewed(userId?: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveViewed(ids: Set<string>, userId?: string) {
  localStorage.setItem(storageKey(userId), JSON.stringify(Array.from(ids)));
}

export default function NeedsAttention({ items, title = 'Recommended Actions', emptyMessage, userId }: { items: AttentionItem[]; title?: string; emptyMessage?: string; userId?: string }) {
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => loadViewed(userId));

  useEffect(() => {
    saveViewed(viewedIds, userId);
  }, [viewedIds, userId]);

  const visible = [...items].filter((item) => !viewedIds.has(item.id)).sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
  );

  const markViewed = (id: string) => {
    if (!viewedIds.has(id)) {
      setViewedIds((prev) => new Set(prev).add(id));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">{title}</h2>
      </div>
      {visible.length === 0 ? (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-secondary-500/5 border border-secondary-500/15">
          <svg className="w-5 h-5 text-secondary-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          <p className="text-sm text-surface-500 dark:text-surface-400">{emptyMessage || 'Community operations are running smoothly. No pending actions require attention.'}</p>
        </div>
      ) : (
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {visible.map((item) => {
            const Icon = ICON_MAP[item.icon] || AlertTriangle;
            const content = (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                className={cn(
                  'flex items-center gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer group hover:brightness-110',
                  PRIORITY_COLORS[item.priority] || 'bg-surface-500/10 border-surface-500/20'
                )}
                onClick={() => markViewed(item.id)}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-black/20 dark:bg-black/30">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{item.label}</p>
                    {item.count !== undefined && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-surface-800/50 dark:bg-surface-700/50 text-surface-400">
                        {item.count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 truncate">{item.description}</p>
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase', PRIORITY_BADGE[item.priority])}>
                  {item.priority}
                </span>
                <svg className="w-4 h-4 text-surface-500 dark:text-surface-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </motion.div>
            );
            if (item.link) {
              return <Link key={item.id} href={item.link} onClick={() => markViewed(item.id)}>{content}</Link>;
            }
            return content;
          })}
        </AnimatePresence>
      </div>
      )}
    </div>
  );
}
