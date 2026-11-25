import {
  DEFAULT_CATEGORIES,
  DEFAULT_COUPONS,
  DEFAULT_PRODUCTS,
  DEFAULT_SITE_SETTINGS,
} from '../data/catalogSeed';
import type {
  Category,
  Coupon,
  Order,
  OrderStatus,
  Product,
  SiteSettings,
} from '../types/ecommerce';
import { CLOUDINARY_CLOUD_NAME, SUPABASE_URL, supabase } from './supabase';

const PUBLIC_API_BASE = (import.meta.env.VITE_PUBLIC_API_BASE || '').replace(/\/$/, '');

function apiUrl(path: string): string {
  return `${PUBLIC_API_BASE}${path}`;
}

export interface StorefrontBootstrap {
  settings: SiteSettings;
  categories: Category[];
  products: Product[];
  coupons: Coupon[];
  source: 'supabase' | 'server_fallback';
}

export async function fetchStorefrontBootstrap(): Promise<StorefrontBootstrap> {
  // 1. Try direct Supabase public read first (works on both Node server & GitHub Pages!)
  try {
    const [settingsRes, categoriesRes, productsRes, couponsRes] = await Promise.all([
      supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('products').select('*').eq('is_available', true).order('created_at', { ascending: false }),
      supabase.from('coupons').select('*').eq('is_active', true),
    ]);

    if (!settingsRes.error && !productsRes.error && productsRes.data && productsRes.data.length > 0) {
      return {
        settings: (settingsRes.data as SiteSettings) || DEFAULT_SITE_SETTINGS,
        categories: (categoriesRes.data as Category[])?.length ? (categoriesRes.data as Category[]) : DEFAULT_CATEGORIES,
        products: productsRes.data as Product[],
        coupons: (couponsRes.data as Coupon[]) || DEFAULT_COUPONS,
        source: 'supabase',
      };
    }
  } catch {
    // Fall through to server bootstrap
  }

  // 2. Fallback to Express backend bootstrap (or static catalog seed on pure static hosting)
  try {
    const res = await fetch(apiUrl('/api/storefront/bootstrap'));
    if (res.ok) {
      const data = await res.json();
      return {
        settings: data.settings || DEFAULT_SITE_SETTINGS,
        categories: data.categories || DEFAULT_CATEGORIES,
        products: data.products || DEFAULT_PRODUCTS,
        coupons: data.coupons || DEFAULT_COUPONS,
        source: 'server_fallback',
      };
    }
  } catch {
    // Static fallback
  }

  return {
    settings: DEFAULT_SITE_SETTINGS,
    categories: DEFAULT_CATEGORIES,
    products: DEFAULT_PRODUCTS,
    coupons: DEFAULT_COUPONS,
    source: 'server_fallback',
  };
}

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  division?: string;
  delivery_zone: 'inside_dhaka' | 'outside_dhaka';
  coupon_code?: string;
  notes?: string;
  items: {
    product_id: string;
    color: string;
    size: string;
    quantity: number;
    // Snapshot fallback if using client seed
    name?: string;
    slug?: string;
    image?: string;
    unit_price?: number;
    regular_price?: number;
  }[];
}

