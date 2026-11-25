import { useCallback, useEffect, useState } from 'react';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AnnouncementBar } from './components/storefront/AnnouncementBar';
import { CartDrawer } from './components/storefront/CartDrawer';
import { CheckoutModal } from './components/storefront/CheckoutModal';
import { CustomerReviewsSection } from './components/storefront/CustomerReviewsSection';
import { HeroBannerCarousel } from './components/storefront/HeroBannerCarousel';
import {
  ProductCatalogSection,
  type SortOption,
} from './components/storefront/ProductCatalogSection';
import { ProductDetailPage } from './components/storefront/ProductDetailPage';
import { SeoHead } from './components/storefront/SeoHead';
import { StoreFooter } from './components/storefront/StoreFooter';
import { StoreHeader } from './components/storefront/StoreHeader';
import { TrackOrderPage } from './components/storefront/TrackOrderPage';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_COUPONS,
  DEFAULT_PRODUCTS,
  DEFAULT_SITE_SETTINGS,
} from './data/catalogSeed';
import { fetchStorefrontBootstrap } from './lib/api';
import { trackAddToCart } from './lib/metaPixel';
import type {
  CartItem,
  Category,
  Coupon,
  Product,
  SiteSettings,
} from './types/ecommerce';

const CART_STORAGE_KEY = 'inaya_fashion_bag_v1';

export default function App() {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname || '/');
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [coupons, setCoupons] = useState<Coupon[]>(DEFAULT_COUPONS);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [trackOrderInit, setTrackOrderInit] = useState<string>('');

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const loadStorefront = useCallback(async () => {
    const data = await fetchStorefrontBootstrap();
    setSettings(data.settings);
    setCategories(data.categories);
    setProducts(data.products);
    setCoupons(data.coupons);
  }, []);

  useEffect(() => {
    loadStorefront();
  }, [loadStorefront]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname || '/');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname) return;
    window.history.pushState({}, '', to);
    setPathname(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const addItemToCart = (
    product: Product,
    color: string,
    size: string,
    quantity: number,
    image: string,
    openCheckoutDirectly = false
  ) => {
    const unitPrice =
      product.discount_price && product.discount_price > 0
        ? product.discount_price
        : product.regular_price;
    const key = `${product.id}__${color}__${size}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...prev,
        {
          key,
          product_id: product.id,
          name: product.name,
          slug: product.slug,
          image: image || product.images[0] || '',
          color,
          size,
          quantity,
          unit_price: Number(unitPrice),
          regular_price: Number(product.regular_price),
        },
      ];
    });

    trackAddToCart({ id: product.id, name: product.name, price: Number(unitPrice), quantity });

    if (openCheckoutDirectly) {
      setCartOpen(false);
      setCheckoutOpen(true);
    } else {
      setCartOpen(true);
    }
  };

  const handleUpdateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.key === key ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  // Route: /admin (PWA-enabled mobile-first admin studio)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <AdminDashboard
        initialSettings={settings}
        onSettingsSynced={(next) => setSettings(next)}
        onCatalogChanged={loadStorefront}
        onExitToStore={() => navigate('/')}
      />
    );
  }

  // Route: /product/:slug
  const productSlugMatch = pathname.match(/^\/product\/([^/]+)\/?$/);
  const activeProduct = productSlugMatch
    ? products.find((p) => p.slug === decodeURIComponent(productSlugMatch[1])) || null
    : null;

  const isTrackOrder = pathname === '/track-order' || pathname === '/track-order/';
  const totalCartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#141210]">
      {!activeProduct && !isTrackOrder && <SeoHead settings={settings} />}

      <AnnouncementBar
        enabled={settings.announcement_enabled}
        text={settings.announcement_text}
      />

      <StoreHeader
        settings={settings}
        categories={categories}
        cartCount={totalCartCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCart={() => setCartOpen(true)}
        onNavigate={navigate}
        onSelectCategory={setSelectedCategory}
      />

      <div className="flex-1">
        {activeProduct ? (
          <ProductDetailPage
            product={activeProduct}
            relatedProducts={products.filter((p) => p.id !== activeProduct.id && p.is_available)}
            settings={settings}
            onBack={() => navigate('/')}
            onOpenProduct={(slug) => navigate(`/product/${slug}`)}
            onAddToCart={(prod, color, size, qty, img) =>
              addItemToCart(prod, color, size, qty, img, false)
            }
            onBuyNow={(prod, color, size, qty, img) =>
              addItemToCart(prod, color, size, qty, img, true)
            }
          />
        ) : isTrackOrder ? (
          <TrackOrderPage
            settings={settings}
            initialOrderNumber={trackOrderInit}
            onBack={() => navigate('/')}
          />
        ) : (
          <main>
            <HeroBannerCarousel banners={settings.hero_banners} />

            <ProductCatalogSection
              settings={settings}
              products={products}
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onOpenProduct={(slug) => navigate(`/product/${slug}`)}
              onQuickAdd={(prod, color, img) =>
                addItemToCart(prod, color, prod.sizes[0] || 'M', 1, img, false)
              }
            />

            <CustomerReviewsSection visible={settings.homepage_sections.show_reviews} />
          </main>
        )}
      </div>

      <StoreFooter settings={settings} onNavigate={navigate} />

      <CartDrawer
        open={cartOpen}
        items={cart}
        settings={settings}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        items={cart}
        coupons={coupons}
        settings={settings}
        onClose={() => setCheckoutOpen(false)}
        onOrderSuccess={() => {
          setCart([]);
        }}
        onTrackOrder={(orderNumber) => {
          setTrackOrderInit(orderNumber);
          navigate('/track-order');
        }}
      />
    </div>
  );
}
