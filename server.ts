import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_COUPONS,
  DEFAULT_PRODUCTS,
  DEFAULT_SITE_SETTINGS,
} from './src/data/catalogSeed.ts';
import { calculateOrderBreakdown } from './src/lib/pricing.ts';
import type {
  Category,
  Coupon,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  SiteSettings,
} from './src/types/ecommerce.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://vezcvhkrjnictksidjjn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_fV1dah4ZLW9JmKkeVFhvWQ_nUlwN3nb';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
const CLOUDINARY_CLOUD_NAME = process.env.VITE_CLOUDINARY_CLOUD_NAME || 'gvgfo2mf';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const STEADFAST_API_KEY = process.env.STEADFAST_API_KEY || '';
const STEADFAST_SECRET_KEY = process.env.STEADFAST_SECRET_KEY || '';
const STEADFAST_BASE = 'https://portal.packzy.com/api/v1';

// In-memory runtime fallback store when Supabase SQL tables haven't been initialized yet
const memoryStore: {
  settings: SiteSettings;
  categories: Category[];
  products: Product[];
  coupons: Coupon[];
  orders: Order[];
} = {
  settings: structuredClone(DEFAULT_SITE_SETTINGS),
  categories: structuredClone(DEFAULT_CATEGORIES),
  products: structuredClone(DEFAULT_PRODUCTS),
  coupons: structuredClone(DEFAULT_COUPONS),
  orders: [],
};

// Connected SSE admin listeners for real-time order push notifications
const adminSseClients = new Set<express.Response>();

function broadcastNewOrderEvent(order: Order) {
  const payload = JSON.stringify({
    type: 'NEW_ORDER',
    orderNumber: order.order_number,
    customerName: order.customer_name,
    totalAmount: order.total_amount,
    createdAt: order.created_at,
  });
  for (const res of adminSseClients) {
    res.write(`event: new_order\ndata: ${payload}\n\n`);
  }
}

function getServiceSupabase(): SupabaseClient | null {
  if (!SUPABASE_SECRET_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
}

function getUserScopedSupabase(token: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

async function verifyAdminRequest(
  req: express.Request
): Promise<{ ok: boolean; status: number; error?: string; client?: SupabaseClient }> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return { ok: false, status: 401, error: 'Admin authentication token required' };
  }

  const userClient = getUserScopedSupabase(token);
  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();

  if (authErr || !user) {
    return { ok: false, status: 401, error: 'Invalid or expired admin session' };
  }

  const serviceClient = getServiceSupabase();
  const lookupClient = serviceClient || userClient;
  const { data: adminRow, error: roleErr } = await lookupClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roleErr && roleErr.code !== '42P01') {
    return { ok: false, status: 403, error: 'Unable to verify admin privileges' };
  }

  if (!adminRow) {
    // Allow first-time bootstrap only if admin_users table is empty
    const { data: claimed } = await userClient.rpc('claim_initial_admin');
    if (claimed !== true) {
      return { ok: false, status: 403, error: 'Account is not authorized as an admin' };
    }
  }

  return { ok: true, status: 200, client: serviceClient || userClient };
}

