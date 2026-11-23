'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type { StaffProfile } from '@gulf/shared';
import { adminRequest, AdminApiError } from './api';
import type { Locale } from '@/lib/utils/locale';
type Session = { user: StaffProfile; expiresAt: string };
type AdminContext = {
  user: StaffProfile | null;
  status: 'loading' | 'ready' | 'anonymous' | 'error';
  locale: Locale;
  toggleLocale: () => void;
  refresh: () => Promise<void>;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<AdminContext | null>(null);
export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AdminContext['status']>('loading');
  const [locale, setLocale] = useState<Locale>('en');
  const refresh = useCallback(async () => {
    try {
      const data = await adminRequest<Session>('/auth/me');
      setSession(data);
      setStatus('ready');
    } catch (error) {
      setSession(null);
      setStatus(
        error instanceof AdminApiError && error.status === 401
          ? 'anonymous'
          : 'error',
      );
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 60000);
    const focus = () => void refresh();
    window.addEventListener('focus', focus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', focus);
    };
  }, [refresh]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(
      () => {
        setSession(null);
        setStatus('anonymous');
        router.replace('/admin/login');
      },
      Math.max(0, new Date(session.expiresAt).getTime() - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [session, router]);
  async function request<T>(path: string, options?: RequestInit) {
    try {
      return await adminRequest<T>(path, options);
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setSession(null);
        setStatus('anonymous');
        router.replace('/admin/login');
      }
      throw error;
    }
  }
  async function login(username: string, password: string) {
    const data = await adminRequest<Session>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setSession(data);
    setStatus('ready');
    router.replace(
      ['PHARMACIST', 'MEDICAL_REVIEWER'].includes(data.user.role)
        ? '/admin/videos'
        : '/admin/dashboard',
    );
  }
  async function logout() {
    try {
      await request('/auth/logout', { method: 'POST', body: '{}' });
    } catch (error) {
      if (!(error instanceof AdminApiError && error.status === 401))
        throw error;
    }
    setSession(null);
    setStatus('anonymous');
    router.replace('/admin/login');
    router.refresh();
  }
  return (
    <Context.Provider
      value={{
        user: session?.user ?? null,
        status,
        locale,
        toggleLocale: () => setLocale(locale === 'en' ? 'ar' : 'en'),
        refresh,
        request,
        login,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAdmin() {
  const value = useContext(Context);
  if (!value) throw new Error('AdminProvider is required');
  return value;
}
export function useText() {
  const { locale } = useAdmin();
  return (en: string, ar: string) => (locale === 'ar' ? ar : en);
}
