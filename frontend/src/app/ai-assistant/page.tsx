'use client';
import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, MessageSquare, AlertTriangle, FileText, Home, Lightbulb, TrendingUp, Shield, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem, messageBubble } from '@/lib/animation';

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
  { icon: TrendingUp, label: 'Predictive Insights', desc: 'AI-powered predictions for community trends', color: 'text-info-500' },
  { icon: Cpu, label: 'Smart Automation', desc: 'Automate routine tasks with AI assistance', color: 'text-purple-500' },
];

const initialMessages = [
  { id: '0', role: 'bot', text: "Hello! I'm VisionGate AI Assistant. How can I help you today? I can assist with visitor information, complaints, maintenance, amenity bookings, and more." },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chatbot', { query: text, context: messages.slice(-5) });
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: res.data?.reply || "I'm here to help with VisionGate services. You can ask about visitors, complaints, maintenance, or amenities.",
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackMsg = { id: (Date.now() + 1).toString(), role: 'bot', text: getLocalResponse(text) };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const getLocalResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes('visitor')) return 'You can view your visitor history and manage approvals from the Visitors page. Pre-register visitors for seamless entry.';
    if (q.includes('complaint')) return 'Submit complaints through the Complaints page. Track status and provide feedback once resolved.';
    if (q.includes('maintenance')) return 'View and pay maintenance fees from the Maintenance page. You can pay via UPI, card, or net banking.';
    if (q.includes('amenity') || q.includes('book')) return 'Book amenities like the clubhouse, pool, gym, and more from the Amenities page. Check availability and reserve your slot.';
    if (q.includes('sos') || q.includes('emergency')) return 'Use the SOS button on your dashboard for immediate emergency alerts. Security will be notified instantly.';
    return 'I can help with visitors, complaints, maintenance payments, amenity bookings, and alerts. What would you like to know?';
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex gap-4">
        {/* Features Sidebar */}
        <div className="hidden lg:flex flex-col w-64 shrink-0 glass-card border border-surface-200/50 dark:border-surface-700/50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">AI Capabilities</span>
          </div>
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2 flex-1">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <motion.button key={f.label} variants={staggerItem}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => sendMessage(f.label)}
                  className="w-full flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors text-left"
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', f.color.replace('text-', 'bg-').replace('500', '50').replace('info', 'primary'))}>
                    <Icon className={cn('w-4 h-4', f.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{f.label}</p>
                    <p className="text-[9px] text-surface-400 line-clamp-2">{f.desc}</p>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-700/5 border border-primary-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              <p className="text-[10px] font-semibold text-primary-600 dark:text-primary-400">Pro Tip</p>
            </div>
            <p className="text-[9px] text-surface-500">Ask me anything about your community! I can help with visitors, complaints, payments, and more.</p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col glass-card border border-surface-200/50 dark:border-surface-700/50">
          <div className="flex items-center gap-3 p-4 border-b border-surface-100 dark:border-surface-800">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Assistant</h3>
              <p className="text-[10px] text-surface-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-secondary-500 rounded-full inline-block" />
                Powered by VisionGate AI
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-primary-400 ml-auto" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div key={msg.id}
                  variants={messageBubble}
                  initial="hidden"
                  animate="visible"
                  className={cn('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}>
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                    msg.role === 'bot' ? 'bg-primary-100 dark:bg-primary-500/20' : 'bg-surface-100 dark:bg-surface-800')}>
                    {msg.role === 'bot' ? <Bot className="w-3.5 h-3.5 text-primary-600" /> : <User className="w-3.5 h-3.5 text-surface-400" />}
                  </div>
                  <div className={cn('max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
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
                <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-primary-600" />
                </div>
                <div className="bg-surface-100 dark:bg-surface-800 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 150, 300].map((delay) => (
                      <div key={delay} className="w-2 h-2 bg-surface-300 dark:bg-surface-600 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-surface-100 dark:border-surface-800">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {quickActions.map((qa) => {
                const Icon = qa.icon;
                return (
                  <motion.button key={qa.label} onClick={() => sendMessage(qa.label)}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className={cn('text-[10px] px-2.5 py-1.5 rounded-full flex items-center gap-1 transition-colors', qa.bg, qa.color)}>
                    <Icon className="w-3 h-3" />
                    {qa.label}
                  </motion.button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input className="input-field flex-1 text-sm" placeholder="Ask me anything..."
                value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)} />
              <motion.button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                whileTap={{ scale: 0.95 }} className="btn-primary px-4">
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
