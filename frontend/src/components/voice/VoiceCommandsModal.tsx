'use client';
import { useState, useMemo } from 'react';
import { Mic, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCommandsForRole, searchCommands, getIconComponent, categoryOrder } from '@/data/voiceCommandsData';

interface Props {
  role: string;
  onStartListening: () => void;
  onClose: () => void;
}

export default function VoiceCommandsModal({ role, onStartListening, onClose }: Props) {
  const [search, setSearch] = useState('');

  const allCommands = useMemo(() => getCommandsForRole(role), [role]);
  const filtered = useMemo(() => searchCommands(allCommands, search), [allCommands, search]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    for (const cmd of filtered) {
      if (!map[cmd.category]) map[cmd.category] = [];
      map[cmd.category].push(cmd);
    }
    return map;
  }, [filtered]);

  const sortedCategories = useMemo(() => {
    const keys = Object.keys(grouped);
    return categoryOrder.filter((c) => keys.includes(c)).concat(keys.filter((k) => !categoryOrder.includes(k)));
  }, [grouped]);

  const handleStart = () => {
    onClose();
    setTimeout(onStartListening, 100);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="glass-card p-6 max-w-2xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
              <Mic className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Supported Voice Commands</h2>
              <p className="text-xs text-surface-400">Say one of these commands to perform an action</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            className="input-field pl-9 py-2 text-sm"
            placeholder="Search commands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {sortedCategories.length === 0 ? (
            <div className="text-center py-8 text-surface-400 text-sm">No commands match your search</div>
          ) : (
            sortedCategories.map((category) => {
              const cmds = grouped[category];
              if (!cmds || cmds.length === 0) return null;
              return (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">{category}</h4>
                  <div className="space-y-1.5">
                    {cmds.map((cmd) => {
                      const Icon = getIconComponent(cmd.icon);
                      return (
                        <div key={cmd.phrase} className="flex items-start gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 hover:bg-primary-50/50 dark:hover:bg-primary-500/5 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">{cmd.phrase}</span>
                              <span className="text-xs text-surface-400">— {cmd.action}</span>
                            </div>
                            <p className="text-xs text-surface-400 mt-0.5">{cmd.description}</p>
                            <p className="text-xs text-surface-300 italic mt-0.5 truncate">Example: &ldquo;{cmd.example}&rdquo;</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-3 mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
          <button onClick={onClose} className="btn-secondary text-sm flex-1">Close</button>
          <button onClick={handleStart} className="btn-primary text-sm flex-1">
            <Mic className="w-4 h-4" /> Start Listening
          </button>
        </div>
      </motion.div>
    </div>
  );
}
