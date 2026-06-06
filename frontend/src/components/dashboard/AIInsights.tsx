'use client';
import { useState, useEffect } from 'react';
import { Brain, AlertTriangle, FileText, Users, CreditCard, UserPlus, ShieldAlert, Car, AlertCircle, TrendingUp, Activity, Calendar, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap: Record<string, any> = { AlertTriangle, FileText, Users, CreditCard, UserPlus, ShieldAlert, Car, AlertCircle, TrendingUp, Activity, Calendar };

interface Recommendation {
  type: string; icon: string; title: string; priority: string; action: string; link: string;
}

export default function AIInsights() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await api.get('/recommendations');
        setRecommendations(res.data?.recommendations || []);
      } catch {} finally { setLoading(false); }
    };
    fetchRecs();
    const interval = setInterval(fetchRecs, 60000);
    return () => clearInterval(interval);
  }, []);

  const visible = recommendations.filter((_, i) => !Array.from(dismissed).includes(i));

  if (loading) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
          <Brain className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">AI Insights & Smart Recommendations</h3>
          <p className="text-xs text-surface-400">Personalized suggestions based on current data</p>
        </div>
      </div>
      <AnimatePresence mode="popLayout">
        {visible.length === 0 ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-surface-400 text-center py-4">
            No recommendations — everything looks good
          </motion.p>
        ) : (
          <div className="space-y-2">
            {visible.map((rec, i) => {
              const Icon = iconMap[rec.icon] || AlertTriangle;
              return (
                <motion.div key={i} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20, height: 0 }} className={cn('flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer group', rec.priority === 'emergency' ? 'bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20' : 'bg-surface-50 dark:bg-surface-800/50 hover:bg-primary-50/50 dark:hover:bg-primary-500/5')} onClick={() => { if (rec.link) window.location.href = rec.link; }}>
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', rec.priority === 'emergency' ? 'bg-danger-100 dark:bg-danger-500/20' : rec.priority === 'high' ? 'bg-warning-100 dark:bg-warning-500/20' : 'bg-primary-100 dark:bg-primary-500/20')}>
                    <Icon className={cn('w-4 h-4', rec.priority === 'emergency' ? 'text-danger-600 dark:text-danger-400' : rec.priority === 'high' ? 'text-warning-600 dark:text-warning-400' : 'text-primary-600 dark:text-primary-400')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', rec.priority === 'emergency' ? 'text-danger-700 dark:text-danger-300' : 'text-surface-700 dark:text-surface-200')}>{rec.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', rec.priority === 'emergency' ? 'bg-danger-100 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400' : rec.priority === 'high' ? 'bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400' : rec.priority === 'medium' ? 'bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400' : 'bg-surface-200 text-surface-500 dark:bg-surface-700 dark:text-surface-400')}>{rec.priority}</span>
                      <span className="text-xs text-primary-500 font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">{rec.action} <ChevronRight className="w-3 h-3" /></span>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDismissed((prev) => new Set(Array.from(prev).concat(i))); }} className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <svg className="w-3 h-3 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
