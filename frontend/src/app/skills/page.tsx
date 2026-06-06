'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Search, User, MapPin, Briefcase, Clock, Globe, Lock, EyeOff, Filter, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const PROFESSIONS = [
  'All', 'Doctor', 'Software Engineer', 'AI Engineer', 'Data Scientist', 'Teacher',
  'Professor', 'Lawyer', 'Electrician', 'Plumber', 'Carpenter', 'Fitness Trainer',
  'Photographer', 'Music Teacher', 'Business Consultant',
];

const visibilityConfig: Record<string, { icon: any; label: string; color: string }> = {
  public: { icon: Globe, label: 'Public', color: 'text-secondary-500' },
  community_only: { icon: Lock, label: 'Community', color: 'text-primary-500' },
  private: { icon: EyeOff, label: 'Private', color: 'text-surface-400' },
};

export default function SkillsPage() {
  const { user } = useAuth();
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [professionFilter, setProfessionFilter] = useState('All');

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/skills', { limit: '100' });
      setProfessionals(res.data?.professionals || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchProfessionals(); }, []);

  const filtered = professionals.filter((p) => {
    if (professionFilter !== 'All' && p.profession !== professionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matches = (p.profession || '').toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.skills || []).some((s: string) => s.toLowerCase().includes(q)) ||
        (p.experience_years || '').toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const skillTags = (skills: any) => {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    try { return JSON.parse(skills); } catch { return []; }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Community Skills & Expertise</h2>
            <p className="text-surface-400 text-sm">Discover professionals and skilled residents in your community</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input className="input-field pl-9" placeholder="Search by name, profession, or skill..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <Filter className="w-4 h-4 text-surface-400 shrink-0" />
            {PROFESSIONS.map((prof) => (
              <button key={prof} onClick={() => setProfessionFilter(prof)}
                className={cn('whitespace-nowrap text-xs px-3 py-1.5 rounded-full transition-colors',
                  professionFilter === prof
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700'
                )}>
                {prof}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Search className="w-12 h-12 text-surface-300 mx-auto mb-3" />
            <p className="text-surface-400">No professionals found matching your criteria.</p>
            <p className="text-xs text-surface-400 mt-1">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const VisIcon = visibilityConfig[p.skill_visibility]?.icon || Lock;
              const skills = skillTags(p.skills);
              return (
                <div key={p._id} className="glass-card p-4 hover:shadow-xl transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {p.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{p.name}</h4>
                      <div className="flex items-center gap-1 text-xs text-surface-400 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {p.tower || 'N/A'}-{p.flatNumber || 'N/A'}
                      </div>
                    </div>
                    <div className={cn('flex items-center gap-0.5 text-[10px]', visibilityConfig[p.skill_visibility]?.color || 'text-surface-400')}>
                      <VisIcon className="w-3 h-3" />
                      {visibilityConfig[p.skill_visibility]?.label || p.skill_visibility}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Briefcase className="w-3.5 h-3.5 text-primary-500" />
                      <span className="font-medium">{p.profession || 'Not specified'}</span>
                    </div>
                    {p.experience_years && (
                      <div className="flex items-center gap-1.5 text-xs text-surface-400">
                        <Clock className="w-3 h-3" />
                        {p.experience_years}
                      </div>
                    )}
                    {p.availability && (
                      <div className="flex items-center gap-1.5 text-xs text-surface-400">
                        <Clock className="w-3 h-3" />
                        Available: {p.availability}
                      </div>
                    )}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {skills.map((s: string) => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
