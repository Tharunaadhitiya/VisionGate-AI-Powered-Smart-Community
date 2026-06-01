'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, ChevronDown, Search, Loader2, Mail, Circle, User, Shield, Home, Clock, Info, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import api from '@/lib/api';
import { cn, formatTime } from '@/lib/utils';

interface ChatUser {
  _id: string; name: string; email: string; role: string; flatNumber?: string; tower?: string;
}

interface MessageItem {
  _id: string; sender: { _id: string; name: string; role: string }; receiver: { _id: string; name: string; role: string }; message: string; read: boolean; createdAt: string;
}

interface Conversation {
  _id: string; participants: ChatUser[]; lastMessage: string; lastMessageAt: string; lastSender: { _id: string; name: string }; unreadCount?: number;
}

const roleIcon: Record<string, any> = { admin: Shield, security: Home, resident: User };
const roleColors: Record<string, string> = { admin: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400', security: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400', resident: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' };

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

export default function ChatWidget() {
  const { user } = useAuth();
  const { connected, onlineUsers, chatMessages, emit, typingUser, openChatTarget, setOpenChatTarget } = useSocket();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [tab, setTab] = useState<'conversations' | 'users'>('conversations');
  const [showDetails, setShowDetails] = useState<ChatUser | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingTargetRef = useRef<string | null>(null);

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
    if (open) { fetchUsers(); fetchConversations(); fetchUnreadCounts(); }
  }, [open, fetchUsers, fetchConversations, fetchUnreadCounts]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser._id);
    }
  }, [selectedUser, fetchMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatMessages]);

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
    if (chatMessages.length > 0) {
      const newMsg = chatMessages[chatMessages.length - 1];
      if (selectedUser && (newMsg.sender._id === selectedUser._id || newMsg.receiver._id === selectedUser._id)) {
        setMessages((prev) => prev.some((m) => m._id === newMsg._id) ? prev : [...prev, newMsg]);
      }
      updateConversationFromMessage(newMsg);
      if (!open || (selectedUser && newMsg.sender._id !== user?._id && newMsg.sender._id !== selectedUser._id)) {
        setUnreadCounts((prev) => ({ ...prev, [newMsg.sender._id === user?._id ? newMsg.receiver._id : newMsg.sender._id]: (prev[newMsg.sender._id === user?._id ? newMsg.receiver._id : newMsg.sender._id] || 0) + 1 }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages]);

  const openChatByTarget = useCallback(async (targetId: string) => {
    setOpen(true);
    try {
      const { data } = await api.get('/users?limit=200');
      const all = (data.users || []).filter((u: ChatUser) => u._id !== user?._id);
      setUsers(all);
      const target = all.find((u: ChatUser) => u._id === targetId);
      if (target) {
        setSelectedUser(target);
      } else {
        setSelectedUser(null);
      }
      await fetchConversations();
      await fetchUnreadCounts();
    } catch {}
    setOpenChatTarget(null);
  }, [fetchConversations, fetchUnreadCounts, setOpenChatTarget, user]);

  useEffect(() => {
    if (openChatTarget) openChatByTarget(openChatTarget);
  }, [openChatTarget, openChatByTarget]);

  const sendMessage = () => {
    if (!input.trim() || !selectedUser) return;
    emit('chat:send', { receiverId: selectedUser._id, message: input.trim() });
    const optimistic: any = { _id: Date.now().toString(), sender: { _id: user!._id, name: user!.name, role: user!.role }, receiver: { _id: selectedUser._id, name: selectedUser.name, role: selectedUser.role }, message: input.trim(), read: false, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
  };

  const isOnline = (userId: string) => onlineUsers.some((u) => u.userId === userId);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.flatNumber?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const otherParticipant = (conv: Conversation) => conv.participants.find((p) => p._id !== user?._id);

  const startChat = (target: ChatUser) => {
    setSelectedUser(target);
    setTab('conversations');
  };

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'resident', label: 'Resident' },
    { value: 'security', label: 'Security' },
  ];

  if (!open) {
    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-primary-500/30 hover:bg-primary-700 active:scale-95 transition-all">
        <MessageSquare className="w-6 h-6" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-96 glass-card border border-surface-200/50 dark:border-surface-700/50 shadow-2xl animate-in flex flex-col" style={{ height: '560px' }}>
      <div className="flex items-center justify-between p-3 border-b border-surface-100 dark:border-surface-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-500" />
          <span className="font-semibold text-sm">Messages</span>
          <span className={cn('w-2 h-2 rounded-full', connected ? 'bg-secondary-500' : 'bg-danger-500')} />
        </div>
        <button onClick={() => { setOpen(false); setSelectedUser(null); }} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {selectedUser ? (
          <>
            <div className="flex items-center gap-2 p-2.5 border-b border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30">
              <button onClick={() => setSelectedUser(null)} className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700">
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {selectedUser.name.charAt(0)}
                </div>
                <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white dark:border-surface-900 rounded-full', isOnline(selectedUser._id) ? 'bg-secondary-500' : 'bg-surface-300')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedUser.name}</p>
                <p className="text-[10px] text-surface-400 flex items-center gap-1">
                  <span className={cn('w-1.5 h-1.5 rounded-full', isOnline(selectedUser._id) ? 'bg-secondary-500' : 'bg-surface-300')} />
                  {isOnline(selectedUser._id) ? 'Online' : 'Offline'} &middot; {selectedUser.email}
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-surface-400 text-xs">No messages yet. Start a conversation!</div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender._id === user?._id;
                  return (
                    <div key={msg._id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[80%] p-2.5 rounded-2xl text-sm', isMine ? 'bg-primary-600 text-white rounded-br-md' : 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 rounded-bl-md')}>
                        <p>{msg.message}</p>
                        <p className={cn('text-[10px] mt-0.5', isMine ? 'text-primary-200' : 'text-surface-400')}>{formatTime(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              {typingUser && selectedUser && typingUser.userId === selectedUser._id && (
                <div className="flex items-center gap-1.5 text-xs text-surface-400">
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  {typingUser.name} is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-2.5 border-t border-surface-100 dark:border-surface-800">
              <div className="flex gap-2">
                <input className="input-field flex-1 text-sm py-2" placeholder="Type a message..." value={input}
                  onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                  onFocus={() => { if (selectedUser) emit('chat:typing', { receiverId: selectedUser._id }); }} />
                <button onClick={sendMessage} disabled={!input.trim()} className="btn-primary px-3 py-2">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex border-b border-surface-100 dark:border-surface-800">
              <button onClick={() => setTab('conversations')} className={cn('flex-1 py-2 text-xs font-medium text-center transition-colors', tab === 'conversations' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-surface-400 hover:text-surface-600')}>Chats</button>
              <button onClick={() => setTab('users')} className={cn('flex-1 py-2 text-xs font-medium text-center transition-colors', tab === 'users' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-surface-400 hover:text-surface-600')}>All Users</button>
            </div>
            <div className="p-2.5 border-b border-surface-100 dark:border-surface-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input className="input-field pl-9 py-2 text-sm" placeholder="Search by name, email or flat..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {tab === 'conversations' ? (
                conversations.length === 0 ? (
                  <div className="text-center py-8 text-surface-400 text-xs">No conversations yet. Switch to &quot;All Users&quot; to start one.</div>
                ) : (
                  conversations
                    .filter((conv) => conv.lastMessage)
                    .map((conv) => {
                      const other = otherParticipant(conv);
                      if (!other) return null;
                      const unread = conv.unreadCount || unreadCounts[other._id] || 0;
                      const RoleIcon = roleIcon[other.role] || User;
                      return (
                        <button key={conv._id} onClick={() => setSelectedUser(other)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors text-left border-b border-surface-50/50 dark:border-surface-800/30">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {other.name.charAt(0)}
                            </div>
                            <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-surface-900 rounded-full', isOnline(other._id) ? 'bg-secondary-500' : 'bg-surface-300')} />
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
                              <Circle className={cn('w-1.5 h-1.5 fill-current shrink-0', isOnline(other._id) ? 'text-secondary-500' : 'text-surface-300')} />
                            </div>
                            <p className="text-[11px] text-surface-400 truncate">{conv.lastMessage || 'Start chatting'}</p>
                          </div>
                        </button>
                      );
                    })
                )
              ) : (
                <>
                  <div className="px-2.5 py-1.5 flex gap-1.5 overflow-x-auto">
                    {roleOptions.map((opt) => (
                      <button key={opt.value} onClick={() => setRoleFilter(opt.value)}
                        className={cn('px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors', roleFilter === opt.value ? 'bg-primary-600 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:bg-surface-200')}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-surface-400 text-xs">No users found</div>
                  ) : (
                    filteredUsers.map((u) => {
                      const unread = unreadCounts[u._id] || 0;
                      const RoleIcon = roleIcon[u.role] || User;
                      return (
                        <div key={u._id}
                          className="flex items-center gap-3 p-3 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors border-b border-surface-50/50 dark:border-surface-800/30">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {u.name.charAt(0)}
                            </div>
                            <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-surface-900 rounded-full', isOnline(u._id) ? 'bg-secondary-500' : 'bg-surface-300')} />
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
                            <button onClick={() => setShowDetails(showDetails?._id === u._id ? null : u)} className="btn-ghost text-[10px] px-2.5 py-1 flex items-center gap-1">
                              <Info className="w-3 h-3" /> Info
                            </button>
                          </div>
                          {showDetails?._id === u._id && (
                            <div className="absolute right-12 top-1/2 -translate-y-1/2 w-48 glass-card border border-surface-200/50 dark:border-surface-700/50 shadow-xl z-10 p-3 text-xs" onClick={(e) => e.stopPropagation()}>
                              <p className="font-semibold mb-1">{u.name}</p>
                              <p className="text-surface-400 mb-0.5">{u.email}</p>
                              <p className="text-surface-400 mb-0.5 capitalize">Role: {u.role}</p>
                              {u.flatNumber && <p className="text-surface-400 mb-0.5">Flat: {u.flatNumber}, Tower {u.tower}</p>}
                              <p className="text-surface-400">{isOnline(u._id) ? '🟢 Online' : '⚪ Offline'}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
