'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Users, Camera, AlertTriangle, Shield, CheckCircle, Clock, Activity, MessageSquare, Phone, MapPin, LogOut, Car, Package } from 'lucide-react';
import { cn, timeAgo, getStatusColor } from '@/lib/utils';
import SurveillancePanel from '@/components/surveillance/SurveillancePanel';
import SOSEmergency from '@/components/dashboard/SOSEmergency';
import UserDirectory from '@/components/dashboard/UserDirectory';
import OnlineStatusBadge from '@/components/dashboard/OnlineStatusBadge';
import AIInsights from '@/components/dashboard/AIInsights';
import toast from 'react-hot-toast';

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours} Hour${hours > 1 ? 's' : ''} ${minutes} Minute${minutes !== 1 ? 's' : ''}`;
  return `${minutes} Minute${minutes !== 1 ? 's' : ''}`;
}

export default function SecurityDashboard() {
  const { user } = useAuth();
  const [activeVisitors, setActiveVisitors] = useState<any[]>([]);
  const [totalActive, setTotalActive] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [lostFoundStats, setLostFoundStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [showCameras, setShowCameras] = useState(false);
  const [showSos, setShowSos] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      api.get('/visitors?status=entered&limit=50'),
      api.get('/alerts?limit=5&status=new'),
      api.get('/analytics/security'),
      api.get('/lost-found/stats'),
    ]).then(([visitorsRes, alertsRes, analyticsRes, lostRes]) => {
      setActiveVisitors(visitorsRes.data.visitors || []);
      setTotalActive(visitorsRes.data.total || 0);
      setAlerts(alertsRes.data.alerts || []);
      setStats(analyticsRes.data || {});
      setLostFoundStats(lostRes.data?.data || {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleMarkExit = useCallback(async (id: string) => {
    try {
      await api.put('/visitors/' + id + '/exit');
      toast.success('Visitor exit recorded');
      setActiveVisitors((prev) => prev.filter((v) => v._id !== id));
      setTotalActive((prev) => Math.max(0, prev - 1));
    } catch { toast.error('Failed to record exit'); }
  }, []);

  const acknowledgeAlert = async (id: string) => {
    try { await api.put('/alerts/' + id + '/acknowledge'); window.location.reload(); } catch {}
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div></DashboardLayout>;

  const statCards = [
    { label: 'Active Visitors', value: totalActive, icon: Users, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
    { label: 'Suspicious', value: stats.suspiciousCount || 0, icon: AlertTriangle, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10' },
    { label: 'Emergency Alerts', value: stats.emergencyCount || 0, icon: Shield, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10' },
    { label: 'Cameras Active', value: '7/8', icon: Camera, color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
    { label: 'Lost Items', value: lostFoundStats.openLost || 0, icon: Package, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Security Control Center</h2>
            <p className="text-surface-400 text-sm">Real-time monitoring & visitor management</p>
          </div>
          <div className="flex items-center gap-2">
            <OnlineStatusBadge userId={user?._id || ''} />
            <button onClick={() => setShowDirectory(true)} className="btn-secondary text-sm"><Users className="w-4 h-4" /> Directory</button>
            <button onClick={() => setShowCameras(!showCameras)} className="btn-secondary text-sm"><Camera className="w-4 h-4" /> {showCameras ? 'Hide' : 'Live View'}</button>
            <button onClick={() => setShowSos(true)} className="btn-danger flex items-center gap-2 px-4 py-2.5 rounded-xl">
              <AlertTriangle className="w-4 h-4" /> SOS
            </button>
          </div>
        </div>

        <div className="card-grid">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.bg)}>
                    <Icon className={cn('w-5 h-5', card.color)} />
                  </div>
                  <Activity className="w-4 h-4 text-surface-300" />
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-surface-400">{card.label}</p>
              </div>
            );
          })}
        </div>

        {showCameras && <SurveillancePanel />}

        <AIInsights />

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Active Visitors</h3>
              <span className="text-xs text-surface-400">{totalActive} inside</span>
            </div>
            {activeVisitors.length === 0 ? (
              <div className="text-center py-10 text-surface-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No active visitors currently inside the community.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {activeVisitors.map((v) => {
                  const entryTime = v.entryTime ? new Date(v.entryTime) : null;
                  const duration = entryTime ? now - entryTime.getTime() : 0;
                  return (
                    <div key={v._id} className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700/50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {v.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{v.name}</p>
                            <div className="flex items-center gap-1.5 text-xs text-surface-400 mt-0.5">
                              <Phone className="w-3 h-3" />
                              {v.phone}
                            </div>
                          </div>
                        </div>
                        <span className="badge badge-secondary text-[10px]">Inside Community</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        <div className="flex items-center gap-1.5 text-surface-400">
                          <MapPin className="w-3 h-3 text-primary-500" />
                          <span><span className="font-medium text-surface-600 dark:text-surface-300">Resident:</span> {v.resident?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-surface-400">
                          <MessageSquare className="w-3 h-3 text-secondary-500" />
                          <span><span className="font-medium text-surface-600 dark:text-surface-300">Purpose:</span> {v.purpose}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-surface-400">
                          <MapPin className="w-3 h-3 text-warning-500" />
                          <span><span className="font-medium text-surface-600 dark:text-surface-300">House:</span> {v.houseCode || (v.house?.houseCode)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-surface-400">
                          <Car className="w-3 h-3 text-info-500" />
                          <span><span className="font-medium text-surface-600 dark:text-surface-300">Vehicle:</span> {v.vehicleNumber || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-surface-200 dark:border-surface-700/50">
                        <div className="flex items-center gap-3 text-xs text-surface-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Entry: {entryTime ? entryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </div>
                          <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-medium">
                            <Activity className="w-3 h-3" />
                            {duration > 0 ? formatDuration(duration) : 'Just now'}
                          </div>
                        </div>
                        <button onClick={() => handleMarkExit(v._id)} className="btn-danger text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
                          <LogOut className="w-3.5 h-3.5" /> Mark Exit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Active Alerts</h3>
              <span className="text-xs text-surface-400">{alerts.length} new</span>
            </div>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-surface-400 text-sm">All clear - no active alerts</div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {alerts.map((a) => (
                  <div key={a._id} className="flex items-center justify-between p-3 rounded-xl bg-danger-50/50 dark:bg-danger-500/5 border border-danger-100 dark:border-danger-500/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-danger-500" />
                        <p className="text-sm font-medium truncate">{a.title}</p>
                      </div>
                      <p className="text-xs text-surface-400 truncate">{a.message}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={cn('badge text-xs', a.severity === 'critical' ? 'badge-danger' : 'badge-warning')}>{a.severity}</span>
                      <button onClick={() => acknowledgeAlert(a._id)} className="p-1.5 rounded-lg bg-white dark:bg-surface-800 hover:bg-surface-100">Ack</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showSos && <SOSEmergency onClose={() => setShowSos(false)} />}
      {showDirectory && <UserDirectory onClose={() => setShowDirectory(false)} />}
    </DashboardLayout>
  );
}
