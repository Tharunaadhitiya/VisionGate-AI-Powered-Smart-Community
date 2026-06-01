'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Plus, Clock, CheckCircle, AlertCircle, Brain, Building2, Edit3 } from 'lucide-react';
import { cn, timeAgo, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

const categories = ['plumbing', 'electrical', 'cleaning', 'noise', 'security', 'parking', 'pest_control', 'structural', 'other'];

export default function ComplaintsPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'plumbing', priority: 'medium', location: '' });
  const [filter, setFilter] = useState('');
  const [editingAi, setEditingAi] = useState<any>(null);
  const [aiForm, setAiForm] = useState({ aiCategory: '', aiPriority: '', aiSuggestedDepartment: '', aiSummary: '' });

  const fetchComplaints = async () => {
    try {
      const params: any = { limit: '50' };
      if (filter) params.status = filter;
      const res = await api.get('/complaints', params);
      setComplaints(res.data.complaints || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchComplaints(); }, [filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/complaints', form);
      toast.success('Complaint submitted');
      setShowForm(false);
      setForm({ title: '', description: '', category: 'plumbing', priority: 'medium', location: '' });
      fetchComplaints();
    } catch { toast.error('Failed to submit complaint'); }
  };

  const filters = ['', 'submitted', 'in_progress', 'resolved', 'closed'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Complaints</h2>
            <p className="text-surface-400 text-sm">Submit and track maintenance issues</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Complaint</button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn('px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors', filter === f ? 'bg-primary-600 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200')}>
              {f || 'All'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : complaints.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-surface-300 mb-3" />
            <p className="text-surface-400">No complaints found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {complaints.map((c) => (
              <div key={c._id} className="glass-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{c.title}</h3>
                      <span className={cn('badge text-xs', getStatusColor(c.status))}>{c.status}</span>
                      <span className={cn('badge text-xs', c.priority === 'high' || c.priority === 'critical' ? 'badge-danger' : c.priority === 'medium' ? 'badge-warning' : 'badge-neutral')}>{c.priority}</span>
                    </div>
                    <p className="text-sm text-surface-400 mb-2">{c.description}</p>
                    <div className="flex items-center gap-4 text-xs text-surface-400">
                      <span className="capitalize">{c.category}</span>
                      <span>{timeAgo(c.createdAt)}</span>
                      {c.location && <span>{c.location}</span>}
                    </div>
                    {c.aiCategory && (
                      <div className="mt-3 p-3 rounded-xl bg-primary-50/50 dark:bg-primary-500/5 border border-primary-100 dark:border-primary-500/20">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Brain className="w-3.5 h-3.5 text-primary-500" />
                          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">AI Analysis</span>
                          {user?.role === 'admin' && (
                            <button onClick={() => { setEditingAi(c); setAiForm({ aiCategory: c.aiCategory || '', aiPriority: c.aiPriority || '', aiSuggestedDepartment: c.aiSuggestedDepartment || '', aiSummary: c.aiSummary || '' }); }} className="ml-auto p-1 rounded hover:bg-primary-100 dark:hover:bg-primary-500/20"><Edit3 className="w-3 h-3" /></button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          <span className="text-surface-400">AI Category: <span className="font-medium text-surface-700 dark:text-surface-200 capitalize">{c.aiCategory}</span></span>
                          {c.aiPriority && <span className="text-surface-400">AI Priority: <span className={cn('font-medium', c.aiPriority === 'high' || c.aiPriority === 'critical' ? 'text-danger-500' : c.aiPriority === 'medium' ? 'text-warning-500' : 'text-surface-500')}>{c.aiPriority}</span></span>}
                          {c.aiSuggestedDepartment && (
                            <span className="text-surface-400">Dept: <span className="font-medium text-surface-700 dark:text-surface-200">{c.aiSuggestedDepartment}</span></span>
                          )}
                        </div>
                        {c.aiSummary && <p className="text-xs text-surface-500 mt-1 italic">{c.aiSummary}</p>}
                      </div>
                    )}
                  </div>
                  {c.status === 'resolved' && c.feedback === undefined && (
                    <button onClick={async () => {
                      const fb = window.prompt('Rate (1-5):');
                      if (fb) { await api.post(`/complaints/${c._id}/feedback`, { feedback: parseInt(fb) }); toast.success('Thanks for feedback!'); fetchComplaints(); }
                    }} className="btn-ghost text-xs ml-2">Rate</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Submit Complaint</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {categories.map((c) => (<option key={c} value={c}>{c.replace('_', ' ')}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {['low', 'medium', 'high', 'critical'].map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input className="input-field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="input-field" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingAi && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditingAi(null)}>
          <div className="glass-card p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Override AI Analysis</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">AI Category</label>
                <select className="input-field" value={aiForm.aiCategory} onChange={(e) => setAiForm({ ...aiForm, aiCategory: e.target.value })}>
                  {['maintenance', 'security', 'electrical', 'plumbing', 'housekeeping', 'parking', 'community_services', 'emergency', 'other'].map((c) => (<option key={c} value={c}>{c.replace('_', ' ')}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">AI Priority</label>
                <select className="input-field" value={aiForm.aiPriority} onChange={(e) => setAiForm({ ...aiForm, aiPriority: e.target.value })}>
                  {['low', 'medium', 'high', 'critical'].map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Suggested Department</label>
                <input className="input-field" value={aiForm.aiSuggestedDepartment} onChange={(e) => setAiForm({ ...aiForm, aiSuggestedDepartment: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">AI Summary</label>
                <textarea className="input-field" rows={3} value={aiForm.aiSummary} onChange={(e) => setAiForm({ ...aiForm, aiSummary: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditingAi(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={async () => {
                  try {
                    await api.put(`/complaints/${editingAi._id}/ai-override`, aiForm);
                    toast.success('AI analysis updated');
                    setEditingAi(null);
                    fetchComplaints();
                  } catch { toast.error('Failed to update'); }
                }} className="btn-primary flex-1">Save Override</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