export async function submitCustomerOrder(payload: CreateOrderInput): Promise<Order> {
  // Prefer Express server route when available (validates totals server-side & fires admin SSE push)
  try {
    const res = await fetch(apiUrl('/api/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      return json.order as Order;
    }
    const errJson = await res.json().catch(() => null);
    if (errJson?.error && res.status >= 400 && res.status < 500) {
      throw new Error(errJson.error);
    }
  } catch (err) {
    if (err instanceof Error && err.message && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  // Direct Supabase insert fallback (for static GitHub Pages deployment)
  const orderNumber = `INY-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  const itemsSnapshot = payload.items.map((i) => ({
    product_id: i.product_id,
    name: i.name || 'Inaya Fashion Item',
    slug: i.slug || '',
    image: i.image || '',
    color: i.color,
    size: i.size,
    quantity: i.quantity,
    unit_price: i.unit_price || 0,
    regular_price: i.regular_price || i.unit_price || 0,
  }));

  const subtotal = itemsSnapshot.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_name: payload.customer_name.trim(),
      customer_phone: payload.customer_phone.trim(),
      customer_address: payload.customer_address.trim(),
      delivery_zone: payload.delivery_zone,
      items: itemsSnapshot,
      subtotal,
      product_discount: 0,
      coupon_code: payload.coupon_code || null,
      coupon_discount: 0,
      threshold_discount: 0,
      delivery_charge: payload.delivery_zone === 'inside_dhaka' ? 70 : 130,
      total_amount: subtotal + (payload.delivery_zone === 'inside_dhaka' ? 70 : 130),
      payment_method: 'COD',
      status: 'pending',
      notes: payload.notes || '',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to place order. Please ensure database tables are initialized.');
  }
  return data as Order;
}

export async function trackCustomerOrder(orderNumber: string, phone: string): Promise<Order | null> {
  // Try server endpoint first
  try {
    const res = await fetch(
      apiUrl(`/api/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`)
    );
    if (res.ok) {
      const json = await res.json();
      if (json.order) return json.order as Order;
    }
  } catch {
    // Fallback to Supabase RPC
  }

  const { data, error } = await supabase.rpc('track_order_public', {
    p_order_number: orderNumber,
    p_phone: phone,
  });
  if (error || !data || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as Order;
}

// ---------------- ADMIN API HELPERS ----------------

async function getAdminAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function adminSignIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function adminSignUpAndClaim(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (data.session) {
    await supabase.rpc('claim_initial_admin');
  }
  return data;
}

export async function verifyAdminAccess(): Promise<{ isAdmin: boolean; email: string | null; needsSchemaSetup?: boolean }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { isAdmin: false, email: null };

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, email, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    // Likely schema not run yet
    return { isAdmin: false, email: user.email || null, needsSchemaSetup: error.code === '42P01' };
  }

  if (!data) {
    // Attempt initial one-time claim if zero admins exist
    const { data: claimed } = await supabase.rpc('claim_initial_admin');
    if (claimed === true) {
      return { isAdmin: true, email: user.email || null };
    }
    return { isAdmin: false, email: user.email || null };
  }

  return { isAdmin: true, email: data.email };
}

export async function adminFetchAllData(): Promise<{
  orders: Order[];
  products: Product[];
  categories: Category[];
  coupons: Coupon[];
  settings: SiteSettings;
}> {
  const [ordRes, prodRes, catRes, coupRes, setRes] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: false }),
    supabase.from('products').select('*').order('created_at', { ascending: false }),
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('coupons').select('*').order('created_at', { ascending: false }),
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
  ]);

  if (!ordRes.error && !prodRes.error && prodRes.data) {
    return {
      orders: (ordRes.data as Order[]) || [],
      products: (prodRes.data as Product[]) || [],
      categories: (catRes.data as Category[]) || DEFAULT_CATEGORIES,
      coupons: (coupRes.data as Coupon[]) || DEFAULT_COUPONS,
      settings: (setRes.data as SiteSettings) || DEFAULT_SITE_SETTINGS,
    };
  }

  // Fallback to Express backend store when Supabase SQL isn't run yet
  const headers = await getAdminAuthHeaders();
  const res = await fetch(apiUrl('/api/admin/bootstrap'), { headers });
  if (res.ok) {
    return await res.json();
  }

  return {
    orders: [],
    products: DEFAULT_PRODUCTS,
    categories: DEFAULT_CATEGORIES,
    coupons: DEFAULT_COUPONS,
    settings: DEFAULT_SITE_SETTINGS,
  };
}

export async function adminUpdateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select('*')
    .single();
  if (!error && data) return data as Order;

  const headers = await getAdminAuthHeaders();
  const res = await fetch(apiUrl(`/api/admin/orders/${orderId}/status`), {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update order status');
  return json.order;
}

export async function adminSaveProduct(product: Partial<Product> & { id?: string }): Promise<Product> {
  const cleanPayload = {
    name: product.name,
    slug: product.slug,
    category_id: product.category_id || null,
    category_name: product.category_name || 'Knitwear',
    description: product.description || '',
    regular_price: Number(product.regular_price),
    discount_price: product.discount_price ? Number(product.discount_price) : null,
    images: product.images || [],
    variants: product.variants || [],
    sizes: product.sizes || ['S', 'M', 'L', 'XL'],
    stock_quantity: Number(product.stock_quantity ?? 20),
    is_available: product.is_available ?? true,
    is_featured: product.is_featured ?? true,
    seo_title: product.seo_title || '',
    seo_description: product.seo_description || '',
    updated_at: new Date().toISOString(),
  };

  if (product.id && !product.id.startsWith('prod-')) {
    const { data, error } = await supabase
      .from('products')
      .update(cleanPayload)
      .eq('id', product.id)
      .select('*')
      .single();
    if (!error && data) return data as Product;
  } else {
    const { data, error } = await supabase
      .from('products')
      .insert(cleanPayload)
      .select('*')
      .single();
    if (!error && data) return data as Product;
  }

  const headers = await getAdminAuthHeaders();
  const res = await fetch(apiUrl('/api/admin/products'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...cleanPayload, id: product.id }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to save product');
  return json.product;
}

export async function adminDeleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (!error) return;
  const headers = await getAdminAuthHeaders();
  await fetch(apiUrl(`/api/admin/products/${id}`), { method: 'DELETE', headers });
}

export async function adminSaveCategory(category: Partial<Category> & { id?: string }): Promise<Category> {
  const payload = {
    name: category.name,
    slug: category.slug,
    description: category.description || '',
    sort_order: Number(category.sort_order ?? 0),
    is_active: category.is_active ?? true,
  };
  if (category.id && !category.id.startsWith('cat-')) {
    const { data, error } = await supabase.from('categories').update(payload).eq('id', category.id).select('*').single();
    if (!error && data) return data as Category;
  } else {
    const { data, error } = await supabase.from('categories').insert(payload).select('*').single();
    if (!error && data) return data as Category;
  }
  const headers = await getAdminAuthHeaders();
  const res = await fetch(apiUrl('/api/admin/categories'), { method: 'POST', headers, body: JSON.stringify({ ...payload, id: category.id }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to save category');
  return json.category;
}

export async function adminDeleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (!error) return;
  const headers = await getAdminAuthHeaders();
  await fetch(apiUrl(`/api/admin/categories/${id}`), { method: 'DELETE', headers });
}

export async function adminSaveCoupon(coupon: Partial<Coupon> & { id?: string }): Promise<Coupon> {
  const payload = {
    code: (coupon.code || '').trim().toUpperCase(),
    title: coupon.title || '',
    discount_type: coupon.discount_type || 'percentage',
    discount_value: Number(coupon.discount_value || 0),
    min_purchase_amount: Number(coupon.min_purchase_amount || 0),
    auto_apply_threshold: Boolean(coupon.auto_apply_threshold),
    max_uses: coupon.max_uses ? Number(coupon.max_uses) : null,
    expires_at: coupon.expires_at || null,
    is_active: coupon.is_active ?? true,
  };
  if (coupon.id && !coupon.id.startsWith('coupon-')) {
    const { data, error } = await supabase.from('coupons').update(payload).eq('id', coupon.id).select('*').single();
    if (!error && data) return data as Coupon;
  } else {
    const { data, error } = await supabase.from('coupons').insert(payload).select('*').single();
    if (!error && data) return data as Coupon;
  }
  const headers = await getAdminAuthHeaders();
  const res = await fetch(apiUrl('/api/admin/coupons'), { method: 'POST', headers, body: JSON.stringify({ ...payload, id: coupon.id }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to save coupon');
  return json.coupon;
}

export async function adminDeleteCoupon(id: string) {
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  if (!error) return;
  const headers = await getAdminAuthHeaders();
  await fetch(apiUrl(`/api/admin/coupons/${id}`), { method: 'DELETE', headers });
}

export async function adminSaveSiteSettings(settings: SiteSettings): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .upsert({ ...settings, id: 1, updated_at: new Date().toISOString() })
    .select('*')
    .single();
  if (!error && data) return data as SiteSettings;

  const headers = await getAdminAuthHeaders();
  const res = await fetch(apiUrl('/api/admin/settings'), {
    method: 'PUT',
    headers,
    body: JSON.stringify(settings),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to save settings');
  return json.settings;
}

// Signed Cloudinary upload (secrets stay strictly on server or Edge Function)
export async function uploadImageToCloudinary(file: File, folder = 'inaya-fashion'): Promise<string> {
  const headers = await getAdminAuthHeaders();

  let signData: { signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string } | null = null;

  try {
    const res = await fetch(apiUrl('/api/cloudinary/sign'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ folder }),
    });
    if (res.ok) {
      signData = await res.json();
    } else if (res.status === 503) {
      const err = await res.json();
      throw new Error(err.error);
    }
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  // Edge Function fallback for static GitHub Pages hosting
  if (!signData) {
    const edgeRes = await fetch(`${SUPABASE_URL}/functions/v1/cloudinary-sign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ folder }),
    });
    if (!edgeRes.ok) {
      const err = await edgeRes.json().catch(() => ({}));
      throw new Error(err.error || 'Cloudinary signing endpoint unavailable. Configure CLOUDINARY_API_KEY & CLOUDINARY_API_SECRET on your server or Edge Function.');
    }
    signData = await edgeRes.json();
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signData!.apiKey);
  formData.append('timestamp', String(signData!.timestamp));
  formData.append('signature', signData!.signature);
  formData.append('folder', signData!.folder);

  const cloudName = signData!.cloudName || CLOUDINARY_CLOUD_NAME;
  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok || !uploadJson.secure_url) {
    throw new Error(uploadJson?.error?.message || 'Cloudinary upload failed');
  }
  return uploadJson.secure_url as string;
}

