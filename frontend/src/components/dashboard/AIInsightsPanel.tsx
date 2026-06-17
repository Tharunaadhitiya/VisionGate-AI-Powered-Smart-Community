'use client';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animation';
import { TrendingUp, TrendingDown, Minus, Activity, Lightbulb, AlertTriangle, Package, Users, FileText, CreditCard, Shield, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, any> = {
  trending_up: TrendingUp,
  trending_down: TrendingDown,
  stable: Minus,
  alert: AlertTriangle,
  package: Package,
  users: Users,
  complaints: FileText,
  payments: CreditCard,
  security: Shield,
  lost_found: Search,
};

export interface Insight {
  id: string;
  icon: string;
  text: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
}

export default function AIInsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  const TYPE_STYLES: Record<string, string> = {
    positive: 'bg-secondary-500/10 border-secondary-500/20 text-secondary-400',
    negative: 'bg-danger-500/10 border-danger-500/20 text-danger-400',
    neutral: 'bg-primary-500/10 border-primary-500/20 text-primary-400',
    warning: 'bg-warning-500/10 border-warning-500/20 text-warning-400',
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">AI Insights</h2>
      </div>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
      >
        {insights.map((insight) => {
          const Icon = ICON_MAP[insight.icon] || Activity;
          return (
            <motion.div
              key={insight.id}
              variants={staggerItem}
              className={cn(
                'flex items-start gap-3 p-3.5 rounded-xl border',
                TYPE_STYLES[insight.type] || TYPE_STYLES.neutral
              )}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed text-surface-900 dark:text-surface-100">{insight.text}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
