'use client';
import { useState, useEffect } from 'react';
import { Camera, Maximize2, Minimize2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const demoFeeds = [
  { id: 1, name: 'Main Gate', status: 'active', label: 'Live' },
  { id: 2, name: 'Parking Lot', status: 'active', label: 'Live' },
  { id: 3, name: 'Tower A Lobby', status: 'active', label: 'Live' },
  { id: 4, name: 'Community Garden', status: 'active', label: 'Live' },
];

export default function SurveillancePanel() {
  const [fullscreen, setFullscreen] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">Live Camera Feeds</h3>
        <div className="flex items-center gap-2 text-xs text-surface-400">
          <Activity className="w-3.5 h-3.5 text-secondary-500" />
          {demoFeeds.filter((f) => f.status === 'active').length} cameras online
        </div>
      </div>
      <div className={cn('grid gap-4', fullscreen ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4')}>
        {demoFeeds.map((feed) => (
          <div key={feed.id} className={cn('relative rounded-xl overflow-hidden bg-surface-900 aspect-video group cursor-pointer', fullscreen === feed.id && 'col-span-full')}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="w-12 h-12 text-surface-700" />
              <div className="absolute inset-0 bg-gradient-to-br from-surface-800/50 to-surface-900/80" />
            </div>
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 z-10">
              <span className="w-1.5 h-1.5 bg-secondary-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-white font-medium">{feed.label}</span>
            </div>
            <div className="absolute top-2 right-2 z-10">
              <button onClick={() => setFullscreen(fullscreen === feed.id ? null : feed.id)} className="p-1 bg-black/50 backdrop-blur-sm rounded-lg hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100">
                {fullscreen === feed.id ? <Minimize2 className="w-3.5 h-3.5 text-white" /> : <Maximize2 className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
            <div className="absolute bottom-2 left-2 right-2 z-10">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
                <p className="text-xs text-white font-medium">{feed.name}</p>
              </div>
            </div>
            <div className="absolute bottom-2 right-2 z-10">
              <span className="bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-white font-mono">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
