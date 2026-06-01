'use client';
import { useState } from 'react';
import { Mic, MicOff, HelpCircle } from 'lucide-react';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceCommandsModal from './VoiceCommandsModal';

export default function VoiceCommandButton() {
  const { user } = useAuth();
  const { listening, transcript, startListening, toggleListening, isSupported } = useVoiceCommands(user?.role || 'resident');
  const [showModal, setShowModal] = useState(false);

  if (!isSupported) return null;

  return (
    <>
      <div className="fixed bottom-24 right-6 z-[9999] flex flex-col items-end gap-2">
        {listening && transcript && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card px-4 py-2 text-sm max-w-[250px]">
            <p className="text-surface-400 text-xs mb-0.5">Listening...</p>
            <p className="font-medium truncate">{transcript}</p>
          </motion.div>
        )}

        {!listening && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-800/80 dark:bg-surface-700/80 text-white/70 hover:text-white text-[11px] font-medium backdrop-blur-sm hover:bg-surface-700 transition-colors"
            title="View supported voice commands"
          >
            <HelpCircle className="w-3 h-3" /> Supported Commands
          </motion.button>
        )}

        <div className="flex items-center gap-2">
          {listening && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface-800/80 text-white/70 hover:text-white text-[10px] font-medium backdrop-blur-sm hover:bg-surface-700 transition-colors"
              title="View supported commands"
            >
              <HelpCircle className="w-3 h-3" /> Help
            </motion.button>
          )}
          <motion.button
            onClick={() => { if (!listening) setShowModal(true); else toggleListening(); }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            animate={listening ? { scale: [1, 1.15, 1], transition: { repeat: Infinity, duration: 1.5 } } : {}}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              listening
                ? 'bg-danger-500 text-white ring-4 ring-danger-500/30'
                : 'bg-surface-800 dark:bg-surface-700 text-white hover:bg-surface-700'
            }`}
            title={listening ? 'Stop listening' : 'Voice commands'}
          >
            {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <VoiceCommandsModal
            role={user?.role || 'resident'}
            onStartListening={startListening}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
