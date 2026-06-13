'use client';
import { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api';
import { useAuth } from './useAuth';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';

interface ChatNotification {
  _id: string;
  from: string;
  message: string;
  conversationId: string;
  senderId?: string;
  createdAt: string;
}

interface Conversation {
  _id: string;
  participants: any[];
  lastMessage: string;
  lastMessageAt: string;
  lastSender: { _id: string; name: string } | null;
  unreadCount?: number;
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  notifications: any[];
  myNotifications: any[];
  onlineUsers: any[];
  chatMessages: any[];
  chatNotifications: ChatNotification[];
  typingUser: { userId: string; name: string } | null;
  conversationUpdated: any;
  unreadCount: number;
  emit: (event: string, data: any) => void;
  clearNotifications: () => void;
  clearChatNotifications: () => void;
  clearChatMessages: () => void;
  openChatTarget: string | null;
  setOpenChatTarget: (userId: string | null) => void;
  markNotificationRead: (id: string) => Promise<void>;
  markNotificationUnread: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  refetchNotifications: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null, connected: false, notifications: [], myNotifications: [], onlineUsers: [],
  chatMessages: [], chatNotifications: [], typingUser: null, conversationUpdated: null, unreadCount: 0,
  emit: () => {}, clearNotifications: () => {}, clearChatNotifications: () => {}, clearChatMessages: () => {},
  openChatTarget: null, setOpenChatTarget: () => {},
  markNotificationRead: async () => {}, markNotificationUnread: async () => {},
  deleteNotification: async () => {}, clearAllNotifications: async () => {}, refetchNotifications: async () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [myNotifications, setMyNotifications] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatNotifications, setChatNotifications] = useState<ChatNotification[]>([]);
  const [typingUser, setTypingUser] = useState<{ userId: string; name: string } | null>(null);
  const [conversationUpdated, setConversationUpdated] = useState<any>(null);
  const [openChatTarget, setOpenChatTarget] = useState<string | null>(null);

  const unreadCount = myNotifications.filter((n) => !n.read).length;

  const fetchMyNotifications = useCallback(async () => {
    try {
      const res = await api.get<any>('/user-notifications', { limit: '50' });
      if (res?.data?.notifications) {
        setMyNotifications(res.data.notifications);
      }
    } catch {}
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      await api.put(`/user-notifications/${id}/read`);
      setMyNotifications((prev) => prev.map((n) => (n._id === id || n.userNotificationId === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)));
    } catch {}
  }, []);

  const markNotificationUnread = useCallback(async (id: string) => {
    try {
      await api.put(`/user-notifications/${id}/unread`);
      setMyNotifications((prev) => prev.map((n) => (n._id === id || n.userNotificationId === id ? { ...n, read: false, readAt: undefined } : n)));
    } catch {}
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await api.delete(`/user-notifications/${id}`);
      setMyNotifications((prev) => prev.filter((n) => n._id !== id && n.userNotificationId !== id));
    } catch {}
  }, []);

  const clearAllNotifications = useCallback(async () => {
    try {
      await api.post('/user-notifications/clear-all');
      setMyNotifications([]);
    } catch {}
  }, []);

  useEffect(() => {
    const token = api.getToken();
    if (!token || !user) return;

    fetchMyNotifications();

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['polling', 'websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => console.error('Socket connect error:', err.message));

    const addNotification = (data: any) => {
      setNotifications((prev) => [data, ...prev].slice(0, 50));
    };

    const addMyNotification = (data: any) => {
      if (!data.userNotificationId) return;
      setMyNotifications((prev) => {
        if (prev.some((n) => n._id === data.userNotificationId)) return prev;
        return [{ ...data, _id: data.userNotificationId }, ...prev].slice(0, 50);
      });
    };

    socket.on('notification:received', (data: any) => {
      addMyNotification(data);
    });

    socket.on('alert:received', (data: any) => {
      addNotification({ type: 'alert', ...data });
    });

    socket.on('sos:emergency', (data: any) => {
      addNotification({ sender: data.sender || { name: data.from }, ...data });
      if (data.userNotificationId) addMyNotification(data);
    });

    socket.on('presence:online', (users: any[]) => {
      setOnlineUsers(users);
    });

    socket.on('presence:offline', ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== userId));
    });

    socket.on('chat:message', (msg: any) => {
      setChatMessages((prev) => [...prev, msg]);
      const from = msg.sender?.name || msg.from || 'Someone';
      const senderId = msg.sender?._id || '';
      addNotification({ type: 'chat', title: `Message from ${from}`, message: msg.message, createdAt: new Date().toISOString(), senderId, conversationId: senderId });
    });

    socket.on('chat:notification', (data: ChatNotification) => {
      setChatNotifications((prev) => [data, ...prev].slice(0, 20));
    });

    socket.on('chat:typing', (data: { userId: string; name: string }) => {
      setTypingUser(data);
      setTimeout(() => setTypingUser(null), 3000);
    });

    socket.on('chat:stopTyping', () => {
      setTypingUser(null);
    });

    socket.on('conversation:updated', (conv: any) => {
      setConversationUpdated(conv);
    });

    socket.on('messages:read', (data: { readBy: string; conversationId?: string }) => {
      setChatMessages((prev) => prev.map((m) => {
        if (m.sender?._id && String(m.sender._id) === data.readBy) return { ...m, read: true };
        return m;
      }));
    });

    socket.on('visitor:notification', (data: any) => {
      addNotification({ type: 'visitor', title: 'Visitor Update', message: data.message, createdAt: new Date().toISOString(), ...data });
    });

    socket.on('payment:notification', (data: any) => {
      addNotification({ type: 'payment', title: 'Payment Request', message: data.message, createdAt: new Date().toISOString(), ...data });
    });

    socket.on('announcement:notification', (data: any) => {
      addNotification({ type: 'announcement', title: data.title || 'Announcement', message: data.message, createdAt: new Date().toISOString(), ...data });
    });

    socket.on('reactivation:notification', (data: any) => {
      addNotification({ type: 'reactivation', title: 'Reactivation Request', message: data.message, createdAt: new Date().toISOString(), ...data });
    });

    socket.emit('presence:request');

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user?._id, fetchMyNotifications]);

  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const clearNotifications = useCallback(() => setNotifications([]), []);
  const clearChatNotifications = useCallback(() => setChatNotifications([]), []);
  const clearChatMessages = useCallback(() => setChatMessages([]), []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current, connected, notifications, myNotifications, onlineUsers,
      chatMessages, chatNotifications, typingUser, conversationUpdated, unreadCount,
      emit, clearNotifications, clearChatNotifications, clearChatMessages,
      openChatTarget, setOpenChatTarget,
      markNotificationRead, markNotificationUnread, deleteNotification, clearAllNotifications, refetchNotifications: fetchMyNotifications,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
