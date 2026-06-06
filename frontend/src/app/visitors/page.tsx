'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Users, Search, Plus, CheckCircle, XCircle, Clock, Phone, Car, User, Home, LogIn, LogOut, Building2, ChevronDown, Loader2, Send, ShieldAlert, BarChart3 } from 'lucide-react';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400',
  approved: 'bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400',
  rejected: 'bg-danger-100 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400',
  entered: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  exited: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400',
};

export default function VisitorsPage() {
  const { user } = useAuth();
  const role = user?.role || 'resident';
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', purpose: 'personal', vehicleNumber: '', vehicleType: 'car', idProof: '' });
  const [submitting, setSubmitting] = useState(false);

  const [towers, setTowers] = useState<string[]>([]);
  const [selectedTower, setSelectedTower] = useState('');
  const [flats, setFlats] = useState<any[]>([]);
  const [selectedFlat, setSelectedFlat] = useState<any | null>(null);
  const [residentDetails, setResidentDetails] = useState<any | null>(null);
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [loadingResident, setLoadingResident] = useState(false);

  const [summary, setSummary] = useState<any>(null);

  const fetchVisitors = async () => {
    try {
      const params: any = { limit: '50' };
      if (filter) params.status = filter;
      const res = await api.get('/visitors', params);
      setVisitors(res.data?.visitors || []);
    } catch {} finally { setLoading(false); }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get('/visitors/summary');
      setSummary(res.data || null);
    } catch {}
  };

  useEffect(() => {
    fetchVisitors();
    if (role === 'admin') fetchSummary();
  }, [filter, role]);

  const fetchTowers = async () => {
    try {
      const res = await api.get('/visitors/towers');
      const towerArr = res.data?.towers?.map((t: any) => t.tower) || [];
      console.log('Towers API Response:', towerArr);
      setTowers(towerArr);
    } catch (err) { console.error('Failed to load towers:', err); }
  };

  const fetchFlats = async (tower: string) => {
    setLoadingFlats(true);
    setSelectedFlat(null);
    setResidentDetails(null);
    try {
      const res = await api.get(`/visitors/flats/${tower}`);
      const flatArr = res.data?.flats || [];
      console.log('Flats API Response:', flatArr);
      console.log('Selected Tower:', tower);
      setFlats(flatArr);
    } catch (err) { console.error('Failed to load flats:', err); } finally { setLoadingFlats(false); }
  };

  const fetchResidentDetails = async (houseCode: string) => {
    setLoadingResident(true);
    try {
      const res = await api.get(`/visitors/resident/${houseCode}`);
      const rd = res.data?.resident;
      console.log('Resident Details:', rd);
      setResidentDetails(rd);
    } catch (err) { console.error('Failed to load resident details:', err); setResidentDetails(null); } finally { setLoadingResident(false); }
  };

  useEffect(() => {
    if (!showForm) return;
    fetchTowers();
    setSelectedTower('');
    setFlats([]);
    setSelectedFlat(null);
    setResidentDetails(null);
  }, [showForm]);

  useEffect(() => {
    if (!selectedTower) { setFlats([]); setSelectedFlat(null); setResidentDetails(null); return; }
    fetchFlats(selectedTower);
  }, [selectedTower]);

  const selectFlat = (flat: any) => {
    console.log('Selected Flat:', flat);
    setSelectedFlat(flat);
    if (flat.house_code) {
      fetchResidentDetails(flat.house_code);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) { toast.error('Visitor name and phone are required'); return; }
    if (!selectedFlat) { toast.error('Please select a flat'); return; }
    if (!selectedFlat.resident_id) { toast.error('Selected flat has no resident assigned'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/visitors', { ...form, houseId: selectedFlat.id });
      toast.success(res.message || 'Entry request sent');
      setShowForm(false);
      setForm({ name: '', phone: '', purpose: 'personal', vehicleNumber: '', vehicleType: 'car', idProof: '' });
      setSelectedTower('');
      setFlats([]);
      setSelectedFlat(null);
      setResidentDetails(null);
      fetchVisitors();
    } catch (err: any) { toast.error(err.message || 'Failed to send request'); } finally { setSubmitting(false); }
  };

  const handleRespond = async (id: string, action: string) => {
    try {
      const res = await api.put(`/visitors/${id}/respond`, { action });
      toast.success(res.message || `Visitor ${action}`);
      fetchVisitors();
    } catch (err: any) { toast.error(err.message || 'Action failed'); }
  };

  const handleEnter = async (id: string) => {
    try {
      await api.put(`/visitors/${id}/enter`);
      toast.success('Entry recorded');
      fetchVisitors();
    } catch (err: any) { toast.error(err.message || 'Failed to record entry'); }
  };

  const handleExit = async (id: string) => {
    try {
      await api.put(`/visitors/${id}/exit`);
      toast.success('Exit recorded');
      fetchVisitors();
    } catch (err: any) { toast.error(err.message || 'Failed to record exit'); }
  };

  const filters = ['', 'pending', 'approved', 'rejected', 'entered', 'exited'];
  const filtered = visitors.filter((v) => {
    if (filter && v.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return v.name?.toLowerCase().includes(q) || v.phone?.includes(q) || v.houseCode?.toLowerCase().includes(q);
    }
    return true;
  });

  const renderActions = (v: any) => {
    if (role === 'resident' && v.status === 'pending' && v.residentId === user?._id) {
      return (
        <div className="flex gap-1">
          <button onClick={() => handleRespond(v._id, 'approved')} className="p-1.5 rounded-lg hover:bg-success-50 text-success-600" title="Approve"><CheckCircle className="w-4 h-4" /></button>
          <button onClick={() => handleRespond(v._id, 'rejected')} className="p-1.5 rounded-lg hover:bg-danger-50 text-danger-600" title="Reject"><XCircle className="w-4 h-4" /></button>
        </div>
      );
    }
    if (role === 'security') {
      if (v.status === 'approved') return <button onClick={() => handleEnter(v._id)} className="btn-primary text-xs py-1 px-2"><LogIn className="w-3 h-3" /> Allow Entry</button>;
      if (v.status === 'entered') return <button onClick={() => handleExit(v._id)} className="btn-secondary text-xs py-1 px-2"><LogOut className="w-3 h-3" /> Mark Exit</button>;
      if (v.status === 'rejected') return <span className="text-xs text-danger-500 font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> Entry Denied</span>;
    }
    return null;
  };

  const renderStatusBadge = (status: string) => (
    <span className={cn('badge text-xs', STATUS_COLORS[status] || STATUS_COLORS.pending)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {role === 'security' ? 'Gate Entry Management' : role === 'resident' ? 'Visitor Requests' : 'Visitor Monitoring'}
            </h2>
            <p className="text-surface-400 text-sm">
              {role === 'security' ? 'Register visitors and manage entry requests' : role === 'resident' ? 'Approve or reject visitor entry requests' : 'Monitor all visitor activity'}
            </p>
          </div>
          {role === 'security' && (
            <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Visitor Request</button>
          )}
        </div>

        {role === 'admin' && summary && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[{ label: 'Pending', value: summary.pending, color: 'text-warning-500' },
              { label: 'Approved', value: summary.approved, color: 'text-success-500' },
              { label: 'Rejected', value: summary.rejected, color: 'text-danger-500' },
              { label: 'Entered', value: summary.entered, color: 'text-blue-500' },
              { label: 'Exited', value: summary.exited, color: 'text-surface-500' },
              { label: 'Today', value: summary.todayCount, color: 'text-primary-500' },
            ].map((s) => (
              <div key={s.label} className="glass-card p-3 text-center">
                <p className={cn('text-2xl font-bold', s.color)}>{s.value ?? 0}</p>
                <p className="text-xs text-surface-400">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input className="input-field pl-9 py-2 text-sm" placeholder={`Search visitors by name, phone or house...`} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {filters.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors', filter === f ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700')}>
                {f || 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-surface-300 mb-3" />
            <p className="text-surface-400 font-medium">No visitors found</p>
            <p className="text-xs text-surface-400 mt-1">
              {role === 'security' ? 'Click "New Visitor Request" to register a visitor for entry.' : role === 'resident' ? 'When security sends a request, it will appear here for your approval.' : 'No visitor records match your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((v) => (
              <div key={v._id} className="glass-card p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-md">
                      {v.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base">{v.name}</h3>
                        {renderStatusBadge(v.status)}
                      </div>
                      <div className="text-xs text-surface-500 mt-0.5 flex items-center gap-2">
                        <span className="flex items-center gap-1"><Home className="w-3 h-3 text-primary-400" /> <strong>{v.houseCode}</strong></span>
                        <span className="text-surface-300">|</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3 text-primary-400" /> {v.resident?.name || v.house?.residentName || '—'}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surface-400 mt-1.5">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {v.phone}</span>
                        {v.purpose && <span className="capitalize font-medium text-surface-500">Purpose: {v.purpose}</span>}
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(v.createdAt)}</span>
                      </div>
                      {v.vehicleNumber && (
                        <p className="text-xs text-surface-500 mt-1 flex items-center gap-1">
                          <Car className="w-3 h-3 text-primary-400" />
                          <span className="font-medium">{v.vehicleNumber}</span>
                          {v.vehicleType && <span className="text-surface-400 ml-1">({v.vehicleType.replace('_', ' ')})</span>}
                        </p>
                      )}
                      {v.status === 'approved' && v.approvalTime && <p className="text-xs text-success-500 mt-1">Approved: {formatDateTime(v.approvalTime)}</p>}
                      {v.entryTime && <p className="text-xs text-blue-500 mt-0.5">Entry: {formatDateTime(v.entryTime)}</p>}
                      {v.exitTime && <p className="text-xs text-surface-500 mt-0.5">Exit: {formatDateTime(v.exitTime)}</p>}
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">{renderActions(v)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && role === 'security' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">New Visitor Entry Request</h3>
            <div className="space-y-5">

              {/* Step 1: Select Tower */}
              <div>
                <h4 className="text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Building2 className="w-3 h-3 text-surface-500" /> Step 1: Select Tower
                </h4>
                <select className="input-field" value={selectedTower} onChange={(e) => setSelectedTower(e.target.value)}>
                  <option value="">-- Select Tower --</option>
                  {towers.map((t) => (
                    <option key={t} value={t}>Tower {t}</option>
                  ))}
                </select>
                {towers.length === 0 && (
                  <p className="text-xs text-warning-500 mt-1">No resident houses have been assigned yet.</p>
                )}
              </div>

              {/* Step 2: Select Flat */}
              {selectedTower && (
                <div>
                  <h4 className="text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Home className="w-3 h-3 text-surface-500" /> Step 2: Select Flat — Tower {selectedTower}
                  </h4>
                  {loadingFlats ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
                  ) : flats.length === 0 ? (
                    <p className="text-sm text-surface-500 dark:text-surface-400 text-center py-3">No occupied flats in Tower {selectedTower}.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {flats.map((f) => (
                        <button
                          key={f.id || f.house_code}
                          onClick={() => selectFlat(f)}
                          className={cn(
                            'p-3 rounded-xl text-center transition-all border-2',
                            selectedFlat?.id === f.id
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-md'
                              : 'border-surface-200 dark:border-surface-700 hover:border-primary-300 bg-white dark:bg-surface-800'
                          )}
                        >
                          <p className="font-bold text-base text-surface-900 dark:text-surface-100">{f.house_code}</p>
                          <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-0.5 truncate">Flat {f.flat_number}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Resident Details */}
              {selectedFlat && (
                <div>
                  <h4 className="text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <User className="w-3 h-3 text-surface-500" /> Resident Information
                  </h4>
                  {loadingResident ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
                  ) : residentDetails ? (
                    <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                          {residentDetails.name}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          Online
                        </span>
                      </div>
                      <div className="text-xs text-surface-500 space-y-1">
                        <p><span className="font-medium text-surface-600 dark:text-surface-300">House:</span> {residentDetails.house_code}</p>
                        <p><span className="font-medium text-surface-600 dark:text-surface-300">Tower:</span> {residentDetails.tower}</p>
                        <p><span className="font-medium text-surface-600 dark:text-surface-300">Flat:</span> {residentDetails.flat_number}</p>
                        <p><span className="font-medium text-surface-600 dark:text-surface-300">Phone:</span> {residentDetails.phone || '—'}</p>
                        <p><span className="font-medium text-surface-600 dark:text-surface-300">Email:</span> {residentDetails.email || '—'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-surface-400 text-center py-3">Unable to load resident details.</p>
                  )}
                </div>
              )}

              {/* Step 4: Visitor Information */}
              <div>
                <h4 className="text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="w-3 h-3 text-surface-500" /> Visitor Details
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">Visitor Name</label>
                    <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">Mobile Number</label>
                    <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">Purpose of Visit</label>
                    <select className="input-field" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
                      {['personal', 'delivery', 'service', 'emergency', 'other'].map((p) => (<option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 5: Vehicle Information */}
              <div>
                <h4 className="text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Car className="w-3 h-3 text-surface-500" /> Vehicle Details
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">Vehicle Number <span className="text-surface-400 font-normal">(optional)</span></label>
                    <input className="input-field" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="e.g. TN09AB1234" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">Vehicle Type</label>
                    <select className="input-field" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                      {[
                        { value: 'car', label: 'Car' },
                        { value: 'bike', label: 'Bike' },
                        { value: 'auto', label: 'Auto' },
                        { value: 'taxi', label: 'Taxi' },
                        { value: 'delivery_vehicle', label: 'Delivery Vehicle' },
                        { value: 'other', label: 'Other' },
                      ].map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || !selectedFlat} className="btn-primary flex-1">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Entry Request</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
