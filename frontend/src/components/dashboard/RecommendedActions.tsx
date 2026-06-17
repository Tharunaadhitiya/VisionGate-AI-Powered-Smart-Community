'use client';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animation';
import { ArrowRight, Users, Bell, FileText, Shield, Megaphone, CreditCard, Package, Camera, Search, AlertTriangle, Clock, Activity, BarChart3, UserPlus, Home } from 'lucide-react';
import Link from 'next/link';

const ICON_MAP: Record<string, any> = {
  Users, Bell, FileText, Shield, Megaphone, CreditCard, Package, Camera, Search, AlertTriangle, Clock, Activity, BarChart3, UserPlus, Home,
};

export interface ActionItem {
  icon: string;
  label: string;
  description: string;
  link: string;
  color: string;
}

export default function RecommendedActions({ actions }: { actions: ActionItem[] }) {
  if (actions.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Recommended Actions</h2>
      </div>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5"
      >
        {actions.map((action) => {
          const Icon = ICON_MAP[action.icon] || Activity;
          return (
            <motion.div key={action.label} variants={staggerItem}>
              <Link
                href={action.link}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-white/5 dark:border-surface-700/50 bg-white/5 dark:bg-surface-800/30 hover:bg-white/10 dark:hover:bg-surface-800/60 transition-all group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${action.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-surface-900 dark:text-surface-100 truncate">{action.label}</p>
                  <p className="text-[10px] text-surface-500 dark:text-surface-400 truncate">{action.description}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-surface-500 dark:text-surface-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
