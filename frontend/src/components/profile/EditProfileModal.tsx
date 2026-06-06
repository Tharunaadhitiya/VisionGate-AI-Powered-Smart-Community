'use client';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Camera, X, Save, Plus, Globe, Lock, EyeOff, XCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PROFESSIONS = [
  'Doctor', 'Software Engineer', 'AI Engineer', 'Data Scientist', 'Teacher',
  'Professor', 'Lawyer', 'Electrician', 'Plumber', 'Carpenter', 'Fitness Trainer',
  'Photographer', 'Music Teacher', 'Business Consultant', 'Other',
];

const SKILL_OPTIONS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Java', 'Python',
  'JavaScript', 'AI & ML', 'Web Development', 'Mobile Development', 'Data Science',
  'Cloud Computing', 'Cybersecurity', 'Plumbing', 'Electrical Repair', 'Carpentry',
  'Medical Consultation', 'Legal Consultation', 'Fitness Training', 'Yoga',
  'Music', 'Guitar', 'Piano', 'Photography', 'Graphic Design', 'Business Strategy',
  'Marketing', 'Accounting', 'Other',
];

const AVAILABILITY_OPTIONS = ['Weekdays', 'Weekends', 'Evenings Only', 'Mornings Only', 'Anytime', 'By Appointment'];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', icon: Globe, desc: 'Visible to everyone — AI Assistant, residents, security, admin' },
  { value: 'community_only', label: 'Community Only', icon: Lock, desc: 'Visible only to community members through AI Assistant' },
  { value: 'private', label: 'Private', icon: EyeOff, desc: 'Stored in profile only — not searchable' },
];

