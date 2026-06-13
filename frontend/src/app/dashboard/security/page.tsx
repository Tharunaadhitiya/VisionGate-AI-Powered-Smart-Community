'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Users, Camera, AlertTriangle, Shield, CheckCircle, Clock, Activity, MessageSquare, Phone, MapPin, LogOut, Car, Package, Search, FileText, Radio, BarChart3, TrendingUp, TrendingDown, RefreshCw, Bell, Minus } from 'lucide-react';
import { cn, timeAgo, getStatusColor } from '@/lib/utils';
import SurveillancePanel from '@/components/surveillance/SurveillancePanel';
import TiltCard from '@/components/ui/TiltCard';
import SOSEmergency from '@/components/dashboard/SOSEmergency';
import UserDirectory from '@/components/dashboard/UserDirectory';
import OnlineStatusBadge from '@/components/dashboard/OnlineStatusBadge';
import AIInsights from '@/components/dashboard/AIInsights';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animation';
import { Skeleton } from '@/components/ui/Skeleton';

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
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [showCameras, setShowCameras] = useState(false);
  const [showSos, setShowSos] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const hasDataRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, visitorsRes, alertsRes] = await Promise.allSettled([
        api.get('/analytics/security-dashboard'),
        api.get('/visitors?status=entered&limit=50'),
        api.get('/alerts?limit=5&status=new'),
      ]);

      if (dashRes.status === 'fulfilled') { setStats(dashRes.value.data || {}); hasDataRef.current = true; setError(false); }
      else if (!hasDataRef.current) setError(true);

      if (visitorsRes.status === 'fulfilled') {
        setActiveVisitors(visitorsRes.value.data.visitors || []);
        setTotalActive(visitorsRes.value.data.total || 0);
      }
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data.alerts || []);

      setLoading(false);
    } catch {
      if (!hasDataRef.current) setError(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

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

  if (loading) return (
    <DashboardLayout>
      <div className="space-y-6">
        <Skeleton className="h-8 w-56 mb-1" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card p-6"><Skeleton className="h-10 w-10 rounded-xl mb-3" /><Skeleton className="h-7 w-20 mb-2" /><Skeleton className="h-4 w-24" /></div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );

  const statCards = error ? [] : [
    { label: 'Active Visitors', value: totalActive, icon: Users, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10', trend: stats?.visitorTrend },
    { label: 'Suspicious', value: stats?.suspiciousCount ?? 0, icon: AlertTriangle, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10', trend: stats?.suspiciousTrend },
    { label: 'Emergency Alerts', value: stats?.emergencyCount ?? 0, icon: Shield, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10', trend: 0 },
    { label: 'Alerts Today', value: stats?.alertsToday ?? 0, icon: Bell, color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-500/10', trend: 0 },
    { label: 'Packages Today', value: stats?.packagesToday ?? 0, icon: Package, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', trend: 0 },
    { label: 'Pending Approvals', value: stats?.pendingApprovals ?? 0, icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', trend: 0 },
    { label: 'Surveillance Events', value: stats?.surveillanceEvents ?? 0, icon: Camera, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10', trend: 0 },
    { label: 'Open Lost Items', value: stats?.openLostItems ?? 0, icon: Search, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', trend: 0 },
  ];

  const quickActions = [
    { label: 'Live View', desc: 'Toggle surveillance cameras', icon: Camera, color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-500/10', onClick: () => setShowCameras(!showCameras) },
    { label: 'SOS Emergency', desc: 'Handle emergency alerts', icon: AlertTriangle, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10', onClick: () => setShowSos(true) },
    { label: 'User Directory', desc: 'Look up community members', icon: Search, color: 'text-info-500', bg: 'bg-info-50 dark:bg-info-500/10', onClick: () => setShowDirectory(true) },
    { label: 'Visitor Logs', desc: 'View all visitor history', icon: FileText, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10', href: '/visitors' },
    { label: 'Alert History', desc: 'Review past security alerts', icon: Clock, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10', href: '/alerts' },
    { label: 'Incidents', desc: 'Track security incidents', icon: Shield, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', href: '/incidents' },
    { label: 'Lost & Found', desc: 'Manage lost & found items', icon: Package, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', href: '/lost-and-found' },
    { label: 'Security Reports', desc: 'View analytics & reports', icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', href: '/analytics' },
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

        {/* --- Section: Overview --- */}
        <div>
          <h3 className="section-title mb-6">Overview</h3>
          {error && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-danger-50 dark:bg-danger-500/10 text-danger-600 dark:text-danger-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Unable to load some data. Showing cached values.
              <button onClick={fetchData} className="ml-auto btn-secondary text-xs px-3 py-1"><RefreshCw className="w-3 h-3" /> Retry</button>
            </div>
          )}
          <motion.div className="grid grid-cols-4 gap-6" variants={staggerContainer} initial="hidden" animate="visible">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <motion.div key={card.label} variants={staggerItem} className="glass-card p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.bg)}>
                      <Icon className={cn('w-5 h-5', card.color)} />
                    </div>
                    {card.trend !== undefined && (
                      <span className={cn('flex items-center gap-0.5 text-[11px] font-medium',
                        card.trend > 0 ? 'text-emerald-500' : card.trend < 0 ? 'text-red-500' : 'text-surface-300'
                      )}>
                        {card.trend > 0 ? <TrendingUp className="w-3 h-3" /> : card.trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {card.trend !== 0 ? Math.abs(card.trend) + '%' : '—'}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold mb-1">{card.value}</p>
                  <p className="text-sm text-surface-400">{card.label}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* --- Section: Quick Actions --- */}
        <div className="mt-8">
          <h3 className="section-title mb-6">Quick Actions</h3>
          <motion.div className="grid grid-cols-4 gap-6" variants={staggerContainer} initial="hidden" animate="visible">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const card = (
                <div className="action-card">
                  <svg className="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0 action-icon', action.bg)}>
                    <Icon className={cn('w-6 h-6', action.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold mb-0.5">{action.label}</p>
                    <p className="text-xs text-surface-400">{action.desc}</p>
                  </div>
                </div>
              );
              const wrapped = <TiltCard>{card}</TiltCard>;
              if (action.href) {
                return <motion.div key={action.label} variants={staggerItem}><a href={action.href} className="block">{wrapped}</a></motion.div>;
              }
              return <motion.div key={action.label} variants={staggerItem}><button onClick={action.onClick} className="w-full text-left">{wrapped}</button></motion.div>;
            })}
          </motion.div>
        </div>

        {/* --- Section: AI Insights --- */}
        <div className="mt-8">
          <AIInsights />
        </div>

        {/* --- Live View --- */}
        {showCameras && (
          <div className="mt-8">
            <SurveillancePanel />
          </div>
        )}

        {/* --- Section: Active Monitoring --- */}
        <div className="mt-8">
          <h3 className="section-title mb-6">Active Monitoring</h3>
          <div className="grid grid-cols-2 gap-6">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }}>
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold">Active Visitors</h4>
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
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }}>
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold">Active Alerts</h4>
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
            </motion.div>
          </div>
        </div>
      </div>

      {showSos && <SOSEmergency onClose={() => setShowSos(false)} />}
      {showDirectory && <UserDirectory onClose={() => setShowDirectory(false)} />}
    </DashboardLayout>
  );
}
