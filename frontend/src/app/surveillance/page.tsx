'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Camera, Activity, AlertTriangle, Shield, Eye } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import SurveillancePanel from '@/components/surveillance/SurveillancePanel';

export default function SurveillancePage() {
  const [cameras, setCameras] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/surveillance/cameras'),
      api.get('/surveillance/events?limit=20'),
    ]).then(([c, e]) => {
      setCameras(c.data.cameras || []);
      setEvents(e.data.events || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">AI Surveillance Center</h2>
          <p className="text-surface-400 text-sm">Real-time CCTV monitoring with AI-powered detection</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cameras.map((cam) => (
            <div key={cam.id} className={cn('glass-card p-4 transition-all', cam.status === 'active' ? 'border-l-2 border-l-secondary-500' : 'opacity-60')}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', cam.status === 'active' ? 'bg-secondary-100 dark:bg-secondary-500/20 text-secondary-700 dark:text-secondary-400' : 'bg-surface-100 dark:bg-surface-800 text-surface-400')}>
                  {cam.status}
                </span>
                <Camera className="w-4 h-4 text-surface-400" />
              </div>
              <p className="font-medium text-sm">{cam.name}</p>
              <p className="text-xs text-surface-400">{cam.location}</p>
            </div>
          ))}
        </div>

        <SurveillancePanel />

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">AI Detection Events</h3>
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
