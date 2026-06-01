'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Users, Camera, AlertTriangle, Shield, CheckCircle, XCircle, Search, QrCode, Clock, Eye, Activity, MessageSquare, UserCheck } from 'lucide-react';
import { cn, formatDateTime, timeAgo, getStatusColor } from '@/lib/utils';
import SurveillancePanel from '@/components/surveillance/SurveillancePanel';
import SOSEmergency from '@/components/dashboard/SOSEmergency';
import UserDirectory from '@/components/dashboard/UserDirectory';
import OnlineStatusBadge from '@/components/dashboard/OnlineStatusBadge';
import AIInsights from '@/components/dashboard/AIInsights';
import toast from 'react-hot-toast';

export default function SecurityDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [recentVisitors, setRecentVisitors] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showCameras, setShowCameras] = useState(false);
  const [showSos, setShowSos] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [visitorSearch, setVisitorSearch] = useState('');
  const [foundVisitor, setFoundVisitor] = useState<any>(null);
  const [searchingVisitor, setSearchingVisitor] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/visitors?limit=10&status=checked_in'),
      api.get('/alerts?limit=5&status=new'),
      api.get('/analytics/security'),
    ]).then(([visitorsRes, alertsRes, analyticsRes]) => {
      setRecentVisitors(visitorsRes.data.visitors || []);
      setAlerts(alertsRes.data.alerts || []);
      setStats(analyticsRes.data || {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCheckIn = async (id: string) => {
    try { await api.put('/visitors/' + id + '/status', { status: 'checked_in' }); window.location.reload(); } catch {}
  };

  const handleCheckOut = async (id: string) => {
    try { await api.put('/visitors/' + id + '/status', { status: 'checked_out' }); window.location.reload(); } catch {}
  };

  const acknowledgeAlert = async (id: string) => {
    try { await api.put('/alerts/' + id + '/acknowledge'); window.location.reload(); } catch {}
  };

  const searchVisitorByPhone = async () => {
    if (!visitorSearch.trim()) return;
    setSearchingVisitor(true);
    try {
      const { data } = await api.get('/visitors?limit=5');
      const visitors = data.visitors || [];
      const found = visitors.find((v: any) => v.phone.includes(visitorSearch) || v.name.toLowerCase().includes(visitorSearch.toLowerCase()));
      setFoundVisitor(found || null);
      if (!found) toast.error('No visitor found matching that criteria');
    } catch { toast.error('Search failed'); }
    setSearchingVisitor(false);
  };

  const verifyOTP = async () => {
    if (!foundVisitor || !otpInput.trim()) return toast.error('First search for a visitor, then enter OTP');
    try {
      await api.put('/visitors/' + foundVisitor._id + '/verify-otp', { otp: otpInput });
      toast.success('OTP verified! Visitor checked in.');
      setOtpInput('');
      setFoundVisitor(null);
      setVisitorSearch('');
      window.location.reload();
    } catch (err: any) { toast.error(err.message || 'Invalid or expired OTP'); }
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div></DashboardLayout>;

  const statCards = [
    { label: 'Active Visitors', value: stats.totalVisitors || 0, icon: Users, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
    { label: 'Suspicious', value: stats.suspiciousCount || 0, icon: AlertTriangle, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10' },
    { label: 'Emergency Alerts', value: stats.emergencyCount || 0, icon: Shield, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10' },
    { label: 'Cameras Active', value: '7/8', icon: Camera, color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
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
              <button onClick={() => setShowScanner(true)} className="btn-primary text-sm"><QrCode className="w-4 h-4" /> Verify Entry</button>
            </div>
            {recentVisitors.length === 0 ? (
              <div className="text-center py-8 text-surface-400 text-sm">No active visitors</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {recentVisitors.map((v) => (
                  <div key={v._id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{v.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-medium">{v.name}</p>
                        <p className="text-xs text-surface-400">{v.purpose} &middot; {v.vehicleNumber || 'No vehicle'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('badge text-xs', getStatusColor(v.status))}>{v.status}</span>
                      {v.status === 'checked_in' && <button onClick={() => handleCheckOut(v._id)} className="p-1.5 rounded-lg bg-surface-200 dark:bg-surface-700 hover:bg-surface-300"><CheckCircle className="w-3.5 h-3.5 text-secondary-600" /></button>}
                    </div>
                  </div>
                ))}
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
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
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
                      <button onClick={() => acknowledgeAlert(a._id)} className="p-1.5 rounded-lg bg-white dark:bg-surface-800 hover:bg-surface-100"><Eye className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowScanner(false)}>
          <div className="glass-card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Visitor OTP Verification</h3>
              <button onClick={() => setShowScanner(false)} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"><XCircle className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-surface-400 block mb-1">Search Visitor by Name or Phone</label>
                <div className="flex gap-2">
                  <input className="input-field flex-1 text-sm" placeholder="Enter name or phone number..." value={visitorSearch} onChange={(e) => setVisitorSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchVisitorByPhone()} />
                  <button onClick={searchVisitorByPhone} disabled={searchingVisitor} className="btn-primary"><Search className="w-4 h-4" /></button>
                </div>
              </div>

              {foundVisitor && (
                <div className="p-3 rounded-xl bg-secondary-50 dark:bg-secondary-500/10 border border-secondary-200 dark:border-secondary-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">{foundVisitor.name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-medium">{foundVisitor.name}</p>
                      <p className="text-xs text-surface-400">{foundVisitor.phone} &middot; {foundVisitor.purpose}</p>
                      <p className="text-xs text-surface-400">Status: <span className={cn('badge text-[10px]', getStatusColor(foundVisitor.status))}>{foundVisitor.status}</span></p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs font-medium text-surface-400 block mb-1">Enter OTP</label>
                    <div className="flex gap-2">
                      <input className="input-field flex-1 text-center text-lg tracking-widest" placeholder="000000" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} maxLength={6} />
                      <button onClick={verifyOTP} className="btn-primary"><UserCheck className="w-4 h-4" /> Verify</button>
                    </div>
                  </div>
                </div>
              )}

              {!foundVisitor && visitorSearch && !searchingVisitor && (
                <p className="text-xs text-surface-400 text-center py-2">No visitor found. Try a different search.</p>
              )}

              <div className="text-center text-xs text-surface-400 mt-2">
                <p>Visitors receive an OTP when registered by a resident.</p>
                <p>Enter the OTP to verify and allow entry.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSos && <SOSEmergency onClose={() => setShowSos(false)} />}
      {showDirectory && <UserDirectory onClose={() => setShowDirectory(false)} />}
    </DashboardLayout>
  );
}
