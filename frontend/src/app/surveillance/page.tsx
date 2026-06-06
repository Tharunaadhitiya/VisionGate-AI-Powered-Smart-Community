'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
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
        <div>
          <h2 className="text-2xl font-bold">AI Surveillance Center</h2>
          <p className="text-surface-400 text-sm">Real-time CCTV monitoring with AI-powered detection</p>
        </div>

        <SurveillancePanel />

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Historical AI Detection Events</h3>
            <span className="text-xs text-surface-400">{events.length} events</span>
          </div>
          {events.length === 0 ? (
            <div className="text-center py-8 text-surface-400">No detection events</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.map((e) => (
                <div key={e._id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
