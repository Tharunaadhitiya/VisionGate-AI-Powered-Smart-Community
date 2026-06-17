'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Users, Camera, AlertTriangle, Shield, CheckCircle, Clock, Activity, Phone, MapPin, LogOut, Car, Package, Search, FileText, Radio, BarChart3, TrendingUp, TrendingDown, RefreshCw, Bell, Minus, Home, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import SurveillancePanel from '@/components/surveillance/SurveillancePanel';
import TiltCard from '@/components/ui/TiltCard';
import SOSEmergency from '@/components/dashboard/SOSEmergency';
import UserDirectory from '@/components/dashboard/UserDirectory';
import OnlineStatusBadge from '@/components/dashboard/OnlineStatusBadge';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animation';
import { Skeleton } from '@/components/ui/Skeleton';

import DynamicGreeting from '@/components/dashboard/DynamicGreeting';
import TodaySummary from '@/components/dashboard/TodaySummary';
import NeedsAttention, { type AttentionItem } from '@/components/dashboard/NeedsAttention';
import ActivityFeed, { type ActivityEvent } from '@/components/dashboard/ActivityFeed';
import AIInsightsPanel, { type Insight } from '@/components/dashboard/AIInsightsPanel';
import CommunityHealthScore, { type HealthFactor } from '@/components/dashboard/CommunityHealthScore';

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
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
      if (alertsRes.status === 'fulfilled') {
        const alertData = alertsRes.value.data?.alerts || [];
        setAlerts(alertData);
        const events: ActivityEvent[] = alertData.slice(0, 5).map((a: any) => ({
          id: `alert-${a._id}`, type: a.severity === 'critical' ? 'sos_triggered' : 'alert_raised',
          description: a.title || a.message || 'Alert', timestamp: a.createdAt,
        }));
        setRecentActivity(events);
      }
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
    try { await api.put('/visitors/' + id + '/exit'); toast.success('Visitor exit recorded'); setActiveVisitors((prev) => prev.filter((v) => v._id !== id)); setTotalActive((prev) => Math.max(0, prev - 1)); } catch { toast.error('Failed to record exit'); }
  }, []);

  const acknowledgeAlert = async (id: string) => {
    try { await api.put('/alerts/' + id + '/acknowledge'); window.location.reload(); } catch {}
  };

  if (loading) return (
    <DashboardLayout>
      <div className="space-y-5">
        <Skeleton className="h-8 w-56 mb-1" /><Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="glass-card p-5"><Skeleton className="h-5 w-5 rounded-lg mb-3" /><Skeleton className="h-6 w-20 mb-2" /><Skeleton className="h-3 w-16" /></div>))}
        </div>
      </div>
    </DashboardLayout>
  );

  // ROW 1: Overview Metrics
  const kpiCards = [
    { label: 'Active Visitors', value: totalActive, icon: Users, color: 'text-primary-500', bg: 'bg-primary-500/10' },
    { label: 'Alerts Today', value: stats?.alertsToday ?? 0, icon: Bell, color: 'text-danger-500', bg: 'bg-danger-500/10' },
    { label: 'Suspicious', value: stats?.suspiciousCount ?? 0, icon: AlertTriangle, color: 'text-warning-500', bg: 'bg-warning-500/10' },
    { label: 'Packages Today', value: stats?.packagesToday ?? 0, icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  // ROW 2: Today Summary
  const todaySummaryItems = [
    { icon: Users, label: 'Active Inside', value: totalActive, color: 'text-primary-400 bg-primary-500/10' },
    { icon: Package, label: 'Packages Today', value: stats?.packagesToday ?? 0, color: 'text-amber-400 bg-amber-500/10' },
    { icon: Bell, label: 'Alerts Today', value: stats?.alertsToday ?? 0, color: 'text-danger-400 bg-danger-500/10' },
    { icon: Camera, label: 'Surveillance Events', value: stats?.surveillanceEvents ?? 0, color: 'text-cyan-400 bg-cyan-500/10' },
    { icon: AlertTriangle, label: 'Suspicious', value: stats?.suspiciousCount ?? 0, color: 'text-warning-400 bg-warning-500/10' },
    { icon: FileText, label: 'Pending Approvals', value: stats?.pendingApprovals ?? 0, color: 'text-purple-400 bg-purple-500/10' },
  ];

  // ── RECOMMENDED ACTIONS — scan ALL modules ──
  const attentionItems: AttentionItem[] = [];

  // ════════════════════════════════════════════════
  // ALERTS — emergency, active, critical, unacknowledged
  // ════════════════════════════════════════════════
  const emergencyCount = stats?.emergencyCount || 0;
  const totalAlerts = stats?.totalAlerts || 0;
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledgedAt && a.status !== 'resolved');
  console.debug('[Recommender] Alerts:', { emergency: emergencyCount, total: totalAlerts, critical: criticalAlerts.length, unacknowledged: unacknowledgedAlerts.length });

  if (emergencyCount > 0) {
    attentionItems.push({ id: `emergency-${emergencyCount}`, icon: 'AlertTriangle', label: `${emergencyCount} Emergency Alert${emergencyCount > 1 ? 's' : ''}`, description: 'Require immediate response', priority: 'critical', link: '/alerts', count: emergencyCount });
  }
  if (totalAlerts > 0) {
    attentionItems.push({ id: `active-alerts-${totalAlerts}`, icon: 'Bell', label: `${totalAlerts} Active Alert${totalAlerts > 1 ? 's' : ''}`, description: `${criticalAlerts.length} critical — review and acknowledge`, priority: 'critical', link: '/alerts', count: alerts.length });
  }

  // ════════════════════════════════════════════════
  // SURVEILLANCE — critical AI detections, suspicious activity, unreviewed events
  // ════════════════════════════════════════════════
  const suspiciousCount = stats?.suspiciousCount || 0;
  const surveillanceEvents = stats?.surveillanceEvents || 0;
  console.debug('[Recommender] Surveillance:', { suspicious: suspiciousCount, events: surveillanceEvents });

  if (suspiciousCount > 0) {
    attentionItems.push({ id: `suspicious-${suspiciousCount}`, icon: 'Shield', label: `${suspiciousCount} Suspicious Activit${suspiciousCount > 1 ? 'ies' : 'y'}`, description: 'Flagged — review footage immediately', priority: 'high', link: '/surveillance', count: suspiciousCount });
  }
  if (surveillanceEvents > 10) {
    attentionItems.push({ id: `surveillance-volume-${surveillanceEvents}`, icon: 'Camera', label: `${surveillanceEvents} Surveillance Events`, description: 'Unusually high volume — monitor cameras', priority: 'medium', link: '/surveillance', count: surveillanceEvents });
  }

  // ════════════════════════════════════════════════
  // INCIDENTS — reported, active
  // ════════════════════════════════════════════════
  const totalIncidents = stats?.totalIncidents || 0;
  console.debug('[Recommender] Incidents:', { total: totalIncidents });

  if (totalIncidents > 0) {
    attentionItems.push({ id: `incidents-${totalIncidents}`, icon: 'AlertTriangle', label: `${totalIncidents} Security Incident${totalIncidents > 1 ? 's' : ''}`, description: 'Reported — file report and investigate', priority: 'high', link: '/incidents', count: totalIncidents });
  }

  // ════════════════════════════════════════════════
  // VISITORS — pending approvals, awaiting entry
  // ════════════════════════════════════════════════
  const pendingApprovals = stats?.pendingApprovals || 0;
  console.debug('[Recommender] Visitors:', { pendingApprovals, activeInside: totalActive });

  if (pendingApprovals > 0) {
    attentionItems.push({ id: `approvals-${pendingApprovals}`, icon: 'UserPlus', label: `${pendingApprovals} Pending Approval${pendingApprovals > 1 ? 's' : ''}`, description: 'Visitor requests awaiting response', priority: 'medium', link: '/visitors', count: pendingApprovals });
  }

  // ════════════════════════════════════════════════
  // PACKAGES — undelivered, awaiting pickup, pending verification
  // ════════════════════════════════════════════════
  const packagesToday = stats?.packagesToday || 0;
  console.debug('[Recommender] Packages:', { today: packagesToday });

  if (packagesToday > 0) {
    attentionItems.push({ id: `packages-${packagesToday}`, icon: 'Package', label: `${packagesToday} Package${packagesToday > 1 ? 's' : ''} to Process`, description: 'Received today — verify and distribute', priority: 'medium', link: '/packages', count: packagesToday });
  }

  // ════════════════════════════════════════════════
  // LOST & FOUND — awaiting match, awaiting verification
  // ════════════════════════════════════════════════
  const openLostItems = stats?.openLostItems || 0;
  console.debug('[Recommender] Lost & Found:', { openLost: openLostItems });

  if (openLostItems > 0) {
    attentionItems.push({ id: `lost-${openLostItems}`, icon: 'Search', label: `${openLostItems} Open Lost Item${openLostItems > 1 ? 's' : ''}`, description: 'Unrecovered — review and match', priority: 'low', link: '/lost-and-found', count: openLostItems });
  }

  // ════════════════════════════════════════════════
  // COMPLAINTS — check complaint stats if available
  // ════════════════════════════════════════════════
  console.debug('[Recommender] Complaints: no complaint data fetched for security role');

  // ════════════════════════════════════════════════
  // MAINTENANCE — check if any open maintenance requests
  // ════════════════════════════════════════════════
  console.debug('[Recommender] Maintenance: no maintenance data fetched for security role');

  // ════════════════════════════════════════════════
  // SUMMARY LOG
  // ════════════════════════════════════════════════
  console.debug('[Recommender] Total recommendations:', attentionItems.length, attentionItems.map((i) => i.label));

  // ROW 2: AI Insights
  const insights: Insight[] = [];
  if ((stats?.suspiciousCount || 0) > 0) insights.push({ id: 'suspicious-warn', icon: 'alert', text: `${stats.suspiciousCount} suspicious ${stats.suspiciousCount === 1 ? 'activity was' : 'activities were'} detected. Review footage.`, type: 'warning' });
  if ((stats?.packagesToday || 0) > 10) insights.push({ id: 'pkg-surge', icon: 'package', text: 'High package volume. Ensure delivery area is staffed.', type: 'neutral' });
  if ((stats?.totalAlerts || 0) === 0 && (stats?.emergencyCount || 0) === 0) insights.push({ id: 'all-clear', icon: 'security', text: 'All systems normal. No active alerts.', type: 'positive' });
  if ((stats?.surveillanceEvents || 0) > (stats?.surveillanceEventsToday || 0)) {
    const diff = (stats?.surveillanceEvents || 0) - (stats?.surveillanceEventsToday || 0);
    insights.push({ id: 'surv-trend', icon: 'trending_up', text: `${diff} more surveillance events this week than yesterday.`, type: 'neutral' });
  }
  if (totalActive > 10) insights.push({ id: 'crowded', icon: 'users', text: `${totalActive} visitors currently inside. Peak monitoring hours.`, type: 'warning' });

  // ROW 2: Community Health
  const healthFactors: HealthFactor[] = [
    { key: 'security', label: 'Security Incidents', score: (stats?.totalIncidents || 0) === 0 ? 100 : Math.max(0, 100 - (stats?.totalIncidents || 0) * 20), weight: 30, explanation: (stats?.totalIncidents || 0) > 0 ? `${stats?.totalIncidents || 0} active` : undefined },
    { key: 'alerts', label: 'Active Alerts', score: (stats?.totalAlerts || 0) === 0 ? 100 : Math.max(0, 100 - (stats?.totalAlerts || 0) * 10), weight: 30, explanation: (stats?.totalAlerts || 0) > 0 ? `${stats?.totalAlerts || 0} active` : undefined },
    { key: 'engagement', label: 'Resident Engagement', score: totalActive > 5 ? 80 : totalActive > 0 ? 50 : 100, weight: 20 },
    { key: 'complaints', label: 'Complaints', score: 100, weight: 10 },
    { key: 'payments', label: 'Pending Payments', score: 100, weight: 10 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Unable to load some data. Showing cached values.
            <button onClick={fetchData} className="ml-auto btn-secondary text-xs px-3 py-1"><RefreshCw className="w-3 h-3" /> Retry</button>
          </div>
        )}

        <DynamicGreeting role="Security" name={user?.name} />

        {/* ROW 1: Overview Metrics */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} variants={staggerItem} className="glass-card p-4 flex items-center gap-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', card.bg)}>
                  <Icon className={cn('w-5 h-5', card.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-surface-900 dark:text-surface-100 leading-tight">{card.value}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{card.label}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ROW 2: 3-column */}
        <div className="grid lg:grid-cols-3 gap-5">
          <TodaySummary items={todaySummaryItems} compact />
          <CommunityHealthScore factors={healthFactors} />
          <AIInsightsPanel insights={insights} />
        </div>

        {/* ROW 3: 2-column */}
        <div className="grid lg:grid-cols-2 gap-5">
          <NeedsAttention items={attentionItems} title="Recommended Actions" userId={user?._id} />
          <ActivityFeed events={recentActivity} />
        </div>

        {/* ROW 4: Active Monitoring — full width */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Active Visitors */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-200">Active Visitors</h4>
              <span className="text-xs text-surface-500">{totalActive} inside</span>
            </div>
            {activeVisitors.length === 0 ? (
              <div className="text-center py-10 text-surface-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No active visitors</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {activeVisitors.map((v) => {
                  const entryTime = v.entryTime ? new Date(v.entryTime) : null;
                  const duration = entryTime ? now - entryTime.getTime() : 0;
                  return (
                    <div key={v._id} className="p-3 rounded-xl bg-white/5 dark:bg-surface-800/40 border border-white/5 dark:border-surface-700/50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold shrink-0">{v.name?.charAt(0)}</div>
                          <div>
                            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">{v.name}</p>
                            <p className="text-xs text-surface-500">{v.phone}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary-500/20 text-secondary-400">Inside</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-surface-500 mb-2">
                        <span><span className="text-surface-400">Purpose:</span> {v.purpose}</span>
                        <span><span className="text-surface-400">House:</span> {v.houseCode || (v.house?.houseCode) || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 dark:border-surface-700/50">
                        <div className="flex items-center gap-2 text-xs text-surface-500">
                          <Clock className="w-3 h-3" />
                          {entryTime ? entryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          <span className="text-primary-400 font-medium">{duration > 0 ? formatDuration(duration) : 'Just now'}</span>
                        </div>
                        <button onClick={() => handleMarkExit(v._id)} className="px-2.5 py-1.5 rounded-lg bg-danger-500/10 text-danger-400 hover:bg-danger-500/20 text-xs font-medium flex items-center gap-1"><LogOut className="w-3 h-3" /> Exit</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Alerts */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-200">Active Alerts</h4>
              <span className="text-xs text-surface-500">{alerts.length} new</span>
            </div>
            {alerts.length === 0 ? (
              <div className="text-center py-10 text-surface-500 text-sm">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
                All clear — no active alerts
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {alerts.map((a) => (
                  <div key={a._id} className="flex items-center justify-between p-3 rounded-xl bg-danger-500/5 border border-danger-500/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-danger-500 shrink-0" />
                        <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{a.title}</p>
                      </div>
                      <p className="text-xs text-surface-500 truncate">{a.message}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase', a.severity === 'critical' ? 'bg-danger-500/20 text-danger-400' : 'bg-warning-500/20 text-warning-400')}>{a.severity}</span>
                      <button onClick={() => acknowledgeAlert(a._id)} className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-surface-300">Ack</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tools */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Tools</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Live View', desc: 'Toggle cameras', icon: Camera, color: 'text-secondary-500', bg: 'bg-secondary-500/10', onClick: () => setShowCameras(!showCameras) },
              { label: 'SOS Emergency', desc: 'Handle emergency alerts', icon: AlertTriangle, color: 'text-danger-500', bg: 'bg-danger-500/10', onClick: () => setShowSos(true) },
              { label: 'User Directory', desc: 'Look up members', icon: Search, color: 'text-info-500', bg: 'bg-info-500/10', onClick: () => setShowDirectory(true) },
              { label: 'Security Reports', desc: 'View analytics', icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-500/10', onClick: () => window.location.href = '/analytics' },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <motion.div key={a.label} variants={staggerItem}>
                  <TiltCard>
                    <button onClick={a.onClick} className="action-card w-full">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 action-icon', a.bg)}>
                        <Icon className={cn('w-5 h-5', a.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold mb-0.5">{a.label}</p>
                        <p className="text-xs text-surface-400">{a.desc}</p>
                      </div>
                    </button>
                  </TiltCard>
                </motion.div>
              );
            })}
          </div>
        </div>

        {showCameras && <SurveillancePanel />}
      </div>

      {showSos && <SOSEmergency onClose={() => setShowSos(false)} />}
      {showDirectory && <UserDirectory onClose={() => setShowDirectory(false)} />}
    </DashboardLayout>
  );
}
