'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Send, Search, Loader2, Mail, User, Shield, Home, Circle, MessageCircle, Info, ChevronLeft, MoreHorizontal, Phone, Clock, CheckCheck, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import api from '@/lib/api';
import { cn, formatTime } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animation';
import toast from 'react-hot-toast';

interface ChatUser {
  _id: string; name: string; email: string; role: string; flatNumber?: string; tower?: string;
}

interface MessageItem {
  _id: string; sender: { _id: string; name: string; role: string }; receiver: { _id: string; name: string; role: string }; message: string; read: boolean; createdAt: string;
}

interface Conversation {
  _id: string; participants: ChatUser[]; lastMessage: string; lastMessageAt: string; lastSender: { _id: string; name: string } | null; unreadCount?: number;
}

const roleIcon: Record<string, any> = { admin: Shield, security: Home, resident: User };
const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  security: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  resident: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
};

function formatConversationTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return formatTime(dateStr);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function InboxPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { connected, onlineUsers, chatMessages, emit, typingUser, conversationUpdated } = useSocket();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [tab, setTab] = useState<'chats' | 'users'>('chats');
  const [showDetails, setShowDetails] = useState<ChatUser | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMobileList, setShowMobileList] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/users?limit=200');
      setUsers((data.users || []).filter((u: ChatUser) => u._id !== user?._id));
    } catch {}
  }, [user]);

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data.conversations || []);
    } catch {}
  }, []);

  const fetchMessages = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/chat/messages/${userId}`);
      setMessages(data.messages || []);
      setUnreadCounts((prev) => ({ ...prev, [userId]: 0 }));
    } catch {}
    setLoading(false);
  }, []);

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/unread-counts');
      setUnreadCounts(data.counts || {});
    } catch {}
  }, []);

  useEffect(() => {
    fetchUsers(); fetchConversations(); fetchUnreadCounts();
  }, [fetchUsers, fetchConversations, fetchUnreadCounts]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser._id);
      emit('message:read', { senderId: selectedUser._id });
    }
  }, [selectedUser, fetchMessages, emit]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMessages]);

  useEffect(() => {
    if (!selectedUser) return;
    const handlePopState = () => {
      setShowMobileList(true);
      setSelectedUser(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedUser]);

  const updateConversationFromMessage = useCallback((newMsg: MessageItem) => {
    if (!user) return;
    const otherId = newMsg.sender._id === user._id ? newMsg.receiver._id : newMsg.sender._id;
    const otherName = newMsg.sender._id === user._id ? newMsg.receiver.name : newMsg.sender.name;

    setConversations((prev) => {
      const existing = prev.find((c) => c.participants.some((p) => p._id === otherId));
      if (existing) {
        const updated = { ...existing, lastMessage: newMsg.message, lastMessageAt: newMsg.createdAt, lastSender: { _id: newMsg.sender._id, name: newMsg.sender.name } };
        return [updated, ...prev.filter((c) => c._id !== existing._id)];
      }
      const otherUser = users.find((u) => u._id === otherId) || { _id: otherId, name: otherName, email: '', role: '', flatNumber: '', tower: '' };
      const newConv: Conversation = { _id: `new-${otherId}`, participants: [user, otherUser], lastMessage: newMsg.message, lastMessageAt: newMsg.createdAt, lastSender: { _id: newMsg.sender._id, name: newMsg.sender.name }, unreadCount: newMsg.sender._id !== user._id ? 1 : 0 };
      return [newConv, ...prev];
    });
  }, [user, users]);

  useEffect(() => {
    if (chatMessages.length > 0 && selectedUser) {
      const newMsg = chatMessages[chatMessages.length - 1];
      if (newMsg.sender?._id === selectedUser._id || newMsg.receiver?._id === selectedUser._id) {
        setMessages((prev) => prev.some((m) => m._id === newMsg._id) ? prev : [...prev, newMsg]);
      }
      updateConversationFromMessage(newMsg);
      if (newMsg.sender._id !== user?._id && newMsg.sender._id !== selectedUser._id) {
        setUnreadCounts((prev) => ({ ...prev, [newMsg.sender._id]: (prev[newMsg.sender._id] || 0) + 1 }));
      }
    }
  }, [chatMessages, selectedUser, user, updateConversationFromMessage]);

  useEffect(() => {
    if (!conversationUpdated) return;
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c._id === conversationUpdated._id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = conversationUpdated;
        return updated;
      }
      return [conversationUpdated, ...prev];
    });
  }, [conversationUpdated]);

  const sendMessage = () => {
    if (!input.trim() || !selectedUser) return;
    emit('chat:send', { receiverId: selectedUser._id, message: input.trim() });
    const optimistic: any = {
      _id: Date.now().toString(), sender: { _id: user!._id, name: user!.name, role: user!.role },
      receiver: { _id: selectedUser._id, name: selectedUser.name, role: selectedUser.role },
      message: input.trim(), read: false, createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
  };

  const isOnline = (userId: string) => onlineUsers.some((u) => u.userId === userId);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.flatNumber?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const otherParticipant = (conv: Conversation) => conv.participants.find((p) => p._id !== user?._id);

  const startChat = (target: ChatUser) => {
    setSelectedUser(target);
    setShowMobileList(false);
    const existingConv = conversations.find((c) => c.participants.some((p) => p._id === target._id));
    if (!existingConv) {
      api.get(`/chat/conversations/${target._id}`).then(({ data }) => {
        if (data?.conversation) {
          setConversations((prev) => {
            if (prev.some((c) => c._id === data.conversation._id)) return prev;
            return [data.conversation, ...prev];
          });
        }
      }).catch(() => {});
    }
  };

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'resident', label: 'Resident' },
    { value: 'security', label: 'Security' },
  ];

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] glass-card border border-surface-200/50 dark:border-surface-700/50 flex overflow-hidden">
        {/* Sidebar */}
        <motion.div
          initial={false}
          animate={{ width: showMobileList || !selectedUser ? 320 : 0 }}
          className={cn(
            'border-r border-surface-100 dark:border-surface-800 flex flex-col shrink-0 overflow-hidden',
            showMobileList ? 'w-full md:w-[320px]' : 'w-0 md:w-[320px]'
          )}
        >
          <div className="flex border-b border-surface-100 dark:border-surface-800">
            {(['chats', 'users'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('flex-1 py-3 text-sm font-medium text-center transition-colors',
                  tab === t ? 'text-primary-600 border-b-2 border-primary-600' : 'text-surface-400 hover:text-surface-600')}>
                {t === 'chats' ? 'Chats' : 'All Users'}
              </button>
            ))}
          </div>

          <div className="p-3 border-b border-surface-100 dark:border-surface-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input className="input-field pl-9 py-2 text-sm" placeholder="Search by name, email or flat..."
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === 'chats' ? (
              conversations.length === 0 ? (
                <div className="text-center py-12 text-surface-400 text-sm px-4">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-surface-200 dark:text-surface-700" />
                  No conversations yet. Switch to &quot;All Users&quot; to start one.
                </div>
              ) : (
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                      {conversations.filter((conv) => conv.lastMessage).map((conv) => {
                      const other = otherParticipant(conv);
                      if (!other) return null;
                      const unread = conv.unreadCount || unreadCounts[other._id] || 0;
                      const RoleIcon = roleIcon[other.role] || User;
                      return (
                        <div key={conv._id} className="relative group">
                          <motion.button variants={staggerItem} onClick={() => startChat(other)}
                            className={cn(
                              'w-full flex items-center gap-3 p-3 transition-colors text-left border-b border-surface-50/50 dark:border-surface-800/30',
                              selectedUser?._id === other._id
                                ? 'bg-primary-50 dark:bg-primary-500/10'
                                : 'hover:bg-surface-50 dark:hover:bg-surface-800/50'
                            )}>
                            <div className="relative shrink-0">
                              <div className="w-11 h-11 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {other.name.charAt(0)}
                              </div>
                              <span
                                className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-surface-900 rounded-full',
                                  isOnline(other._id) ? 'bg-secondary-500' : 'bg-surface-300')}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <p className="text-sm font-semibold truncate">{other.name}</p>
                                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0', roleColors[other.role] || '')}>{other.role}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  {unread > 0 && (
                                    <span className="min-w-[16px] h-4 bg-primary-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                                      {unread > 9 ? '9+' : unread}
                                    </span>
                                  )}
                                  <span className="text-[9px] text-surface-400 whitespace-nowrap">{formatConversationTime(conv.lastMessageAt)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs mb-0.5">
                                <Mail className="w-3 h-3 text-surface-400 shrink-0" />
                                <span className="text-surface-500 truncate">{other.email}</span>
                              </div>
                              <p className="text-[11px] text-surface-400 truncate">{conv.lastMessage || 'Start chatting'}</p>
                            </div>
                          </motion.button>
                          <button onClick={async (e) => { e.stopPropagation(); if (confirm('Delete this conversation?')) { try { await api.delete('/chat/conversations/' + conv._id); setConversations((prev) => prev.filter((c) => c._id !== conv._id)); if (selectedUser?._id === other._id) setSelectedUser(null); toast.success('Conversation deleted'); } catch { toast.error('Failed to delete'); } } }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-danger-50 dark:bg-danger-500/10 text-danger-500 hover:bg-danger-100 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete conversation">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                    </motion.div>
              )
            ) : (
              <>
                <div className="px-3 py-2 flex gap-1.5 overflow-x-auto">
                  {roleOptions.map((opt) => (
                    <button key={opt.value} onClick={() => setRoleFilter(opt.value)}
                      className={cn('px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors',
                        roleFilter === opt.value ? 'bg-primary-600 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:bg-surface-200')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-surface-400 text-sm">No users found</div>
                ) : (
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                    {filteredUsers.map((u) => {
                    const unread = unreadCounts[u._id] || 0;
                    const RoleIcon = roleIcon[u.role] || User;
                    return (
                      <motion.div key={u._id} variants={staggerItem}
                        className={cn(
                          'flex items-center gap-3 p-3 transition-colors border-b border-surface-50/50 dark:border-surface-800/30 relative',
                          selectedUser?._id === u._id
                            ? 'bg-primary-50 dark:bg-primary-500/10'
                            : 'hover:bg-surface-50 dark:hover:bg-surface-800/50'
                        )}>
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {u.name.charAt(0)}
                          </div>
                          <span
                            className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-surface-900 rounded-full',
                              isOnline(u._id) ? 'bg-secondary-500' : 'bg-surface-300')}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-sm font-medium truncate">{u.name}</p>
                            <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0', roleColors[u.role] || '')}>{u.role}</span>
                            {unread > 0 && (
                              <span className="min-w-[14px] h-3.5 bg-primary-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-1 shrink-0">
                                {unread > 9 ? '9+' : unread}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Mail className="w-3 h-3 text-surface-400 shrink-0" />
                            <span className="text-surface-500 truncate">{u.email}</span>
                            <Circle className={cn('w-1.5 h-1.5 fill-current shrink-0', isOnline(u._id) ? 'text-secondary-500' : 'text-surface-300')} />
                          </div>
                          {u.flatNumber && <p className="text-[10px] text-surface-400 mt-0.5">Flat {u.flatNumber}{u.tower ? `, Tower ${u.tower}` : ''}</p>}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => startChat(u)} className="btn-primary text-[10px] px-2.5 py-1 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> Chat
                          </button>
                          <button onClick={() => setShowDetails(showDetails?._id === u._id ? null : u)}
                            className="btn-ghost text-[10px] px-2.5 py-1 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Info
                          </button>
                        </div>
                        {showDetails?._id === u._id && (
                          <div className="absolute right-12 top-1/2 -translate-y-1/2 w-48 glass-card border border-surface-200/50 dark:border-surface-700/50 shadow-xl z-10 p-3 text-xs" onClick={(e) => e.stopPropagation()}>
                            <p className="font-semibold mb-1">{u.name}</p>
                            <p className="text-surface-400 mb-0.5">{u.email}</p>
                            <p className="text-surface-400 mb-0.5 capitalize">Role: {u.role}</p>
                            {u.flatNumber && <p className="text-surface-400 mb-0.5">Flat: {u.flatNumber}, Tower {u.tower}</p>}
                            <p className="text-surface-400">{isOnline(u._id) ? 'Online' : 'Offline'}</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedUser ? (
            <>
              <div className="flex items-center gap-2 p-3 border-b border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30">
                <button onClick={() => { setShowMobileList(true); setSelectedUser(null); }}
                  className="flex items-center gap-1.5 p-1.5 pr-3 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors font-medium shrink-0">
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm">Back</span>
                </button>
                <div className="relative">
                  <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {selectedUser.name.charAt(0)}
                  </div>
                  <span
                    className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white dark:border-surface-900 rounded-full',
                      isOnline(selectedUser._id) ? 'bg-secondary-500' : 'bg-surface-300')}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedUser.name}</p>
                  <p className="text-[10px] text-surface-400 flex items-center gap-1">
                    {isOnline(selectedUser._id) ? 'Online' : 'Offline'} &middot; {selectedUser.email}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <div className={cn('flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full', roleColors[selectedUser.role] || '')}>
                    {selectedUser.role}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-surface-400 text-sm">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-surface-200 dark:text-surface-700" />
                    No messages yet. Say hello!
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => {
                      const isMine = msg.sender._id === user?._id;
                      return (
                        <motion.div key={msg._id}
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                          <div className={cn('max-w-[75%] p-3 rounded-2xl text-sm', isMine
                            ? 'bg-primary-600 text-white rounded-br-md shadow-lg shadow-primary-500/20'
                            : 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 rounded-bl-md shadow-sm')}>
                            <p className="leading-relaxed">{msg.message}</p>
                            <div className={cn('flex items-center justify-end gap-1 mt-1', isMine ? 'text-primary-200' : 'text-surface-400')}>
                              <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                              {isMine && (
                                <CheckCheck className={cn('w-3 h-3', msg.read ? 'text-secondary-400' : 'text-primary-300')} />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
                <AnimatePresence>
                  {typingUser && selectedUser && typingUser.userId === selectedUser._id && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-xs text-surface-400 ml-1"
                    >
                      <div className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      {typingUser.name} is typing...
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30">
                <div className="flex gap-2">
                  <input className="input-field flex-1 text-sm py-2.5" placeholder="Type a message..."
                    value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                    onFocus={() => { if (selectedUser) emit('chat:typing', { receiverId: selectedUser._id }); }}
                    onBlur={() => { if (selectedUser) emit('chat:stopTyping', { receiverId: selectedUser._id }); }} />
                  <motion.button onClick={sendMessage} disabled={!input.trim()}
                    whileTap={{ scale: 0.95 }}
                    className="btn-primary px-4 py-2.5">
                    <Send className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-surface-400">
              <div className="text-center px-6">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-surface-200 dark:text-surface-700" />
                <h3 className="text-lg font-semibold text-surface-600 dark:text-surface-300 mb-2">Select a conversation</h3>
                <p className="text-sm">Choose a chat from the sidebar or start a new conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
