'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, User, Sparkles, MessageSquare, AlertTriangle, FileText, Home, Lightbulb, TrendingUp, Shield, Cpu, Search, X, Minimize2, Maximize2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const BUBBLE_SIZE = 64;
const GAP = 14;
const MARGIN = 20;
const DRAG_THRESHOLD = 5;
const NAVBAR_HEIGHT = 64;
const SIDEBAR_WIDTH_LG = 256;

const quickActions = [
  { icon: MessageSquare, label: 'My recent visitors', color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
  { icon: FileText, label: 'Open complaints', color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10' },
  { icon: Home, label: 'Pay maintenance', color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10' },
  { icon: Shield, label: 'Book amenity', color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
  { icon: AlertTriangle, label: 'SOS emergency', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
];

const features = [
  { icon: AlertTriangle, label: 'Emergency Alert', desc: 'Instant SOS and emergency response assistance', color: 'text-danger-500' },
  { icon: FileText, label: 'Complaint Assistant', desc: 'File and track complaints with AI guidance', color: 'text-warning-500' },
  { icon: Home, label: 'Community Info', desc: 'Get information about your community and events', color: 'text-primary-500' },
  { icon: Lightbulb, label: 'Smart Recommendations', desc: 'Personalized suggestions based on your activity', color: 'text-secondary-500' },
  { icon: TrendingUp, label: 'Predictive Insights', desc: 'AI-powered predictions for community trends', color: 'text-primary-500' },
  { icon: Cpu, label: 'Smart Automation', desc: 'Automate routine tasks with AI assistance', color: 'text-purple-500' },
  { icon: Search, label: 'Community Skills', desc: 'Find skilled neighbors and experts', color: 'text-secondary-500' },
];

const initialMessages: { id: string; role: string; text: string }[] = [
  { id: '0', role: 'bot', text: "Hello! I'm VisionGate AI Assistant. How can I help you today? I can assist with visitor information, complaints, maintenance, amenity bookings, and more." },
];

const getLocalResponse = (query: string): string => {
  const q = query.toLowerCase();
  if (q.includes('visitor')) return 'You can view your visitor history and manage approvals from the Visitors page. Pre-register visitors for seamless entry.';
  if (q.includes('complaint')) return 'Submit complaints through the Complaints page. Track status and provide feedback once resolved.';
  if (q.includes('maintenance')) return 'View and pay maintenance fees from the Maintenance page. You can pay via UPI, card, or net banking.';
  if (q.includes('amenity') || q.includes('book')) return 'Book amenities like the clubhouse, pool, gym, and more from the Amenities page. Check availability and reserve your slot.';
  if (q.includes('sos') || q.includes('emergency')) return 'Use the SOS button on your dashboard for immediate emergency alerts. Security will be notified instantly.';
  return 'I can help with visitors, complaints, maintenance payments, amenity bookings, and alerts. What would you like to know?';
};

type Corner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

function snapToCorner(x: number, y: number, w: number, h: number): { x: number; y: number; corner: Corner } {
  const margin = MARGIN;
  const right = window.innerWidth - w - margin;
  const bottom = window.innerHeight - h - margin;
  const distBR = Math.abs(x - right) + Math.abs(y - bottom);
  const distBL = Math.abs(x - margin) + Math.abs(y - bottom);
  const distTR = Math.abs(x - right) + Math.abs(y - margin);
  const distTL = Math.abs(x - margin) + Math.abs(y - margin);
  const min = Math.min(distBR, distBL, distTR, distTL);
  if (min === distBR) return { x: right, y: bottom, corner: 'bottom-right' };
  if (min === distBL) return { x: margin, y: bottom, corner: 'bottom-left' };
  if (min === distTR) return { x: right, y: margin, corner: 'top-right' };
  return { x: margin, y: margin, corner: 'top-left' };
}

function getPanelDimensions(): { w: number; h: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < 640) return { w: Math.min(vw * 0.95, vw - MARGIN * 2), h: Math.min(vh * 0.8, vh - MARGIN * 2) };
  if (vw < 1024) return { w: 350, h: Math.min(500, vh - MARGIN * 2) };
  return { w: 450, h: Math.min(600, vh - MARGIN * 2) };
}

interface PanelPosition {
  left: number;
  top: number;
  openUp: boolean;
  openLeft: boolean;
}

function computePanelPosition(bubbleX: number, bubbleY: number, corner: Corner, panelW: number, panelH: number, vw: number, vh: number): PanelPosition {
  const leftSafe = (window.innerWidth >= 1024) ? SIDEBAR_WIDTH_LG + MARGIN : MARGIN;
  const topSafe = NAVBAR_HEIGHT + MARGIN;
  let openUp = corner === 'bottom-right' || corner === 'bottom-left';
  let openLeft = corner === 'bottom-right' || corner === 'top-right';

  let left: number;
  let top: number;

  if (openLeft) {
    left = bubbleX + BUBBLE_SIZE - panelW;
  } else {
    left = bubbleX;
  }

  if (openUp) {
    top = bubbleY - panelH - GAP;
  } else {
    top = bubbleY + BUBBLE_SIZE + GAP;
  }

  const fitsAbove = bubbleY - panelH - GAP >= topSafe;
  const fitsBelow = bubbleY + BUBBLE_SIZE + GAP + panelH <= vh - MARGIN;
  const fitsRightSpace = left + panelW <= vw - MARGIN;
  const fitsLeftSpace = left >= leftSafe;

  if (openUp && !fitsAbove && fitsBelow) {
    openUp = false;
    top = bubbleY + BUBBLE_SIZE + GAP;
  } else if (!openUp && !fitsBelow && fitsAbove) {
    openUp = true;
    top = bubbleY - panelH - GAP;
  }

  if (openLeft && !fitsRightSpace && fitsLeftSpace) {
    openLeft = false;
    left = bubbleX;
  } else if (!openLeft && !fitsLeftSpace && fitsRightSpace) {
    openLeft = true;
    left = bubbleX + BUBBLE_SIZE - panelW;
  }

  if (left < leftSafe) left = leftSafe;
  if (left + panelW > vw - MARGIN) left = Math.max(leftSafe, vw - panelW - MARGIN);
  if (top < topSafe) top = topSafe;
  if (top + panelH > vh - MARGIN) top = Math.max(topSafe, vh - panelH - MARGIN);

  return { left, top, openUp, openLeft };
}

export default function ChatBot() {
  console.log('[AI Bubble] render');
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<{ id: string; role: string; text: string }[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    try {
      const saved = localStorage.getItem('aiAssistantPosition');
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          console.log('[AI Bubble] position restored', p);
          return { x: p.x, y: p.y };
        }
      }
    } catch {}
    const defaultX = window.innerWidth - BUBBLE_SIZE - 20;
    const defaultY = window.innerHeight - BUBBLE_SIZE - 100;
    console.log('[AI Bubble] mounted at default position', { x: defaultX, y: defaultY });
    return { x: defaultX, y: defaultY };
  });
  const [corner, setCorner] = useState<Corner>('bottom-right');
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const isDraggingRef = useRef(false);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [panelPos, setPanelPos] = useState<PanelPosition>({ left: 0, top: 0, openUp: false, openLeft: false });
  const [panelDim, setPanelDim] = useState({ w: 450, h: 600 });

  const recalcPanel = useCallback(() => {
    if (!open || minimized) return;
    const dim = getPanelDimensions();
    setPanelDim(dim);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pp = computePanelPosition(pos.x, pos.y, corner, dim.w, dim.h, vw, vh);
    setPanelPos(pp);
  }, [open, minimized, pos, corner]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('aiAssistantPosition', JSON.stringify({ x: pos.x, y: pos.y }));
  }, [pos]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    recalcPanel();
  }, [open, minimized, recalcPanel]);

  useEffect(() => {
    if (!open || minimized) return;
    const handleResize = () => recalcPanel();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, minimized, recalcPanel]);

  const SKILL_CATEGORIES = [
    'software developer', 'ai engineer', 'data scientist', 'teacher', 'doctor',
    'lawyer', 'electrician', 'plumber', 'carpenter', 'fitness trainer',
    'music teacher', 'tuition teacher', 'graphic designer', 'photographer',
    'business consultant',
  ];

  const SKILL_PATTERNS = [
    /find\s+(?:a\s+)?(.*)/i, /need\s+(?:a\s+)?(.*)/i, /who\s+(?:can\s+)?(.*)/i,
    /looking\s+for\s+(?:a\s+)?(.*)/i, /any\s+(.*)\s+available/i,
  ];

  const matchesSkillQuery = (q: string): string | null => {
    const lower = q.toLowerCase();
    for (const cat of SKILL_CATEGORIES) {
      if (lower.includes(cat)) return cat;
    }
    for (const pattern of SKILL_PATTERNS) {
      const m = lower.match(pattern);
      if (m) {
        const extracted = m[1].trim();
        for (const cat of SKILL_CATEGORIES) {
          if (extracted.includes(cat) || cat.includes(extracted) || extracted.includes(cat.split(' ')[0])) return cat;
        }
      }
    }
    if (lower.includes('tutor') || lower.includes('tuition')) return 'tuition teacher';
    if (lower.includes('teach') || lower.includes('math') || lower.includes('physics') || lower.includes('science')) return 'teacher';
    if (lower.includes('python') || lower.includes('coding') || lower.includes('program')) return 'software developer';
    if (lower.includes('plumb')) return 'plumber';
    if (lower.includes('electric')) return 'electrician';
    if (lower.includes('design')) return 'graphic designer';
    if (lower.includes('photo')) return 'photographer';
    if (lower.includes('fit') || lower.includes('trainer') || lower.includes('gym')) return 'fitness trainer';
    if (lower.includes('music') || lower.includes('piano') || lower.includes('guitar')) return 'music teacher';
    if (lower.includes('consult')) return 'business consultant';
    if (lower.includes('doctor') || lower.includes('medical') || lower.includes('health')) return 'doctor';
    if (lower.includes('law') || lower.includes('legal') || lower.includes('advocate')) return 'lawyer';
    return null;
  };

  const handleSkillSearch = async (query: string): Promise<string> => {
    try {
      const res = await api.get('/skills/professionals', { q: query });
      const results = res.data?.professionals || [];
      if (results.length === 0) return 'No matching experts found in your community. Try a different search term.';
      const lines = results.map((p: any, i: number) =>
        `${i + 1}. ${p.name}\n   House: ${p.tower || ''}-${p.flatNumber || ''}\n   Profession: ${p.profession}\n   Experience: ${p.experience_years || 'N/A'}\n   Availability: ${p.availability || 'N/A'}\n`
      );
      return `Available Experts:\n\n${lines.join('\n')}\n\nYou can contact them via the Directory or Inbox.`;
    } catch {
      return 'Unable to search professionals right now. Please try again later.';
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = { id: Date.now().toString(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    const skillMatch = matchesSkillQuery(text);
    if (skillMatch) {
      const reply = await handleSkillSearch(skillMatch);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'bot', text: reply }]);
      setLoading(false);
      return;
    }
    try {
      const res = await api.post('/ai/chatbot', { query: text, context: messages.slice(-5) });
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: res.data?.reply || "I'm here to help with VisionGate services. You can ask about visitors, complaints, maintenance, or amenities.",
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'bot', text: getLocalResponse(text) }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (open) return;
    console.log('[AI Bubble] pointerdown');
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(false);
    isDraggingRef.current = false;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.posX = pos.x;
    dragRef.current.posY = pos.y;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragRef.current.startX === 0 && dragRef.current.startY === 0) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > DRAG_THRESHOLD) {
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        setIsDragging(true);
        console.log('[AI Bubble] dragstart');
      }
      const newX = Math.max(0, Math.min(window.innerWidth - BUBBLE_SIZE, dragRef.current.posX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - BUBBLE_SIZE, dragRef.current.posY + dy));
      setPos({ x: newX, y: newY });
      console.log('[AI Bubble] dragmove', { x: newX, y: newY });
    }
  };

  const handlePointerUp = () => {
    if (isDraggingRef.current) {
      console.log('[AI Bubble] dragend');
      console.log('[AI Bubble] click blocked');
      const snapped = snapToCorner(pos.x, pos.y, BUBBLE_SIZE, BUBBLE_SIZE);
      setPos({ x: snapped.x, y: snapped.y });
      setCorner(snapped.corner);
      setTimeout(() => {
        isDraggingRef.current = false;
        setIsDragging(false);
      }, 100);
    } else {
      console.log('[AI Bubble] pointerup (no drag)');
      console.log('[AI Bubble] click allowed');
      setOpen(!open);
      setMinimized(false);
    }
    dragRef.current.startX = 0;
    dragRef.current.startY = 0;
  };

  const handlePointerCancel = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
    dragRef.current.startX = 0;
    dragRef.current.startY = 0;
  };

  const resetPosition = () => {
    const defaultX = window.innerWidth - BUBBLE_SIZE - 20;
    const defaultY = window.innerHeight - BUBBLE_SIZE - 100;
    setPos({ x: defaultX, y: defaultY });
    setCorner('bottom-right');
  };

  const getBubbleStyle = (): React.CSSProperties => {
    return { position: 'fixed', left: pos.x, top: pos.y, zIndex: 9000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: `${GAP}px` };
  };

  const getPanelOrigin = (): { x: number; y: number } => {
    let x = 0.5;
    let y = 0.5;
    if (panelPos.openLeft) x = 1;
    else x = 0;
    if (panelPos.openUp) y = 1;
    else y = 0;
    return { x, y };
  };

  if (!mounted) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={getBubbleStyle()}
      >
        <AnimatePresence>
          {showTooltip && !open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="px-3 py-1.5 rounded-xl bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900 text-xs font-medium shadow-lg whitespace-nowrap"
            >
              <div className="flex items-center gap-3">
                <span>Vision</span>
                <button
                  onClick={(e) => { e.stopPropagation(); resetPosition(); }}
                  className="text-[10px] text-primary-300 dark:text-primary-500 hover:text-primary-200 underline underline-offset-2"
                  title="Reset to default position"
                >
                  Reset position
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {minimized && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="glass-card border border-surface-200/50 dark:border-surface-700/50 shadow-lg rounded-2xl px-4 py-2 flex items-center gap-3 cursor-pointer"
              onClick={() => setMinimized(false)}
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
                <Bot className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-medium text-surface-600 dark:text-surface-400">Vision</span>
              <button onClick={(e) => { e.stopPropagation(); setOpen(false); setMinimized(false); }} className="p-0.5 rounded hover:bg-surface-100 dark:hover:bg-surface-800">
                <X className="w-3 h-3 text-surface-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          ref={bubbleRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          whileHover={!isDragging ? { scale: 1.05 } : {}}
          whileTap={!isDragging ? { scale: 0.95 } : {}}
          className={cn(
            'relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white shadow-2xl flex items-center justify-center transition-shadow duration-300',
            isDragging ? 'cursor-grabbing shadow-indigo-500/70 shadow-2xl scale-105' : 'cursor-grab',
            open && 'shadow-lg'
          )}
          style={{ touchAction: 'none' }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400/20 to-transparent" />
          {open ? (
            <X className="w-6 h-6 relative z-10" />
          ) : (
            <div className="relative z-10 flex items-center justify-center w-full h-full">
              <Bot className="w-8 h-8 text-white" />
            </div>
          )}
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {open && !minimized && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{
              opacity: 1, scale: 1,
              left: panelPos.left,
              top: panelPos.top,
            }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
            style={{
              position: 'fixed',
              zIndex: 9001,
              transformOrigin: `${getPanelOrigin().x * 100}% ${getPanelOrigin().y * 100}%`,
            }}
            className="glass-card border border-surface-200/50 dark:border-surface-700/50 shadow-2xl overflow-hidden"
          >
            <div className="flex flex-col" style={{ width: `${panelDim.w}px`, height: `${panelDim.h}px` }}>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-100 dark:border-surface-800 shrink-0">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Vision</h3>
                  <p className="text-[10px] text-indigo-400/70">{loading ? 'Vision is analyzing...' : 'AI-Powered Smart Assistant'}</p>
                </div>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <button onClick={() => setMinimized(true)} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" title="Minimize">
                  <Minimize2 className="w-3.5 h-3.5 text-surface-400" />
                </button>
                <button onClick={() => { setOpen(false); setMinimized(false); }} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" title="Close">
                  <X className="w-3.5 h-3.5 text-surface-400" />
                </button>
              </div>

              <div className="flex flex-1 min-h-0">
                <div className="hidden sm:flex flex-col w-44 shrink-0 border-r border-surface-100 dark:border-surface-800 p-3 overflow-y-auto">
                  <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-2">AI Capabilities</p>
                  <div className="space-y-1 flex-1">
                    {features.map((f) => {
                      const Icon = f.icon;
                      return (
                        <button key={f.label}
                          onClick={() => sendMessage(f.label)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors text-left"
                        >
                          <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center shrink-0', f.color.replace('text-', 'bg-').replace('500', '50').replace('info', 'primary'))}>
                            <Icon className={cn('w-3 h-3', f.color)} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium truncate">{f.label}</p>
                            <p className="text-[8px] text-surface-400 line-clamp-1">{f.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 p-2 rounded-lg bg-gradient-to-br from-primary-500/10 to-primary-700/5 border border-primary-500/20">
                    <p className="text-[8px] text-surface-500">Ask me anything about your community!</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <AnimatePresence initial={false}>
                      {messages.map((msg) => (
                        <motion.div key={msg.id}
                          initial={{ opacity: 0, y: 12, scale: 0.92 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className={cn('flex gap-2 message-bubble', msg.role === 'user' && 'flex-row-reverse')}
                        >
                          <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                            msg.role === 'bot' ? 'bg-primary-100 dark:bg-primary-500/20' : 'bg-surface-100 dark:bg-surface-800')}>
                            {msg.role === 'bot' ? <Bot className="w-3 h-3 text-primary-600" /> : <User className="w-3 h-3 text-surface-400" />}
                          </div>
                          <div className={cn('max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed',
                            msg.role === 'bot'
                              ? 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 rounded-tl-sm'
                              : 'bg-primary-500 text-white rounded-tr-sm')}>
                            {msg.text}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {loading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
                          <Bot className="w-3 h-3 text-primary-600" />
                        </div>
                        <div className="bg-surface-100 dark:bg-surface-800 rounded-2xl rounded-tl-sm px-3 py-2.5">
                          <div className="flex gap-1">
                            {[0, 150, 300].map((d) => (
                              <div key={d} className="w-1.5 h-1.5 bg-surface-300 dark:bg-surface-600 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 border-t border-surface-100 dark:border-surface-800 shrink-0">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {quickActions.map((qa) => {
                        const Icon = qa.icon;
                        return (
                          <button key={qa.label} onClick={() => sendMessage(qa.label)}
                            className={cn('text-[9px] px-2 py-1 rounded-full flex items-center gap-1 transition-colors', qa.bg, qa.color)}>
                            <Icon className="w-2.5 h-2.5" />
                            <span className="hidden xs:inline">{qa.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <input className="input-field flex-1 text-xs" placeholder="Ask me anything..."
                        value={input} onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)} />
                      <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                        className="btn-primary px-2.5">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
