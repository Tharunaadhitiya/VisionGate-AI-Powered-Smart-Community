'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { Bell, Plus, Search, X, Calendar, Clock, AlertTriangle, Building2, Shield, Users, Megaphone, Trash2, CheckSquare, BarChart3, Vote, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const categories = ['general', 'maintenance', 'security', 'events', 'emergency'];
const priorities = ['low', 'medium', 'high', 'emergency'];
const categoryIcons: Record<string, any> = { general: Bell, maintenance: Building2, security: Shield, events: Calendar, emergency: AlertTriangle };
const categoryColors: Record<string, string> = {
  general: 'bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400',
  maintenance: 'bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400',
  security: 'bg-danger-100 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400',
  events: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-500/20 dark:text-secondary-400',
  emergency: 'bg-danger-100 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400',
};

export default function NoticesPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notices, setNotices] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [showPollForm, setShowPollForm] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ title: '', description: '', category: 'general', priority: 'medium', expiryDate: '' });
  const [pollForm, setPollForm] = useState({ title: '', description: '', category: 'general', startDate: '', endDate: '', options: ['', ''], allowMultipleVotes: false });
  const [votingPolls, setVotingPolls] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});
  const isAdmin = user?.role === 'admin';

  const updatePollInState = useCallback((updated: any) => {
    setPolls((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      if (data && data._id) updatePollInState(data);
    };
    socket.on('poll:updated', handler);
    return () => { socket.off('poll:updated', handler); };
  }, [socket, updatePollInState]);

  const fetchNotices = async () => {
    try {
      const params: any = {};
      if (filter) params.category = filter;
      const res = await api.get('/notices', params);
      setNotices(res.data?.notices || []);
    } catch {}
  };

  const fetchPolls = async () => {
    try {
      const res = await api.get('/polls');
      setPolls(res.data?.polls || []);
    } catch (err: any) { console.error('Fetch polls error:', err); }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchNotices(), fetchPolls()]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filter]);

  const handleCreateNotice = async () => {
    try {
      await api.post('/notices', noticeForm);
      toast.success('Notice published');
      setShowNoticeForm(false);
      setNoticeForm({ title: '', description: '', category: 'general', priority: 'medium', expiryDate: '' });
      fetchNotices();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('Remove this notice?')) return;
    try {
      await api.delete('/notices/' + id);
      toast.success('Notice removed');
      fetchNotices();
    } catch { toast.error('Failed to remove'); }
  };

  const addOption = () => setPollForm({ ...pollForm, options: [...pollForm.options, ''] });
  const removeOption = (i: number) => { if (pollForm.options.length > 2) setPollForm({ ...pollForm, options: pollForm.options.filter((_, idx) => idx !== i) }); };
  const updateOption = (i: number, v: string) => { const o = [...pollForm.options]; o[i] = v; setPollForm({ ...pollForm, options: o }); };

  const handleCreatePoll = async () => {
    if (!pollForm.title.trim() || pollForm.options.length < 2 || pollForm.options.some((o) => !o.trim())) { toast.error('Title and at least 2 options required'); return; }
    try {
      await api.post('/polls', pollForm);
      toast.success('Poll created');
      setShowPollForm(false);
      setPollForm({ title: '', description: '', category: 'general', startDate: '', endDate: '', options: ['', ''], allowMultipleVotes: false });
      fetchPolls();
    } catch (err: any) { toast.error(err?.message || 'Failed to create poll'); }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    setVotingPolls((prev) => ({ ...prev, [pollId]: true }));
    try {
      const res = await api.post(`/polls/${pollId}/vote`, { optionIndex });
      if (res.data?.poll) updatePollInState(res.data.poll);
      else fetchPolls();
    } catch (err: any) {
      toast.error(err?.message || 'Vote failed');
      fetchPolls();
    } finally {
      setVotingPolls((prev) => ({ ...prev, [pollId]: false }));
    }
  };

  const handleDeletePoll = async (id: string) => {
    if (!confirm('Remove this poll?')) return;
    try {
      await api.delete('/polls/' + id);
      toast.success('Poll removed');
      fetchPolls();
    } catch { toast.error('Failed to remove'); }
  };

  const filteredNotices = notices.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.description.toLowerCase().includes(search.toLowerCase())
  );
  const emergencyNotices = filteredNotices.filter((n) => n.priority === 'emergency');
  const normalNotices = filteredNotices.filter((n) => n.priority !== 'emergency');

  const filteredPolls = polls.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Notice Board</h2>
            <p className="text-surface-400 text-sm">Community announcements, updates & polls</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={() => setShowPollForm(true)} className="btn-secondary"><Vote className="w-4 h-4" /> New Poll</button>
              <button onClick={() => setShowNoticeForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Notice</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input className="input-field pl-9 py-2 text-sm" placeholder="Search notices & polls..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {['', ...categories].map((c) => (
              <button key={c} onClick={() => setFilter(c)} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors', filter === c ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700')}>
                {c || 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : (
          <div className="space-y-6">
            {emergencyNotices.length > 0 && (
              <div className="space-y-4">
                {emergencyNotices.map((n) => (
                  <div key={n._id} className="glass-card p-5 border-l-4 border-danger-500 bg-danger-50/10 dark:bg-danger-500/5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-danger-500" />
                          <h3 className="font-bold text-danger-700 dark:text-danger-300">{n.title}</h3>
                          <span className="badge text-[10px] badge-danger">EMERGENCY</span>
                          <span className={cn('badge text-[10px]', categoryColors[n.category] || categoryColors.general)}>{n.category}</span>
                        </div>
                        <p className="text-sm text-surface-600 dark:text-surface-300 mb-2">{n.description}</p>
                        <div className="flex items-center gap-3 text-xs text-surface-400">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(n.publishDate || n.createdAt).toLocaleDateString()}</span>
                          {n.expiryDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expires {new Date(n.expiryDate).toLocaleDateString()}</span>}
                          {n.publisher && <span>Posted by {n.publisher.name}</span>}
                        </div>
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleDeleteNotice(n._id)} className="p-1.5 rounded-lg hover:bg-danger-50 hover:text-danger-600 ml-2"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredPolls.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Vote className="w-5 h-5 text-primary-500" /> Polls & Voting</h3>
                <div className="space-y-4">
                  {filteredPolls.map((poll) => {
                    const options = poll.options || [];
                    const totalVotes = poll.totalVotes || 0;
                    const dist = poll.voteDistribution || {};
                    const showResult = showResults[poll._id];
                    const myVotes: number[] = poll.myVotes || [];
                    const isClosed = new Date(poll.endDate) < new Date();
                    const isVoting = votingPolls[poll._id];
                    return (
                      <div key={poll._id} className="glass-card p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckSquare className="w-4 h-4 text-primary-500" />
                              <h3 className="font-semibold">{poll.title}</h3>
                              <span className={cn('badge text-[10px]', categoryColors[poll.category] || categoryColors.general)}>{poll.category}</span>
                              {poll.allowMultipleVotes && <span className="badge text-[10px] badge-neutral">Multiple answers</span>}
                            </div>
                            {poll.description && <p className="text-sm text-surface-400 mb-1">{poll.description}</p>}
                            <div className="flex items-center gap-3 text-xs text-surface-400">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(poll.startDate).toLocaleDateString()} - {new Date(poll.endDate).toLocaleDateString()}</span>
                              <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          {isAdmin && (
                            <button onClick={() => handleDeletePoll(poll._id)} className="p-1.5 rounded-lg hover:bg-danger-50 hover:text-danger-600 ml-2"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>

                        <div className="space-y-2 mt-3">
                          {options.map((opt: string, idx: number) => {
                            const count = dist[idx] || 0;
                            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                            const isSelected = myVotes.includes(idx);
                            return (
                              <div key={idx}>
                                {showResult ? (
                                  <div className="p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium">{opt} {isSelected && <span className="text-primary-500 text-xs ml-1">(Your vote)</span>}</span>
                                      <span className="text-xs text-surface-400">{count} ({pct}%)</span>
                                    </div>
                                    <div className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                                      <div className={cn('h-full rounded-full transition-all duration-500', isSelected ? 'bg-primary-500' : 'bg-surface-400')} style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleVote(poll._id, idx)}
                                    disabled={isClosed || isVoting}
                                    className={cn(
                                      'flex items-start gap-3 w-full p-3.5 rounded-xl border-2 transition-all duration-200 text-left group',
                                      isSelected
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/15 shadow-sm'
                                        : 'border-surface-200 dark:border-surface-700 hover:border-primary-300 hover:bg-surface-50 dark:hover:bg-surface-800/50'
                                    )}
                                  >
                                    <div className={cn(
                                      'w-5 h-5 border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200',
                                      poll.allowMultipleVotes ? 'rounded-md' : 'rounded-full',
                                      isSelected ? 'border-primary-500 bg-primary-500 scale-105' : 'border-surface-300 group-hover:border-primary-400'
                                    )}>
                                      {isSelected && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className={cn('text-sm', isSelected ? 'font-semibold text-primary-700 dark:text-primary-300' : '')}>{opt}</span>
                                      {isSelected && <div className="text-[11px] text-primary-500 font-medium mt-0.5">Your vote</div>}
                                    </div>
                                    {isVoting && <Loader2 className="w-4 h-4 animate-spin text-primary-500 mt-0.5 shrink-0" />}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
                          <button
                            onClick={() => setShowResults({ ...showResults, [poll._id]: !showResult })}
                            className="text-xs font-medium text-primary-500 hover:text-primary-600 flex items-center gap-1"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            {showResult ? 'Vote' : 'View Results'}
                          </button>
                          <span className="text-[10px] text-surface-400">
                            {isClosed ? 'Closed' : `Ends ${new Date(poll.endDate).toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredNotices.length === 0 && filteredPolls.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Megaphone className="w-12 h-12 mx-auto text-surface-300 mb-3" />
                <p className="text-surface-400">No notices or polls found</p>
              </div>
            ) : normalNotices.length > 0 && (
              <div className="space-y-4">
                {normalNotices.map((n) => {
                  const Icon = categoryIcons[n.category] || Bell;
                  return (
                    <div key={n._id} className="glass-card p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', categoryColors[n.category] || categoryColors.general)}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <h3 className="font-semibold">{n.title}</h3>
                            <span className={cn('badge text-[10px]', n.priority === 'high' ? 'badge-danger' : n.priority === 'medium' ? 'badge-warning' : 'badge-neutral')}>{n.priority}</span>
                            <span className={cn('badge text-[10px] hidden sm:inline-flex', categoryColors[n.category] || categoryColors.general)}>{n.category}</span>
                          </div>
                          <p className="text-sm text-surface-400 mb-2">{n.description}</p>
                          <div className="flex items-center gap-3 text-xs text-surface-400">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(n.publishDate || n.createdAt).toLocaleDateString()}</span>
                            {n.expiryDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expires {new Date(n.expiryDate).toLocaleDateString()}</span>}
                            {n.publisher && <span>Posted by {n.publisher.name}</span>}
                          </div>
                        </div>
                        {isAdmin && (
                          <button onClick={() => handleDeleteNotice(n._id)} className="p-1.5 rounded-lg hover:bg-danger-50 hover:text-danger-600 ml-2"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showNoticeForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowNoticeForm(false)}>
          <div className="glass-card p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Publish Notice</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input className="input-field" value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select className="input-field" value={noticeForm.category} onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}>
                  {categories.map((c) => (<option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select className="input-field" value={noticeForm.priority} onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })}>
                  {priorities.map((p) => (<option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="input-field" rows={4} value={noticeForm.description} onChange={(e) => setNoticeForm({ ...noticeForm, description: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expiry Date (optional)</label>
                <input className="input-field" type="date" value={noticeForm.expiryDate} onChange={(e) => setNoticeForm({ ...noticeForm, expiryDate: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNoticeForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleCreateNotice} className="btn-primary flex-1">Publish Notice</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPollForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowPollForm(false)}>
          <div className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Create Poll</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Question</label>
                <input className="input-field" value={pollForm.title} onChange={(e) => setPollForm({ ...pollForm, title: e.target.value })} placeholder="What do you want to ask?" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea className="input-field" rows={2} value={pollForm.description} onChange={(e) => setPollForm({ ...pollForm, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select className="input-field" value={pollForm.category} onChange={(e) => setPollForm({ ...pollForm, category: e.target.value })}>
                  {categories.filter((c) => c !== 'emergency').map((c) => (<option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input className="input-field" type="date" value={pollForm.startDate} onChange={(e) => setPollForm({ ...pollForm, startDate: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input className="input-field" type="date" value={pollForm.endDate} onChange={(e) => setPollForm({ ...pollForm, endDate: e.target.value })} required />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Options</label>
                  <button type="button" onClick={addOption} className="text-xs text-primary-500 hover:text-primary-600">+ Add option</button>
                </div>
                <div className="space-y-2">
                  {pollForm.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input className="input-field flex-1 text-sm" value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                      {pollForm.options.length > 2 && (
                        <button onClick={() => removeOption(i)} className="p-1 text-surface-400 hover:text-danger-500"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={pollForm.allowMultipleVotes} onChange={(e) => setPollForm({ ...pollForm, allowMultipleVotes: e.target.checked })} className="rounded" />
                Allow Multiple Answers
              </label>
              <div className="flex gap-3">
                <button onClick={() => setShowPollForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleCreatePoll} className="btn-primary flex-1">Create Poll</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
