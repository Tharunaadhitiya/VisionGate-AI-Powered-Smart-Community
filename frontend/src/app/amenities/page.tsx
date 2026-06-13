'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Calendar, CheckCircle, XCircle, Clock, Users as UsersIcon } from 'lucide-react';
import { cn, formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animation';

const amenityTypes = [
  { value: 'clubhouse', label: 'Clubhouse', icon: '🏛️' },
  { value: 'swimming_pool', label: 'Swimming Pool', icon: '🏊' },
  { value: 'gym', label: 'Gym', icon: '💪' },
  { value: 'tennis_court', label: 'Tennis Court', icon: '🎾' },
  { value: 'badminton_court', label: 'Badminton Court', icon: '🏸' },
  { value: 'party_hall', label: 'Party Hall', icon: '🎉' },
  { value: 'garden', label: 'Community Garden', icon: '🌳' },
];

export default function AmenitiesPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amenityType: 'clubhouse', date: '', startTime: '', endTime: '', guests: 0 });

  useEffect(() => {
    api.get('/amenities?limit=50').then((res) => setBookings(res.data.bookings || [])).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/amenities', form);
      toast.success('Booking submitted');
      setShowForm(false);
      window.location.reload();
    } catch (err: any) { toast.error(err.message || 'Booking failed'); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Amenity Booking</h2>
            <p className="text-surface-400 text-sm">Book community amenities</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary"><Calendar className="w-4 h-4" /> Book Now</button>
        </motion.div>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {amenityTypes.map((a) => (
            <motion.div key={a.value} variants={staggerItem} whileHover={{ y: -4, scale: 1.02 }} className="glass-card p-4 text-center hover:-translate-y-0.5 transition-all cursor-pointer" onClick={() => { setForm({ ...form, amenityType: a.value }); setShowForm(true); }}>
              <span className="text-2xl mb-2 block">{a.icon}</span>
              <p className="text-sm font-medium">{a.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : bookings.length === 0 ? (
          <div className="glass-card p-12 text-center"><Calendar className="w-12 h-12 mx-auto text-surface-300 mb-3" /><p className="text-surface-400">No bookings</p></div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-100 dark:border-surface-800">
                    {['Amenity', 'Date', 'Time', 'Guests', 'Status'].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {bookings.map((b) => (
                    <tr key={b._id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30">
                      <td className="px-4 py-3 text-sm capitalize font-medium">{b.amenityType.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(b.date)}</td>
                      <td className="px-4 py-3 text-sm">{b.startTime} - {b.endTime}</td>
                      <td className="px-4 py-3 text-sm">{b.guests}</td>
                      <td className="px-4 py-3"><span className={cn('badge text-xs', getStatusColor(b.status))}>{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Book Amenity</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amenity</label>
                <select className="input-field" value={form.amenityType} onChange={(e) => setForm({ ...form, amenityType: e.target.value })}>
                  {amenityTypes.map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input type="time" className="input-field" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input type="time" className="input-field" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Guests</label>
                <input type="number" className="input-field" value={form.guests} onChange={(e) => setForm({ ...form, guests: parseInt(e.target.value) || 0 })} min={0} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Book</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
