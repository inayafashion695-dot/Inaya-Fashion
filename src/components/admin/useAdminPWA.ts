import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface IncomingOrderAlert {
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  createdAt: string;
}

export function useAdminPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Inject admin-only manifest and register /admin service worker ONLY while inside /admin
  useEffect(() => {
    const addedElements: HTMLElement[] = [];

    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/admin-manifest.json';
      document.head.appendChild(link);
      addedElements.push(link);
    }

    const ensureMeta = (name: string, content: string) => {
      if (!document.querySelector(`meta[name="${name}"]`)) {
        const meta = document.createElement('meta');
        meta.name = name;
        meta.content = content;
        document.head.appendChild(meta);
        addedElements.push(meta);
      }
    };

    ensureMeta('mobile-web-app-capable', 'yes');
    ensureMeta('apple-mobile-web-app-capable', 'yes');
    ensureMeta('apple-mobile-web-app-title', 'Inaya Admin');
    ensureMeta('robots', 'noindex, nofollow');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw-admin.js', { scope: '/admin' })
        .then((reg) => setSwRegistration(reg))
        .catch(() => undefined);
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      for (const el of addedElements) {
        el.remove();
      }
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const requestNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied' as NotificationPermission;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    return perm;
  }, []);

  const triggerOrderNotification = useCallback(
    async (alert: IncomingOrderAlert) => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const title = `New Order #${alert.orderNumber}`;
      const body = `${alert.customerName} placed a ৳${Math.round(alert.totalAmount).toLocaleString()} COD order.`;

      try {
        const reg = swRegistration || (await navigator.serviceWorker?.getRegistration('/admin'));
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `order-${alert.orderNumber}`,
            data: { url: '/admin' },
          });
          return;
        }
      } catch {
        // Fallback to Notification constructor
      }

      try {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          tag: `order-${alert.orderNumber}`,
        });
      } catch {
        // Ignore blocked notifications
      }
    },
    [swRegistration]
  );

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    notifPermission,
    installApp,
    requestNotifications,
    triggerOrderNotification,
  };
}

export function useLiveOrderAlerts(
  enabled: boolean,
  onOrderReceived: (alert: IncomingOrderAlert) => void
) {
  const seenOrders = useRef(new Set<string>());
  const callbackRef = useRef(onOrderReceived);
  callbackRef.current = onOrderReceived;

  useEffect(() => {
    if (!enabled) return;

    const emitUnique = (alert: IncomingOrderAlert) => {
      if (!alert.orderNumber || seenOrders.current.has(alert.orderNumber)) return;
      seenOrders.current.add(alert.orderNumber);
      callbackRef.current(alert);
    };

    // 1. Supabase Realtime listener for orders INSERT
    const channel = supabase
      .channel('admin-new-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const row = payload.new as {
            order_number?: string;
            customer_name?: string;
            total_amount?: number;
            created_at?: string;
          };
          if (row?.order_number) {
            emitUnique({
              orderNumber: row.order_number,
              customerName: row.customer_name || 'Customer',
              totalAmount: Number(row.total_amount || 0),
              createdAt: row.created_at || new Date().toISOString(),
            });
          }
        }
      )
      .subscribe();

    // 2. Express SSE stream fallback (for instant alerts when using local/Node backend)
    let eventSource: EventSource | null = null;
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      const base = (import.meta.env.VITE_PUBLIC_API_BASE || '').replace(/\/$/, '');
      try {
        eventSource = new EventSource(`${base}/api/admin/events?token=${encodeURIComponent(token)}`);
        eventSource.addEventListener('new_order', (evt) => {
          try {
            const parsed = JSON.parse((evt as MessageEvent).data) as IncomingOrderAlert;
            emitUnique(parsed);
          } catch {
            // Ignore malformed SSE payload
          }
        });
      } catch {
        // Ignore if SSE unavailable (e.g. static GitHub Pages)
      }
    });

    return () => {
      supabase.removeChannel(channel);
      if (eventSource) eventSource.close();
    };
  }, [enabled]);
}
