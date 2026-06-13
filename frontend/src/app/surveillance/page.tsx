'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animation';
import { AlertTriangle } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import SurveillancePanel from '@/components/surveillance/SurveillancePanel';

export default function SurveillancePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/surveillance/events?limit=20')
      .then((e) => setEvents(e.data.events || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <h2 className="text-2xl font-bold">AI Surveillance Center</h2>
          <p className="text-surface-400 text-sm">Real-time CCTV monitoring with AI-powered detection</p>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <SurveillancePanel />
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Historical AI Detection Events</h3>
            <span className="text-xs text-surface-400">{events.length} events</span>
          </div>
          {events.length === 0 ? (
            <div className="text-center py-8 text-surface-400">No detection events</div>
          ) : (
            <motion.div className="space-y-2 max-h-64 overflow-y-auto" variants={staggerContainer} initial="hidden" animate="visible">
              {events.map((e) => (
                <motion.div key={e._id} variants={staggerItem} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', e.severity === 'critical' ? 'bg-danger-50 text-danger-500' : 'bg-warning-50 text-warning-500')}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-surface-400">{e.type?.replace(/_/g, ' ')} &middot; {timeAgo(e.createdAt)}</p>
                    </div>
                  </div>
                  <span className={cn('badge text-xs', e.severity === 'critical' ? 'badge-danger' : 'badge-warning')}>{e.severity}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
