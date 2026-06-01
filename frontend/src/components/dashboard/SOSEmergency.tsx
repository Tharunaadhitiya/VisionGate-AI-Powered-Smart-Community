'use client';
import { useState } from 'react';
import { AlertTriangle, X, Send, Loader2, Flame, Heart, Siren, Shield, Zap, Cloud } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const presetEmergencies = [
  { label: 'Fire Emergency', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  { label: 'Medical Emergency', icon: Heart, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10' },
  { label: 'Theft/Suspicious Activity', icon: Siren, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  { label: 'Unauthorized Entry', icon: Shield, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10' },
  { label: 'Natural Disaster', icon: Cloud, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
];

export default function SOSEmergency({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'select' | 'custom'>('select');
  const [selectedEmergency, setSelectedEmergency] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const analyzeWithAI = async (message: string) => {
    try {
      const { data } = await api.post('/ai/chatbot', {
        query: `Generate a short, clear, high-priority emergency alert message based on this description: "${message}". Keep it under 50 words.`,
        context: { type: 'emergency_analysis' },
      });
      return data.reply || message;
    } catch {
      return message;
    }
  };

  const handlePresetSelect = async (label: string) => {
    setSelectedEmergency(label);
    setSending(true);
    const aiMessage = await analyzeWithAI(label);
    setAiAnalysis(aiMessage);
    await sendSOS(aiMessage, label);
    setSending(false);
  };

  const handleCustomSend = async () => {
    if (!customMessage.trim()) return;
    setSending(true);
    const aiMessage = await analyzeWithAI(customMessage);
    setAiAnalysis(aiMessage);
    await sendSOS(aiMessage, 'custom');
    setSending(false);
  };

  const sendSOS = async (message: string, type: string) => {
    try {
      await api.post('/alerts/sos', {
        location: 'My Location',
        metadata: { emergencyType: type, aiGenerated: message, customMessage: type === 'custom' ? customMessage : undefined },
      });
      toast.success('SOS alert sent to security & admin!');
      onClose();
    } catch {
      toast.error('Failed to send SOS');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-lg w-full animate-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-danger-100 dark:bg-danger-500/20 rounded-full flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold">SOS Emergency</h3>
              <p className="text-xs text-surface-400">Select emergency type or describe the situation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"><X className="w-5 h-5" /></button>
        </div>

        {sending ? (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-3" />
            <p className="text-sm text-surface-400">AI is analyzing your emergency...</p>
            {aiAnalysis && (
              <div className="mt-4 p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-sm">
                <p className="font-medium text-primary-700 dark:text-primary-400">Generated Alert:</p>
                <p className="text-surface-600 dark:text-surface-300 mt-1">{aiAnalysis}</p>
              </div>
            )}
          </div>
        ) : step === 'select' ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {presetEmergencies.map((emergency) => {
                const Icon = emergency.icon;
                return (
                  <button key={emergency.label} onClick={() => handlePresetSelect(emergency.label)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-surface-100 dark:border-surface-700 hover:border-danger-300 dark:hover:border-danger-500 hover:bg-danger-50/50 dark:hover:bg-danger-500/5 transition-all group">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${emergency.bg} group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${emergency.color}`} />
                    </div>
                    <span className="text-xs font-medium text-center">{emergency.label}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setStep('custom')} className="btn-secondary w-full">Type Custom Emergency</button>
          </>
        ) : (
          <div className="space-y-3">
            <textarea className="input-field h-24 resize-none" placeholder="Describe the emergency situation in detail..."
              value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => setStep('select')} className="btn-secondary flex-1">Back</button>
              <button onClick={handleCustomSend} disabled={!customMessage.trim()} className="btn-danger flex-1">
                <Send className="w-4 h-4" /> Send SOS
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
