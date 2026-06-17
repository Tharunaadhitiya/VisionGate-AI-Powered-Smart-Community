'use client';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animation';
import { CheckCircle, Package, FileText, Search, Bell, Users, AlertTriangle, Megaphone, BarChart3, Camera, Clock, Shield, CreditCard, Home } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';

const ICON_MAP: Record<string, any> = {
  visitor_approved: CheckCircle,
  visitor_entered: Users,
  visitor_exited: LogOut,
  package_received: Package,
  package_collected: Package,
  complaint_submitted: FileText,
  complaint_resolved: CheckCircle,
  alert_raised: Bell,
  alert_resolved: Shield,
  poll_created: BarChart3,
  notice_posted: Megaphone,
  lost_item_reported: Search,
  found_item_reported: Search,
  payment_received: CreditCard,
  sos_triggered: AlertTriangle,
  incident_reported: AlertTriangle,
  camera_detection: Camera,
};

const LABEL_MAP: Record<string, string> = {
  visitor_approved: 'Visitor Approved',
  visitor_entered: 'Visitor Entered',
  visitor_exited: 'Visitor Exited',
  package_received: 'Package Received',
  package_collected: 'Package Collected',
  complaint_submitted: 'Complaint Submitted',
  complaint_resolved: 'Complaint Resolved',
  alert_raised: 'Alert Raised',
  alert_resolved: 'Alert Resolved',
  poll_created: 'Poll Created',
  notice_posted: 'Notice Posted',
  lost_item_reported: 'Lost Item Reported',
  found_item_reported: 'Found Item Reported',
  payment_received: 'Payment Received',
  sos_triggered: 'SOS Alert',
  incident_reported: 'Incident Reported',
  camera_detection: 'AI Detection',
};

const COLOR_MAP: Record<string, string> = {
  visitor_approved: 'text-secondary-400',
  visitor_entered: 'text-primary-400',
  visitor_exited: 'text-surface-400',
  package_received: 'text-amber-400',
  package_collected: 'text-secondary-400',
  complaint_submitted: 'text-warning-400',
  complaint_resolved: 'text-secondary-400',
  alert_raised: 'text-danger-400',
  alert_resolved: 'text-secondary-400',
  poll_created: 'text-purple-400',
  notice_posted: 'text-cyan-400',
  lost_item_reported: 'text-amber-400',
  found_item_reported: 'text-secondary-400',
  payment_received: 'text-emerald-400',
  sos_triggered: 'text-danger-400',
  incident_reported: 'text-rose-400',
  camera_detection: 'text-indigo-400',
};

export interface ActivityEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export default function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Live Activity</h2>
      </div>
      <div className="relative">
        <div className="absolute left-[17px] top-3 bottom-3 w-px bg-white/5 dark:bg-surface-700/50" />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-0"
        >
          {sorted.slice(0, 15).map((event) => {
            const Icon = ICON_MAP[event.type] || Activity;
            const label = LABEL_MAP[event.type] || event.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
            const color = COLOR_MAP[event.type] || 'text-surface-400';
            return (
              <motion.div
                key={event.id}
                variants={staggerItem}
                className="flex gap-3 py-2.5 group"
              >
                <div className={cn('w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0 bg-white/5 dark:bg-surface-800/50 border border-white/5 dark:border-surface-700/50', color)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{label}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 line-clamp-1">{event.description}</p>
                </div>
                <div className="text-[11px] text-surface-500 dark:text-surface-400 shrink-0 pt-1 font-mono tabular-nums">
                  {formatTimeOnly(event.timestamp)}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

function LogOut(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>; }

function Activity(props: any) { return <div {...props} />; }

function formatTimeOnly(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
