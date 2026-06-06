'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator && 'PushManager' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
    api.get<{ success: boolean; data: { publicKey: string } }>('/push/vapid-public-key')
      .then((res) => setVapidKey(res.data.publicKey))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!vapidKey || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => setSubscribed(sub !== null));
    });
  }, [vapidKey]);

  const subscribe = useCallback(async () => {
    if (permission === 'unsupported' || !vapidKey) return;
    setLoading(true);
    try {
      let perm = Notification.permission;
      if (perm === 'default') {
        perm = await Notification.requestPermission();
        setPermission(perm);
      }
      if (perm !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const subJSON = sub.toJSON() as PushSubscriptionJSON;
      await api.post('/push/subscribe', {
        endpoint: subJSON.endpoint,
        keys: subJSON.keys,
      });
      setSubscribed(true);
    } catch (err) {
      console.error('Push subscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, [permission, vapidKey]);

  const unsubscribe = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const subJSON = sub.toJSON() as PushSubscriptionJSON;
        await api.post('/push/unsubscribe', { endpoint: subJSON.endpoint });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const testPush = useCallback(async () => {
    try {
      await api.post('/push/test', { title: 'Test Notification', body: 'This is a test push from VisionGate!' });
    } catch (err) {
      console.error('Test push error:', err);
    }
  }, []);

  return { permission, subscribed, loading, subscribe, unsubscribe, testPush };
}