export default function EditProfileModal({ open, onClose }: Props) {
  const { user, updateUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    flatNumber: '',
    tower: '',
    email: '',
    profession: '',
    skillsArr: [] as string[],
    experience_years: '',
    availability: '',
    skill_visibility: 'private',
  });

  const [skillInput, setSkillInput] = useState('');
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);

  useEffect(() => {
    if (user && open) {
      let skills: string[] = [];
      if (user.skills) {
        try { skills = typeof user.skills === 'string' ? JSON.parse(user.skills) : user.skills; } catch { skills = []; }
      }
      setForm({
        name: user.name,
        phone: user.phone,
        flatNumber: user.flatNumber || '',
        tower: user.tower || '',
        email: user.email,
        profession: user.profession || '',
        skillsArr: skills,
        experience_years: user.experience_years || '',
        availability: user.availability || '',
        skill_visibility: user.skill_visibility || 'private',
      });
    }
  }, [user, open]);

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed || form.skillsArr.includes(trimmed)) return;
    setForm((f) => ({ ...f, skillsArr: [...f.skillsArr, trimmed] }));
    setSkillInput('');
    setShowSkillSuggestions(false);
  };

  const removeSkill = (skill: string) => {
    setForm((f) => ({ ...f, skillsArr: f.skillsArr.filter((s) => s !== skill) }));
  };

  const filteredSuggestions = SKILL_OPTIONS.filter(
    (s) => s.toLowerCase().includes(skillInput.toLowerCase()) && !form.skillsArr.includes(s)
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/users/${user?._id}`, {
        name: form.name,
        phone: form.phone,
        flatNumber: form.flatNumber,
        tower: form.tower,
        profession: form.profession || null,
        skills: form.skillsArr,
        experience_years: form.experience_years || null,
        availability: form.availability || null,
        skill_visibility: form.skill_visibility,
      });
      updateUser(res.data.user);
      toast.success('Profile updated successfully');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const res = await api.put(`/users/${user?._id}`, { profileImage: base64 });
        updateUser(res.data.user);
        toast.success('Profile picture updated');
      } catch (err: any) {
        toast.error(err?.message || 'Failed to update profile picture');
      }
    };
    reader.readAsDataURL(file);
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-12 md:pt-24 px-4 pb-8 overflow-y-auto"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-2xl glass-card-strong border border-surface-200/50 dark:border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200/50 dark:border-surface-700/50">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Edit Profile</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <X className="w-4 h-4 text-surface-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="flex justify-center">
            <div className="relative group">
              <div className={cn(
                'w-24 h-24 rounded-full border-4 border-white dark:border-surface-800 bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg flex items-center justify-center overflow-hidden',
                'ring-2 ring-primary-500/20'
              )}>
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">{user?.name?.charAt(0)?.toUpperCase()}</span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary-500 text-white shadow-lg flex items-center justify-center hover:bg-primary-600 transition-all hover:scale-105 active:scale-95"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
          </div>

          <div>
            <label className="input-label">Full Name</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          <div>
            <label className="input-label">Email Address</label>
            <input className="input-field" value={form.email} disabled />
          </div>

          <div>
            <label className="input-label">Phone Number</label>
            <input className="input-field" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Tower / Block</label>
              <input className="input-field" value={form.tower} onChange={(e) => setForm((f) => ({ ...f, tower: e.target.value }))} />
            </div>
            <div>
              <label className="input-label">Flat / Unit</label>
              <input className="input-field" value={form.flatNumber} onChange={(e) => setForm((f) => ({ ...f, flatNumber: e.target.value }))} />
            </div>
          </div>

          {user?.role === 'resident' && (
            <>
              <div className="border-t border-surface-200/50 dark:border-surface-700/50 pt-5">
                <h4 className="font-semibold text-sm text-surface-900 dark:text-surface-100 mb-3">Professional Information</h4>
                <p className="text-xs text-surface-400 mb-4">Share your profession and skills so neighbors can find and connect with you through the AI Assistant.</p>

                <div className="space-y-4">
                  <div>
                    <label className="input-label">Profession</label>
                    <select className="input-field" value={form.profession}
                      onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))}>
                      <option value="">Select profession...</option>
                      {PROFESSIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="input-label">Skills</label>
                    <div className="relative">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <AnimatePresence>
                          {form.skillsArr.map((skill) => (
                            <motion.span key={skill}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 text-xs font-medium"
                            >
                              {skill}
                              <button onClick={() => removeSkill(skill)} className="hover:text-danger-500 transition-colors">
                                <XCircle className="w-3 h-3" />
                              </button>
                            </motion.span>
                          ))}
                        </AnimatePresence>
                      </div>
                      <div className="relative">
                        <input className="input-field pr-8" placeholder="Type a skill and press Enter..."
                          value={skillInput}
                          onChange={(e) => { setSkillInput(e.target.value); setShowSkillSuggestions(true); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }}
                          onFocus={() => setShowSkillSuggestions(true)}
                        />
                        <button onClick={() => addSkill(skillInput)} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-100 dark:hover:bg-surface-800">
                          <Plus className="w-3.5 h-3.5 text-surface-400" />
                        </button>
                      </div>
                      {showSkillSuggestions && skillInput && filteredSuggestions.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                          {filteredSuggestions.map((s) => (
                            <button key={s} onClick={() => addSkill(s)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="input-label">Years of Experience</label>
                      <input className="input-field" placeholder="e.g. 5 Years" value={form.experience_years}
                        onChange={(e) => setForm((f) => ({ ...f, experience_years: e.target.value }))} />
                    </div>
                    <div>
                      <label className="input-label">Availability</label>
                      <select className="input-field" value={form.availability}
                        onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))}>
                        <option value="">Select...</option>
                        {AVAILABILITY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="input-label">Skill Visibility</label>
                    <div className="space-y-2">
                      {VISIBILITY_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const active = form.skill_visibility === opt.value;
                        return (
                          <button key={opt.value} onClick={() => setForm((f) => ({ ...f, skill_visibility: opt.value }))}
                            className={cn(
                              'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                              active
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                                : 'border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-800/50'
                            )}>
                            <Icon className={cn('w-4 h-4 mt-0.5', active ? 'text-primary-500' : 'text-surface-400')} />
                            <div>
                              <p className={cn('text-sm font-medium', active ? 'text-primary-700 dark:text-primary-300' : '')}>{opt.label}</p>
                              <p className="text-xs text-surface-400 mt-0.5">{opt.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200/50 dark:border-surface-700/50 bg-surface-50/50 dark:bg-surface-900/50">
          <button onClick={onClose} className="btn-ghost text-sm px-4 py-2">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
