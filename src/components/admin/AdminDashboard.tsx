import {
  Bell,
  Download,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { adminFetchAllData, verifyAdminAccess } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type {
  Category,
  Coupon,
  Order,
  Product,
  SiteSettings,
} from '../../types/ecommerce';
import { AdminAuthScreen } from './AdminAuthScreen';
import { AdminOrdersTab } from './AdminOrdersTab';
import { AdminProductsTab } from './AdminProductsTab';
import { AdminPromosTab } from './AdminPromosTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import { useAdminPWA, useLiveOrderAlerts, type IncomingOrderAlert } from './useAdminPWA';

type AdminTab = 'overview' | 'orders' | 'products' | 'promos' | 'settings';

interface AdminDashboardProps {
  initialSettings: SiteSettings;
  onSettingsSynced: (settings: SiteSettings) => void;
  onCatalogChanged: () => void;
  onExitToStore: () => void;
}

export function AdminDashboard({
  initialSettings,
  onSettingsSynced,
  onCatalogChanged,
  onExitToStore,
}: AdminDashboardProps) {
  const pwa = useAdminPWA();
  const [authState, setAuthState] = useState<'checking' | 'unauthenticated' | 'authorized'>('checking');
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);

  const showToast = useCallback((msg: string, isError = false) => {
    setToast({ msg, isError });
    window.setTimeout(() => {
      setToast((prev) => (prev?.msg === msg ? null : prev));
    }, 3600);
  }, []);

  const loadDashboardData = useCallback(async () => {
    const data = await adminFetchAllData();
    setOrders(data.orders);
    setProducts(data.products);
    setCategories(data.categories);
    setCoupons(data.coupons);
    setSettings(data.settings);
    onSettingsSynced(data.settings);
  }, [onSettingsSynced]);

  const checkAuth = useCallback(async () => {
    setAuthState('checking');
    setAuthError(null);
    const res = await verifyAdminAccess();
    if (res.isAdmin) {
      setAdminEmail(res.email);
      setAuthState('authorized');
      await loadDashboardData();
    } else {
      if (res.email && !res.needsSchemaSetup) {
        setAuthError(
          `Signed in as ${res.email}, but this account is not listed in admin_users.`
        );
      }
      setAuthState('unauthenticated');
    }
  }, [loadDashboardData]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleIncomingOrder = useCallback(
    (alert: IncomingOrderAlert) => {
      showToast(`New Order #${alert.orderNumber} from ${alert.customerName} (৳${Math.round(alert.totalAmount).toLocaleString()})`);
      pwa.triggerOrderNotification(alert);
      loadDashboardData();
    },
    [loadDashboardData, pwa, showToast]
  );

  useLiveOrderAlerts(authState === 'authorized', handleIncomingOrder);

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-sm text-[#575148]">
        Verifying Admin Session...
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <AdminAuthScreen
        brandLogo={settings.logo_url}
        brandName={settings.brand_name}
        initialError={authError}
        onSuccess={checkAuth}
        onBackToStore={onExitToStore}
      />
    );
  }

  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const dispatchedCount = orders.filter((o) => Boolean(o.steadfast_consignment_id)).length;

  const navItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'promos', label: 'Promos', icon: Tag },
    { id: 'settings', label: 'Studio', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#141210] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-[#EAE4DA] p-5 justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <img
              src={settings.logo_url}
              alt={settings.brand_name}
              referrerPolicy="no-referrer"
              className="h-9 w-auto object-contain"
            />
          </div>

          <nav className="space-y-1" aria-label="Admin navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-colors ${
                    active
                      ? 'bg-[#141210] text-white'
                      : 'text-[#575148] hover:bg-[#FAF8F5] hover:text-[#141210]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-[#E6C885]' : ''}`} />
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'orders' && pendingCount > 0 && (
                    <span className="text-xs font-mono tabular-nums px-1.5 py-0.5 rounded bg-[#B6862C] text-white">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 pt-4 border-t border-[#EAE4DA]">
          <button
            type="button"
            onClick={onExitToStore}
            className="w-full min-h-[40px] px-3 rounded-xl border border-[#EAE4DA] text-xs font-medium text-[#141210] flex items-center justify-center gap-2 hover:bg-[#FAF8F5]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Live Store</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              setAuthState('unauthenticated');
            }}
            className="w-full min-h-[40px] px-3 rounded-xl text-xs font-medium text-red-700 flex items-center justify-center gap-2 hover:bg-red-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen pb-24 lg:pb-10">
        {/* Compact Mobile-First Sticky App Bar (56px height) */}
        <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-[#EAE4DA] px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="lg:hidden font-display text-xl font-semibold text-[#141210] truncate">
              {settings.brand_name}
            </span>
            <span className="hidden lg:inline text-sm font-semibold text-[#141210] capitalize">
              {tab === 'settings' ? 'Website Customization' : tab}
            </span>
            {adminEmail && (
              <span className="hidden sm:inline text-xs text-[#7D756B] truncate">
                · {adminEmail}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!pwa.isInstalled && (pwa.isInstallable || pwa.isIOS) && (
              <button
                type="button"
                onClick={() => (pwa.isIOS ? setShowIOSGuide(true) : pwa.installApp())}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#141210] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#E6C885]" />
                <span>Install App</span>
              </button>
            )}

            {pwa.notifPermission !== 'granted' && (
              <button
                type="button"
                onClick={pwa.requestNotifications}
                aria-label="Enable push notifications"
                className="min-h-[38px] min-w-[38px] px-2.5 rounded-xl border border-[#EAE4DA] text-[#8C6218] flex items-center justify-center"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onExitToStore}
              className="lg:hidden min-h-[38px] px-2.5 rounded-xl border border-[#EAE4DA] text-xs font-medium text-[#141210] flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Store</span>
            </button>
          </div>
        </header>

        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-16 right-4 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg bg-[#141210] text-white text-xs font-medium border border-[#B6862C]">
            {toast.msg}
          </div>
        )}

        <main className="p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6">
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* 4 KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4">
                  <p className="text-xs text-[#575148]">Total Revenue</p>
                  <p className="mt-1.5 text-2xl font-bold text-[#141210] tabular-nums">
                    ৳{Math.round(totalRevenue).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4">
                  <p className="text-xs text-[#575148]">Total Orders</p>
                  <p className="mt-1.5 text-2xl font-bold text-[#141210] tabular-nums">
                    {orders.length}
                  </p>
                </div>
                <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4">
                  <p className="text-xs text-[#575148]">Pending Orders</p>
                  <p className="mt-1.5 text-2xl font-bold text-[#8C6218] tabular-nums">
                    {pendingCount}
                  </p>
                </div>
                <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4">
                  <p className="text-xs text-[#575148]">Steadfast Parcels</p>
                  <p className="mt-1.5 text-2xl font-bold text-[#141210] tabular-nums">
                    {dispatchedCount}
                  </p>
                </div>
              </div>

              {/* Quick Actions & Recent Orders */}
              <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#141210]">Recent Orders</h2>
                  <button
                    type="button"
                    onClick={() => setTab('orders')}
                    className="text-xs font-semibold text-[#8C6218]"
                  >
                    Manage All Orders →
                  </button>
                </div>

                {orders.length === 0 ? (
                  <p className="text-xs text-[#575148] py-4">
                    No customer orders recorded yet. Orders placed on the storefront appear here immediately.
                  </p>
                ) : (
                  <div className="divide-y divide-[#F1ECE4]">
                    {orders.slice(0, 6).map((o) => (
                      <div key={o.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#141210] truncate">
                            {o.customer_name}
                          </p>
                          <p className="text-xs text-[#575148] font-mono">
                            {o.order_number} · {o.status}
                          </p>
                        </div>
                        <span className="text-sm font-bold tabular-nums">
                          ৳{Math.round(o.total_amount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'orders' && (
            <AdminOrdersTab
              orders={orders}
              settings={settings}
              onOrderUpdated={(updated) =>
                setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
              }
              onToast={showToast}
            />
          )}

          {tab === 'products' && (
            <AdminProductsTab
              products={products}
              categories={categories}
              onProductsChanged={(next) => {
                setProducts(next);
                onCatalogChanged();
              }}
              onCategoriesChanged={(next) => {
                setCategories(next);
                onCatalogChanged();
              }}
              onToast={showToast}
            />
          )}

          {tab === 'promos' && (
            <AdminPromosTab
              coupons={coupons}
              settings={settings}
              onCouponsChanged={(next) => {
                setCoupons(next);
                onCatalogChanged();
              }}
              onSettingsChanged={(next) => {
                setSettings(next);
                onSettingsSynced(next);
              }}
              onToast={showToast}
            />
          )}

          {tab === 'settings' && (
            <AdminSettingsTab
              settings={settings}
              onSettingsChanged={(next) => {
                setSettings(next);
                onSettingsSynced(next);
              }}
              onToast={showToast}
              pwa={pwa}
            />
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (App-Style Thumb Zone) */}
      <nav
        aria-label="Mobile admin navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-[#EAE4DA] grid grid-cols-5 items-center"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`h-full flex flex-col items-center justify-center gap-0.5 relative ${
                active ? 'text-[#141210]' : 'text-[#7D756B]'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-[#8C6218]' : ''}`} />
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
              {item.id === 'orders' && pendingCount > 0 && (
                <span className="absolute top-1.5 right-3 min-w-[16px] h-4 px-1 rounded-full bg-[#B6862C] text-white text-[9px] font-mono flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* iOS Safari Install Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-3">
            <h3 className="text-base font-semibold text-[#141210]">Install Inaya Admin on iOS</h3>
            <p className="text-xs text-[#575148] leading-relaxed">
              1. Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.
              <br />
              2. Scroll down and select <strong>Add to Home Screen</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full min-h-[42px] rounded-xl bg-[#141210] text-white text-xs font-semibold"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
