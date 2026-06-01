'use client';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import api from '@/lib/api';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'resident' | 'security' | 'admin';
  flatNumber?: string;
  tower?: string;
  houseCode?: string;
  isActive: boolean;
  isVerified?: boolean;
  profileImage?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  preferences?: { darkMode?: boolean; language?: string; notifications?: { email?: boolean; sms?: boolean; push?: boolean } };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Partial<User> & { password: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!api.getToken()) { setLoading(false); return; }
    try {
      const { data } = await api.get<{ success: boolean; data: { user: User } }>('/auth/me');
      setUser(data.user);
    } catch { api.setToken(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const { data } = await api.post<{ success: boolean; data: { user: User; token: string } }>('/auth/login', { email, password });
      api.setToken(data.token);
      localStorage.setItem('vg_role', data.user.role);
      setUser(data.user);
    } catch (err: any) { console.error('Login error:', err); setError(err.message); throw err; }
  };

  const register = async (formData: Partial<User> & { password: string }) => {
    setError(null);
    try {
      const { data: res } = await api.post<{ success: boolean; data: { user: User; token: string } }>('/auth/register', formData);
      api.setToken(res.token);
      localStorage.setItem('vg_role', res.user.role);
      setUser(res.user);
    } catch (err: any) { setError(err.message); throw err; }
  };

  const logout = () => { api.setToken(null); setUser(null); };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
