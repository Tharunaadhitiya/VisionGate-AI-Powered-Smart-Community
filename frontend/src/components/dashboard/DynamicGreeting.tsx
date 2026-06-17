'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { staggerItem } from '@/lib/animation';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });
}

export default function DynamicGreeting({ role, name }: { role: string; name?: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const displayName = name || (role.charAt(0).toUpperCase() + role.slice(1));

  return (
    <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
          {getGreeting()}, {displayName}
        </h1>
        <p className="text-surface-500 dark:text-surface-400 text-sm mt-0.5">
          {formatDate(now)}
        </p>
      </div>
      <div className="text-surface-500 dark:text-surface-400 text-sm font-mono tracking-wider tabular-nums bg-white/5 dark:bg-surface-800/50 px-3 py-1.5 rounded-lg border border-white/5 dark:border-surface-700/50 self-start">
        {formatTime(now)}
      </div>
    </motion.div>
  );
}
