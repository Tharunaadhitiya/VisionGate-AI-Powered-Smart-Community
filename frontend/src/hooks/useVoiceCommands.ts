'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

type CommandHandler = (transcript: string) => boolean;

interface VoiceCommandMap {
  [key: string]: { action: string; handler: CommandHandler };
}

const voiceMaps: Record<string, VoiceCommandMap> = {
  admin: {
    'create emergency alert': { action: 'Open SOS Emergency', handler: () => { document.dispatchEvent(new CustomEvent('voice:open-sos')); return true; } },
    'open analytics': { action: 'Navigate to Analytics', handler: () => { window.location.href = '/dashboard/analytics'; return true; } },
    'show complaints': { action: 'Navigate to Complaints', handler: () => { window.location.href = '/complaints'; return true; } },
    'send notification': { action: 'Open Notification Composer', handler: () => { document.dispatchEvent(new CustomEvent('voice:open-notification')); return true; } },
    'open user management': { action: 'Open User Management', handler: () => { document.dispatchEvent(new CustomEvent('voice:open-user-management')); return true; } },
    'open payments': { action: 'Open Payment Management', handler: () => { window.location.href = '/dashboard/payments'; return true; } },
    'open alerts': { action: 'Navigate to Alerts', handler: () => { window.location.href = '/dashboard/alerts'; return true; } },
    'open directory': { action: 'Open User Directory', handler: () => { document.dispatchEvent(new CustomEvent('voice:open-directory')); return true; } },
    'show dashboard': { action: 'Go to Dashboard', handler: () => { window.location.href = '/dashboard'; return true; } },
  },
  resident: {
    'add a visitor': { action: 'Open Add Visitor Form', handler: () => { document.dispatchEvent(new CustomEvent('voice:add-visitor')); return true; } },
    'show my visitors': { action: 'Navigate to Visitors', handler: () => { window.location.href = '/visitors'; return true; } },
    'raise a complaint': { action: 'Open Complaint Form', handler: () => { document.dispatchEvent(new CustomEvent('voice:open-complaint')); return true; } },
    'open notifications': { action: 'Open Notifications', handler: () => { document.dispatchEvent(new CustomEvent('voice:open-notifications')); return true; } },
    'contact security': { action: 'Open SOS Emergency', handler: () => { document.dispatchEvent(new CustomEvent('voice:open-sos')); return true; } },
    'pay maintenance': { action: 'Navigate to Payments', handler: () => { window.location.href = '/dashboard'; return true; } },
    'open directory': { action: 'Open Directory', handler: () => { document.dispatchEvent(new CustomEvent('voice:open-directory')); return true; } },
    'show dashboard': { action: 'Go to Dashboard', handler: () => { window.location.href = '/dashboard'; return true; } },
  },
  security: {
    'verify visitor': { action: 'Open Verify Entry', handler: () => { document.dispatchEvent(new CustomEvent('voice:verify-visitor')); return true; } },
    'show today visitors': { action: 'Show Today\'s Visitors', handler: () => { window.location.href = '/visitors'; return true; } },
    'view alerts': { action: 'Navigate to Alerts', handler: () => { window.location.href = '/dashboard/alerts'; return true; } },
    'open directory': { action: 'Open Directory', handler: () => { document.dispatchEvent(new CustomEvent('voice:open-directory')); return true; } },
    'contact admin': { action: 'Open SOS Emergency', handler: () => { document.dispatchEvent(new CustomEvent('voice:open-sos')); return true; } },
    'show dashboard': { action: 'Go to Dashboard', handler: () => { window.location.href = '/dashboard'; return true; } },
  },
};

export function useVoiceCommands(role: string = 'resident') {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const SpeechRecognition = typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

  useEffect(() => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const current = Array.from(event.results).map((r: any) => r[0].transcript).join('');
      setTranscript(current);

      if (event.results[0].isFinal) {
        const cmd = current.toLowerCase().trim();
        const map = voiceMaps[role] || voiceMaps.resident;
        let handled = false;
        for (const [phrase, config] of Object.entries(map)) {
          if (cmd.includes(phrase)) {
            handled = config.handler(cmd);
            if (handled) {
              setLastCommand(config.action);
              toast.success(`Voice: ${config.action}`);
              break;
            }
          }
        }
        if (!handled) {
          toast.error(`Command not recognized: "${cmd}"`);
        }
        setListening(false);
      }
    };

    recognition.onerror = () => {
      setListening(false);
      toast.error('Voice recognition failed');
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.abort(); } catch {}
    };
  }, [role, SpeechRecognition]);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }
    if (listening) {
      try { recognitionRef.current?.abort(); } catch {}
      setListening(false);
    }
    setTranscript('');
    setLastCommand(null);
    try { recognitionRef.current?.start(); } catch {}
    setListening(true);
    toast.success('Listening...');
  }, [listening, SpeechRecognition]);

  const toggleListening = useCallback(() => {
    if (!SpeechRecognition) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }
    if (listening) {
      try { recognitionRef.current?.abort(); } catch {}
      setListening(false);
    } else {
      setTranscript('');
      setLastCommand(null);
      try { recognitionRef.current?.start(); } catch {}
      setListening(true);
      toast.success('Listening...');
    }
  }, [listening, SpeechRecognition]);

  return { listening, transcript, lastCommand, toggleListening, startListening, isSupported: !!SpeechRecognition };
}