// Steadfast Courier secure server proxy (with Edge Function fallback for GitHub Pages)
async function callSteadfast<T>(
  serverPath: string,
  method: 'GET' | 'POST',
  edgeBody: Record<string, unknown>,
  serverBody?: Record<string, unknown>
): Promise<T> {
  const headers = await getAdminAuthHeaders();
  try {
    const res = await fetch(apiUrl(serverPath), {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(serverBody || {}) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) return json as T;
    if (res.status !== 404) {
      throw new Error(json.error || `Steadfast request failed (${res.status})`);
    }
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  const edgeRes = await fetch(`${SUPABASE_URL}/functions/v1/steadfast-proxy`, {
    method: 'POST',
    headers,
    body: JSON.stringify(edgeBody),
  });
  const edgeJson = await edgeRes.json().catch(() => ({}));
  if (!edgeRes.ok) {
    throw new Error(edgeJson.error || 'Steadfast API request failed');
  }
  return edgeJson as T;
}

export async function dispatchOrderToSteadfast(orderId: string): Promise<{ order: Order }> {
  return callSteadfast('/api/steadfast/create-order', 'POST', { action: 'create_order', orderId }, { orderId });
}

export async function syncSteadfastStatus(orderId: string, consignmentId: number): Promise<{ delivery_status?: string }> {
  return callSteadfast(
    `/api/steadfast/status/${consignmentId}?orderId=${encodeURIComponent(orderId)}`,
    'GET',
    { action: 'status', orderId, consignmentId }
  );
}

export async function getSteadfastBalance(): Promise<{ current_balance?: number; status?: number }> {
  return callSteadfast('/api/steadfast/balance', 'GET', { action: 'balance' });
}

export async function pingSteadfast(): Promise<{ status?: string | number; message?: string }> {
  return callSteadfast('/api/steadfast/ping', 'GET', { action: 'ping' });
}
