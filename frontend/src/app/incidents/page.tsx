'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Shield, AlertTriangle, Plus, Search, Image, Loader2, MapPin, CheckCircle, XCircle, Clock, User, ChevronDown } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const statusColors: Record<string, string> = { submitted: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400', ai_analyzed: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400', under_review: 'bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400', assigned: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400', resolved: 'bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400', dismissed: 'bg-danger-100 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400' };
const priorityColors: Record<string, string> = { low: 'badge-neutral', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-danger' };

export default function IncidentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', location: '', mediaUrl: '', mediaType: 'image' as 'image' | 'video' });
  const [submitting, setSubmitting] = useState(false);

  const fetchIncidents = async () => {
    try {
      const params: any = {};
      if (filter) params.status = filter;
      const res = await api.get('/incidents', params);
      setIncidents(res.data?.data?.incidents || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchIncidents(); }, [filter]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    if (isVideo) {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) { toast.error('Invalid video format. Allowed: MP4, MOV'); return; }
      if (file.size > MAX_VIDEO_SIZE) { toast.error('Video exceeds maximum size limit (50 MB)'); return; }
    } else {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { toast.error('Invalid image format. Allowed: JPG, JPEG, PNG, WEBP'); return; }
      if (file.size > MAX_IMAGE_SIZE) { toast.error('Image exceeds maximum size limit (10 MB)'); return; }
    }
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, mediaUrl: reader.result as string, mediaType: isVideo ? 'video' : 'image' });
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Please fill all required fields — title is required'); return; }
    if (!form.description.trim()) { toast.error('Please fill all required fields — description is required'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/incidents', form);
      const aiCat = res.data?.aiCategory || 'Pending Review';
      const aiPrio = res.data?.aiPriority || 'Medium';
      toast.success(`Incident reported successfully. AI Category: ${aiCat}, Priority: ${aiPrio}`);
      setShowForm(false);
      setForm({ title: '', description: '', location: '', mediaUrl: '', mediaType: 'image' });
      fetchIncidents();
    } catch (err: any) {
      toast.error(err.message || 'Server error occurred');
    } finally { setSubmitting(false); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.put(`/incidents/${id}/status`, { status });
      toast.success('Status updated');
      fetchIncidents();
    } catch (err: any) { toast.error(err.message || 'Server error occurred'); }
  };

  const filtered = incidents.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Incident Reports</h2>
            <p className="text-surface-400 text-sm">Report and track security & safety incidents</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Report Incident</button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input className="input-field pl-9 py-2 text-sm" placeholder="Search incidents..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {['', 'submitted', 'ai_analyzed', 'under_review', 'assigned', 'resolved', 'dismissed'].map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors', filter === s ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700')}>
                {s ? s.replace('_', ' ') : 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-surface-300 mb-3" />
            <p className="text-surface-400">No incidents reported</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((inc) => (
              <div key={inc._id} className="glass-card p-5">
                <div className="flex items-start gap-3">
                  {inc.mediaUrl && (
                    <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-800">
                      {inc.mediaType === 'video' ? (
                        <video src={inc.mediaUrl} className="w-full h-full object-cover" />
                      ) : (
                        <img src={inc.mediaUrl} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{inc.title}</h3>
                      <span className={cn('badge text-[10px]', statusColors[inc.status] || statusColors.submitted)}>{inc.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-surface-400 mb-2 line-clamp-2">{inc.description}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-surface-400 mb-2">
                      {inc.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {inc.location}</span>}
                      {inc.reporter && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {inc.reporter.name}</span>}
                      <span><Clock className="w-3 h-3 inline mr-1" />{timeAgo(inc.createdAt)}</span>
                    </div>
                    {inc.aiCategory && (
                      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-primary-50 dark:bg-primary-500/10">
                        <AlertTriangle className="w-3 h-3 text-primary-500" />
                        <span className="text-[11px] font-medium text-primary-600 dark:text-primary-400">AI: {inc.aiCategory}</span>
                        {inc.aiPriority && <span className={cn('badge text-[10px]', priorityColors[inc.aiPriority] || priorityColors.medium)}>{inc.aiPriority}</span>}
                        {inc.aiSummary && <span className="text-[11px] text-surface-400 w-full">{inc.aiSummary}</span>}
                      </div>
                    )}
                  </div>
                </div>
                {isAdmin && inc.status !== 'resolved' && inc.status !== 'dismissed' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
                    <select
                      value={inc.status}
                      onChange={(e) => handleStatusUpdate(inc._id, e.target.value)}
                      className="text-xs input-field py-1 px-2"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under Review</option>
                      <option value="assigned">Assigned</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Report Incident</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="input-field" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location (optional)</label>
                <input className="input-field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Tower A, Entrance Gate, Parking Level 2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Photo / Video (optional)</label>
                <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-surface-300 dark:border-surface-600 cursor-pointer hover:border-primary-400 transition-colors">
                  <Image className="w-5 h-5 text-surface-400" />
                  <span className="text-sm text-surface-400">{form.mediaUrl ? 'File selected' : 'Upload image (JPG, PNG, WEBP) or video (MP4, MOV)'}</span>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp,.mp4,.mov" onChange={handleImageUpload} className="hidden" />
                </label>
                <p className="text-[10px] text-surface-400 mt-1">Max: Images 10MB | Videos 50MB</p>
                {form.mediaUrl && (
                  <div className="mt-2 relative">
                    {form.mediaType === 'video' ? (
                      <video src={form.mediaUrl} className="w-full max-h-32 rounded-lg object-cover" controls />
                    ) : (
                      <img src={form.mediaUrl} alt="" className="w-full max-h-32 rounded-lg object-cover" />
                    )}
                    <button onClick={() => setForm({ ...form, mediaUrl: '' })} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full"><XCircle className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">{submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Report Incident'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
