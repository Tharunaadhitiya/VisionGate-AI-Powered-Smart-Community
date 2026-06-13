'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, Paintbrush } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animation';
import type { Theme } from '@/hooks/useTheme';

const themeOptions: { value: Theme; label: string; icon: any; description: string }[] = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Clean, bright interface' },
  { value: 'dark', label: 'Dark Blue', icon: Moon, description: 'Dark blue theme' },
  { value: 'contrast-black', label: 'Contrast Black', icon: Moon, description: 'True AMOLED black' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follows your device' },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <DashboardLayout>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8 max-w-3xl">
        <motion.div variants={staggerItem}>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Settings</h1>
          <p className="text-surface-400 mt-1">Customize your experience</p>
        </motion.div>

        <motion.div variants={staggerItem} className="bg-white dark:bg-surface-800 rounded-2xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
          <div className="p-6 border-b border-surface-100 dark:border-surface-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
                <Paintbrush className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Appearance</h2>
                <p className="text-sm text-surface-400">Choose your theme</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const selected = theme === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      'relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 text-center',
                      selected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-sm shadow-primary-500/20'
                        : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 hover:border-surface-300 dark:hover:border-surface-600'
                    )}
                  >
                    {selected && (
                      <motion.div
                        layoutId="theme-check"
                        className="absolute top-2 right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center"
                        initial={false}
                      >
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700 flex items-center justify-center">
                      <Icon className={cn('w-6 h-6', opt.value === 'light' ? 'text-amber-500' : opt.value === 'system' ? 'text-primary-500' : 'text-surface-500 dark:text-surface-300')} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{opt.label}</p>
                      <p className="text-xs text-surface-400 mt-0.5">{opt.description}</p>
                    </div>
                    <div
                      className={cn(
                        'w-full h-1.5 rounded-full',
                        opt.value === 'light' ? 'bg-surface-100' :
                        opt.value === 'dark' ? 'bg-gradient-to-r from-surface-900 to-surface-700' :
                        opt.value === 'contrast-black' ? 'bg-gradient-to-r from-black via-surface-800 to-black' :
                        'bg-gradient-to-r from-surface-100 to-surface-900'
                      )}
                    />
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-8 p-4 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700">
              <p className="text-xs text-surface-400 leading-relaxed">
                Theme changes are saved automatically and applied instantly. 
                {theme === 'contrast-black' && ' Contrast Black is optimized for OLED/AMOLED displays with true black pixels.'}
                {theme === 'system' && ' Your device&apos;s system preference will be used. Enable dark mode in your OS settings to see the dark theme.'}
                {theme === 'light' && ' Light theme uses a clean white and gray palette for bright environments.'}
                {theme === 'dark' && ' The dark blue theme reduces eye strain in low-light environments.'}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