function sanitizeSteadfastText(input: string, maxLen: number): string {
  return String(input || '')
    .replace(/[{<>};$]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

async function getAuthoritativeCatalog(client?: SupabaseClient | null) {
  const sb = client || getServiceSupabase() || createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  try {
    const [setRes, catRes, prodRes, coupRes] = await Promise.all([
      sb.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      sb.from('categories').select('*').order('sort_order', { ascending: true }),
      sb.from('products').select('*').order('created_at', { ascending: false }),
      sb.from('coupons').select('*'),
    ]);
    if (!prodRes.error && prodRes.data && prodRes.data.length > 0) {
      return {
        fromSupabase: true,
        settings: (setRes.data as SiteSettings) || memoryStore.settings,
        categories: (catRes.data as Category[]) || memoryStore.categories,
        products: prodRes.data as Product[],
        coupons: (coupRes.data as Coupon[]) || memoryStore.coupons,
      };
    }
  } catch {
    // Fallback to memoryStore
  }
  return {
    fromSupabase: false,
    settings: memoryStore.settings,
    categories: memoryStore.categories,
    products: memoryStore.products,
    coupons: memoryStore.coupons,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      integrations: {
        supabaseUrl: SUPABASE_URL,
        supabaseServiceConfigured: Boolean(SUPABASE_SECRET_KEY),
        cloudinaryConfigured: Boolean(CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET),
        steadfastConfigured: Boolean(STEADFAST_API_KEY && STEADFAST_SECRET_KEY),
      },
    });
  });

  app.get('/api/storefront/bootstrap', async (_req, res) => {
    const data = await getAuthoritativeCatalog();
    res.json({
      settings: data.settings,
      categories: data.categories.filter((c) => c.is_active),
      products: data.products.filter((p) => p.is_available),
      coupons: data.coupons.filter((c) => c.is_active),
      source: data.fromSupabase ? 'supabase' : 'memory_seed',
    });
  });

  // Public customer checkout endpoint (recalculates prices & discounts server-side)
  app.post('/api/orders', async (req, res) => {
    try {
      const { customer_name, customer_phone, customer_address, division, delivery_zone, coupon_code, notes, items } =
        req.body || {};

      const cleanName = String(customer_name || '').trim();
      if (cleanName.length < 2) {
        return res.status(400).json({ error: 'Please enter your full name.' });
      }
      if (/\d/.test(cleanName)) {
        return res.status(400).json({ error: 'Customer name cannot contain numbers.' });
      }

      const cleanPhone = String(customer_phone || '').replace(/\D/g, '');
      if (!/^01\d{9}$/.test(cleanPhone)) {
        return res.status(400).json({
          error: 'Phone number must be exactly 11 digits and start with 01.',
        });
      }

      if (!customer_address || String(customer_address).trim().length < 5) {
        return res.status(400).json({ error: 'Please enter your full delivery address.' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Your shopping bag is empty.' });
      }

      // Derive delivery zone automatically from Division when supplied
      const zone: 'inside_dhaka' | 'outside_dhaka' = division
        ? String(division).trim().toLowerCase() === 'dhaka'
          ? 'inside_dhaka'
          : 'outside_dhaka'
        : delivery_zone === 'outside_dhaka'
          ? 'outside_dhaka'
          : 'inside_dhaka';

      const catalog = await getAuthoritativeCatalog();
      const verifiedItems: OrderItem[] = [];

      for (const rawItem of items) {
        const qty = Math.max(1, Math.min(50, Math.floor(Number(rawItem.quantity || 1))));
        const prod = catalog.products.find((p) => p.id === rawItem.product_id || p.slug === rawItem.slug);
        if (!prod || !prod.is_available) {
          return res.status(400).json({ error: `Product unavailable: ${rawItem.name || rawItem.product_id}` });
        }
        const unitPrice = prod.discount_price && prod.discount_price > 0 ? prod.discount_price : prod.regular_price;
        const matchedVariant = prod.variants.find((v) => v.color === rawItem.color);
        verifiedItems.push({
          product_id: prod.id,
          name: prod.name,
          slug: prod.slug,
          image: matchedVariant?.image || prod.images[0] || '',
          color: String(rawItem.color || matchedVariant?.color || 'Default').slice(0, 60),
          size: String(rawItem.size || prod.sizes[0] || 'Free').slice(0, 20),
          quantity: qty,
          unit_price: Number(unitPrice),
          regular_price: Number(prod.regular_price),
        });
      }

      const pricing = calculateOrderBreakdown({
        items: verifiedItems,
        coupons: catalog.coupons,
        couponCode: coupon_code,
        deliveryZone: zone,
        settings: catalog.settings,
      });

      const orderNumber = `INY-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

      const orderPayload = {
        order_number: orderNumber,
        customer_name: String(customer_name).trim().slice(0, 100),
        customer_phone: cleanPhone,
        customer_address: String(customer_address).trim().slice(0, 480),
        delivery_zone: zone,
        items: verifiedItems,
        subtotal: pricing.subtotal,
        product_discount: pricing.productDiscount,
        coupon_code: pricing.appliedCouponCode,
        coupon_discount: pricing.couponDiscount,
        threshold_discount: pricing.thresholdDiscount,
        delivery_charge: pricing.deliveryCharge,
        total_amount: pricing.totalAmount,
        payment_method: 'COD',
        status: 'pending' as OrderStatus,
        notes: String(notes || '').trim().slice(0, 400),
      };

      const sb = getServiceSupabase() || createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
      const { data: inserted, error: insErr } = await sb
        .from('orders')
        .insert(orderPayload)
        .select('*')
        .single();

      if (!insErr && inserted) {
        // Increment coupon used_count when service key is active
        if (pricing.appliedCouponCode && getServiceSupabase()) {
          const usedCoupon = catalog.coupons.find((c) => c.code === pricing.appliedCouponCode);
          if (usedCoupon) {
            await sb
              .from('coupons')
              .update({ used_count: usedCoupon.used_count + 1 })
              .eq('id', usedCoupon.id);
          }
        }
        const createdOrder = inserted as Order;
        broadcastNewOrderEvent(createdOrder);
        return res.status(201).json({ order: createdOrder });
      }

      // Fallback when Supabase SQL has not yet been executed
      const fallbackOrder: Order = {
        id: crypto.randomUUID(),
        ...orderPayload,
        steadfast_consignment_id: null,
        steadfast_tracking_code: null,
        steadfast_status: null,
        steadfast_sent_at: null,
        created_at: new Date().toISOString(),
      };
      memoryStore.orders.unshift(fallbackOrder);
      broadcastNewOrderEvent(fallbackOrder);
      return res.status(201).json({ order: fallbackOrder });
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Order creation failed' });
    }
  });

  app.get('/api/orders/track', async (req, res) => {
    const orderNumber = String(req.query.orderNumber || '').trim();
    const phone = String(req.query.phone || '').replace(/\D/g, '');
    if (!orderNumber || !phone) {
      return res.status(400).json({ error: 'Order ID and Phone Number are required' });
    }

    const sb = getServiceSupabase() || createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { data, error } = await sb.rpc('track_order_public', {
      p_order_number: orderNumber,
      p_phone: phone,
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      return res.json({ order: data[0] });
    }

    const memOrder = memoryStore.orders.find(
      (o) =>
        o.order_number.toUpperCase() === orderNumber.toUpperCase() &&
        o.customer_phone.replace(/\D/g, '') === phone
    );
    if (memOrder) {
      return res.json({ order: memOrder });
    }
    return res.status(404).json({ error: 'No matching order found' });
  });

  // Admin SSE live new-order stream
  app.get('/api/admin/events', async (req, res) => {
    const token = String(req.query.token || '');
    const authCheck = await verifyAdminRequest({
      ...req,
      headers: { ...req.headers, authorization: token ? `Bearer ${token}` : req.headers.authorization },
    } as express.Request);

    if (!authCheck.ok) {
      return res.status(authCheck.status).json({ error: authCheck.error });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write('event: connected\ndata: {"status":"listening"}\n\n');

    adminSseClients.add(res);
    const keepAlive = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      adminSseClients.delete(res);
    });
  });

  // Admin fallback bootstrap & CRUD (when Supabase SQL tables aren't initialized yet)
  app.get('/api/admin/bootstrap', async (req, res) => {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    res.json({
      orders: memoryStore.orders,
      products: memoryStore.products,
      categories: memoryStore.categories,
      coupons: memoryStore.coupons,
      settings: memoryStore.settings,
    });
  });

  app.patch('/api/admin/orders/:id/status', async (req, res) => {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    const status = String(req.body?.status || '') as OrderStatus;
    const ord = memoryStore.orders.find((o) => o.id === req.params.id);
    if (!ord) return res.status(404).json({ error: 'Order not found' });
    ord.status = status;
    ord.updated_at = new Date().toISOString();
    res.json({ order: ord });
  });

  app.post('/api/admin/products', async (req, res) => {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    const payload = req.body as Product;
    const existingIdx = memoryStore.products.findIndex((p) => p.id === payload.id);
    if (existingIdx >= 0) {
      memoryStore.products[existingIdx] = { ...memoryStore.products[existingIdx], ...payload };
      return res.json({ product: memoryStore.products[existingIdx] });
    }
    const created: Product = { ...payload, id: payload.id || crypto.randomUUID(), created_at: new Date().toISOString() };
    memoryStore.products.unshift(created);
    res.json({ product: created });
  });

  app.delete('/api/admin/products/:id', async (req, res) => {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    memoryStore.products = memoryStore.products.filter((p) => p.id !== req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/admin/categories', async (req, res) => {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    const payload = req.body as Category;
    const idx = memoryStore.categories.findIndex((c) => c.id === payload.id);
    if (idx >= 0) {
      memoryStore.categories[idx] = { ...memoryStore.categories[idx], ...payload };
      return res.json({ category: memoryStore.categories[idx] });
    }
    const created = { ...payload, id: payload.id || crypto.randomUUID() };
    memoryStore.categories.push(created);
    res.json({ category: created });
  });

  app.delete('/api/admin/categories/:id', async (req, res) => {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    memoryStore.categories = memoryStore.categories.filter((c) => c.id !== req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/admin/coupons', async (req, res) => {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    const payload = req.body as Coupon;
    const idx = memoryStore.coupons.findIndex((c) => c.id === payload.id);
    if (idx >= 0) {
      memoryStore.coupons[idx] = { ...memoryStore.coupons[idx], ...payload };
      return res.json({ coupon: memoryStore.coupons[idx] });
    }
    const created: Coupon = { ...payload, id: payload.id || crypto.randomUUID(), used_count: 0 };
    memoryStore.coupons.unshift(created);
    res.json({ coupon: created });
  });

  app.delete('/api/admin/coupons/:id', async (req, res) => {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    memoryStore.coupons = memoryStore.coupons.filter((c) => c.id !== req.params.id);
    res.json({ ok: true });
  });

  app.put('/api/admin/settings', async (req, res) => {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    memoryStore.settings = { ...memoryStore.settings, ...req.body, id: 1 };
    res.json({ settings: memoryStore.settings });
  });

  // Cloudinary signed upload endpoint (keeps API secret strictly server-side)
  app.post('/api/cloudinary/sign', async (req, res) => {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return res.status(503).json({
        error: 'CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are not set in server environment secrets.',
      });
    }

    const rawFolder = String(req.body?.folder || 'inaya-fashion');
    const folder = /^[a-zA-Z0-9/_-]+$/.test(rawFolder) ? rawFolder : 'inaya-fashion';
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    res.json({
      signature,
      timestamp,
      apiKey: CLOUDINARY_API_KEY,
      cloudName: CLOUDINARY_CLOUD_NAME,
      folder,
    });
  });

  // Steadfast Courier secure backend proxy endpoints
  app.get('/api/steadfast/ping', async (req, res) => {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!STEADFAST_API_KEY || !STEADFAST_SECRET_KEY) {
      return res.status(503).json({
        error: 'STEADFAST_API_KEY and STEADFAST_SECRET_KEY are not yet set in server secrets.',
      });
    }
    const sfRes = await fetch(`${STEADFAST_BASE}/ping`, {
      headers: { 'Api-Key': STEADFAST_API_KEY, 'Secret-Key': STEADFAST_SECRET_KEY },
    });
    const data = await sfRes.json().catch(() => ({ status: sfRes.status }));
    res.status(sfRes.status).json(data);
  });

  app.get('/api/steadfast/balance', async (req, res) => {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!STEADFAST_API_KEY || !STEADFAST_SECRET_KEY) {
      return res.status(503).json({
        error: 'STEADFAST_API_KEY and STEADFAST_SECRET_KEY are not yet set in server secrets.',
      });
    }
    const sfRes = await fetch(`${STEADFAST_BASE}/get_balance`, {
      headers: { 'Api-Key': STEADFAST_API_KEY, 'Secret-Key': STEADFAST_SECRET_KEY },
    });
    const data = await sfRes.json().catch(() => ({}));
    res.status(sfRes.status).json(data);
  });

  app.post('/api/steadfast/create-order', async (req, res) => {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok || !auth.client) return res.status(auth.status).json({ error: auth.error });

    if (!STEADFAST_API_KEY || !STEADFAST_SECRET_KEY) {
      return res.status(503).json({
        error: 'STEADFAST_API_KEY and STEADFAST_SECRET_KEY are not yet configured in server environment secrets.',
      });
    }

    const orderId = String(req.body?.orderId || '').trim();
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    // Load order from Supabase or memoryStore
    let order: Order | null = null;
    let usingSupabase = false;
    const { data: sbOrder, error: sbErr } = await auth.client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (!sbErr && sbOrder) {
      order = sbOrder as Order;
      usingSupabase = true;
    } else {
      order = memoryStore.orders.find((o) => o.id === orderId) || null;
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.steadfast_consignment_id) {
      return res.status(409).json({
        error: `Order already submitted to Steadfast (Consignment #${order.steadfast_consignment_id}). Duplicate submission blocked.`,
      });
    }

    const itemsSummary = order.items
      .map((i) => `${i.name} (${i.color}/${i.size}) x${i.quantity}`)
      .join(', ');

    const payload = {
      invoice: sanitizeSteadfastText(order.order_number, 100),
      recipient_name: sanitizeSteadfastText(order.customer_name, 100),
      recipient_phone: sanitizeSteadfastText(order.customer_phone, 40),
      recipient_address: sanitizeSteadfastText(order.customer_address, 490),
      cod_amount: Math.round(Number(order.total_amount) || 0),
      note: sanitizeSteadfastText(`${order.notes ? order.notes + ' | ' : ''}${itemsSummary}`, 480),
    };

    const sfRes = await fetch(`${STEADFAST_BASE}/create_order`, {
      method: 'POST',
      headers: {
        'Api-Key': STEADFAST_API_KEY,
        'Secret-Key': STEADFAST_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const sfJson = await sfRes.json().catch(() => ({}));
    if (!sfRes.ok || sfJson.status !== 200 || !sfJson.consignment) {
      return res.status(sfRes.status >= 400 ? sfRes.status : 400).json({
        error: sfJson.message || 'Steadfast order submission failed',
        details: sfJson,
      });
    }

    const consignment = sfJson.consignment;
    const patch = {
      steadfast_consignment_id: Number(consignment.consignment_id),
      steadfast_tracking_code: String(consignment.tracking_code || ''),
      steadfast_status: String(consignment.status || 'in_review'),
      steadfast_sent_at: new Date().toISOString(),
      status: (order.status === 'pending' ? 'shipped' : order.status) as OrderStatus,
      updated_at: new Date().toISOString(),
    };

    if (usingSupabase) {
      const { data: updated, error: updErr } = await auth.client
        .from('orders')
        .update({ ...patch, steadfast_raw: consignment })
        .eq('id', order.id)
        .select('*')
        .single();
      if (updErr) return res.status(500).json({ error: updErr.message });
      return res.json({ order: updated, consignment });
    }

    Object.assign(order, patch);
    res.json({ order, consignment });
  });

  app.get('/api/steadfast/status/:consignmentId', async (req, res) => {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok || !auth.client) return res.status(auth.status).json({ error: auth.error });
    if (!STEADFAST_API_KEY || !STEADFAST_SECRET_KEY) {
      return res.status(503).json({
        error: 'STEADFAST_API_KEY and STEADFAST_SECRET_KEY are not yet configured in server environment secrets.',
      });
    }

    const cid = encodeURIComponent(req.params.consignmentId);
    const sfRes = await fetch(`${STEADFAST_BASE}/status_by_cid/${cid}`, {
      headers: { 'Api-Key': STEADFAST_API_KEY, 'Secret-Key': STEADFAST_SECRET_KEY },
    });
    const data = await sfRes.json().catch(() => ({}));

    const orderId = String(req.query.orderId || '');
    if (sfRes.ok && data.delivery_status && orderId) {
      await auth.client
        .from('orders')
        .update({ steadfast_status: data.delivery_status, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      const memOrd = memoryStore.orders.find((o) => o.id === orderId);
      if (memOrd) memOrd.steadfast_status = data.delivery_status;
    }

    res.status(sfRes.status).json(data);
  });

  // Dynamic SEO Sitemap & Robots
  app.get('/sitemap.xml', async (req, res) => {
    const baseUrl =
      process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const catalog = await getAuthoritativeCatalog();
    const urls = [
      `<url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      `<url><loc>${baseUrl}/track-order</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
      ...catalog.products
        .filter((p) => p.is_available)
        .map(
          (p) =>
            `<url><loc>${baseUrl}/product/${encodeURIComponent(
              p.slug
            )}</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`
        ),
    ];
    res.setHeader('Content-Type', 'application/xml');
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
        '\n'
      )}\n</urlset>`
    );
  });

  app.get('/robots.txt', (req, res) => {
    const baseUrl =
      process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${baseUrl}/sitemap.xml\n`);
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    // Inject admin-only PWA manifest tags ONLY when requesting /admin
    app.use(async (req, res, next) => {
      if (
        req.method === 'GET' &&
        (req.path === '/admin' || req.path.startsWith('/admin/')) &&
        !req.path.includes('.')
      ) {
        try {
          let html = fs.readFileSync(path.resolve('index.html'), 'utf-8');
          html = await vite.transformIndexHtml(req.originalUrl, html);
          const adminMeta = `
    <link rel="manifest" href="/admin-manifest.json" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Inaya Admin" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="robots" content="noindex, nofollow" />`;
          html = html.replace('</head>', `${adminMeta}\n  </head>`);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
          return;
        } catch (err) {
          vite.ssrFixStacktrace(err as Error);
        }
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve('dist');
    app.use(express.static(distDir));
    app.get('/admin*', (_req, res) => {
      const adminHtml = path.join(distDir, 'admin', 'index.html');
      res.sendFile(fs.existsSync(adminHtml) ? adminHtml : path.join(distDir, 'index.html'));
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Inaya Fashion server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
