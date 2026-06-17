'use client';
import { CheckCircle, Clock, Package, AlertTriangle, Users, FileText, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animation';
import { cn } from '@/lib/utils';

interface SummaryItem {
  icon: any;
  label: string;
  value: number | string;
  color: string;
}

export default function TodaySummary({ items, compact }: { items: SummaryItem[]; compact?: boolean }) {
  if (items.length === 0) return null;

  if (compact) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Today&apos;s Summary</h2>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-1.5"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                variants={staggerItem}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 dark:bg-surface-800/40 border border-white/5 dark:border-surface-700/50"
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', item.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex items-baseline gap-2 min-w-0">
                  <p className="text-base font-bold text-surface-900 dark:text-surface-100 leading-tight">{item.value}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{item.label}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Today&apos;s Summary</h2>
      </div>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              variants={staggerItem}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 dark:bg-surface-800/40 border border-white/5 dark:border-surface-700/50"
            >
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', item.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-surface-900 dark:text-surface-100 leading-tight">{item.value}</p>
                <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{item.label}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
