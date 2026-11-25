-- ============================================================================
-- INAYA FASHION — SUPABASE PRODUCTION SCHEMA & RLS POLICIES
-- Run this entire script once in your Supabase SQL Editor.
-- Project: vezcvhkrjnictksidjjn
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ADMIN USERS & ROLE HELPER
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

-- One-time initial admin claim RPC (only succeeds if admin_users table has 0 rows)
CREATE OR REPLACE FUNCTION public.claim_initial_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.admin_users;
  IF v_count > 0 THEN
    RETURN EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = v_uid);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO public.admin_users (user_id, email, role)
  VALUES (v_uid, COALESCE(v_email, 'admin@inayafashion.com'), 'super_admin')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN TRUE;
END;
$$;

DROP POLICY IF EXISTS "Admins can read admin_users" ON public.admin_users;
CREATE POLICY "Admins can read admin_users"
  ON public.admin_users FOR SELECT
  USING (public.is_admin());

-- 2. SITE SETTINGS (Singleton Row id = 1)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brand_name TEXT NOT NULL DEFAULT 'Inaya Fashion',
  logo_url TEXT NOT NULL DEFAULT '/assets/inaya-logo-transparent.png',
  favicon_url TEXT NOT NULL DEFAULT '/favicon.png',
  announcement_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  announcement_text TEXT NOT NULL DEFAULT 'Complimentary Nationwide Delivery on Orders Over ৳2,500  ·  New Winter Knitwear & Tailored Essentials  ·  Cash on Delivery Available',
  hero_banners JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  delivery_inside_dhaka NUMERIC(10,2) NOT NULL DEFAULT 70,
  delivery_outside_dhaka NUMERIC(10,2) NOT NULL DEFAULT 130,
  free_delivery_threshold NUMERIC(10,2) NOT NULL DEFAULT 2500,
  contact_phone TEXT NOT NULL DEFAULT '+880 1712-345678',
  contact_email TEXT NOT NULL DEFAULT 'inayafashion695@gmail.com',
  contact_address TEXT NOT NULL DEFAULT 'House 24, Road 11, Banani, Dhaka 1213, Bangladesh',
  social_links JSONB NOT NULL DEFAULT '{"facebook":"https://facebook.com","instagram":"https://instagram.com","whatsapp":"https://wa.me/8801712345678","tiktok":"https://tiktok.com"}'::jsonb,
  footer_about TEXT NOT NULL DEFAULT 'Refined knitwear and tailored silhouettes crafted for everyday elegance in Dhaka and beyond.',
  footer_links JSONB NOT NULL DEFAULT '[{"label":"Shop Collection","href":"#catalog"},{"label":"Track Order","href":"/track-order"},{"label":"Size & Fit Guide","href":"#catalog"},{"label":"Admin Studio","href":"/admin"}]'::jsonb,
  homepage_sections JSONB NOT NULL DEFAULT '{"show_featured":true,"show_reviews":true,"featured_title":"Signature Knitwear & Tailored Essentials","featured_subtitle":"Curated silhouettes in breathable ribbed knits and structured crepe."}'::jsonb,
  seo_title TEXT NOT NULL DEFAULT 'Inaya Fashion – Luxury Women''s Knitwear & Tailored Essentials',
  seo_description TEXT NOT NULL DEFAULT 'Shop Inaya Fashion for refined ribbed knit turtlenecks, V-neck tops, mock neck sweaters, and tailored flare leg pants with nationwide Cash on Delivery.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site_settings" ON public.site_settings;
CREATE POLICY "Public can read site_settings"
  ON public.site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update site_settings" ON public.site_settings;
CREATE POLICY "Admins can update site_settings"
  ON public.site_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active categories" ON public.categories;
CREATE POLICY "Public can read active categories"
  ON public.categories FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL DEFAULT 'Knitwear',
  description TEXT NOT NULL DEFAULT '',
  regular_price NUMERIC(10,2) NOT NULL CHECK (regular_price >= 0),
  discount_price NUMERIC(10,2) CHECK (discount_price IS NULL OR discount_price >= 0),
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  sizes JSONB NOT NULL DEFAULT '["S","M","L","XL"]'::jsonb,
  stock_quantity INT NOT NULL DEFAULT 25 CHECK (stock_quantity >= 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT TRUE,
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read available products" ON public.products;
CREATE POLICY "Public can read available products"
  ON public.products FOR SELECT
  USING (is_available = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. COUPONS & PURCHASE-BASED DISCOUNTS
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_purchase_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (min_purchase_amount >= 0),
  auto_apply_threshold BOOLEAN NOT NULL DEFAULT FALSE,
  max_uses INT DEFAULT NULL,
  used_count INT NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active coupons" ON public.coupons;
CREATE POLICY "Public can read active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  delivery_zone TEXT NOT NULL DEFAULT 'inside_dhaka' CHECK (delivery_zone IN ('inside_dhaka', 'outside_dhaka')),
  items JSONB NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  product_discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (product_discount >= 0),
  coupon_code TEXT DEFAULT NULL,
  coupon_discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (coupon_discount >= 0),
  threshold_discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (threshold_discount >= 0),
  delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (delivery_charge >= 0),
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL DEFAULT 'COD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  notes TEXT DEFAULT '',
  steadfast_consignment_id BIGINT DEFAULT NULL,
  steadfast_tracking_code TEXT DEFAULT NULL,
  steadfast_status TEXT DEFAULT NULL,
  steadfast_sent_at TIMESTAMPTZ DEFAULT NULL,
  steadfast_raw JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
CREATE POLICY "Public can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    char_length(customer_name) >= 2
    AND customer_name !~ '[0-9]'
    AND customer_phone ~ '^01[0-9]{9}$'
    AND char_length(customer_address) >= 5
    AND total_amount >= 0
  );

DROP POLICY IF EXISTS "Admins can read and manage orders" ON public.orders;
CREATE POLICY "Admins can read and manage orders"
  ON public.orders FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Safe public order tracking RPC (requires matching order_number AND phone digits)
CREATE OR REPLACE FUNCTION public.track_order_public(p_order_number TEXT, p_phone TEXT)
RETURNS TABLE (
  order_number TEXT,
  customer_name TEXT,
  delivery_zone TEXT,
  items JSONB,
  subtotal NUMERIC,
  coupon_discount NUMERIC,
  threshold_discount NUMERIC,
  delivery_charge NUMERIC,
  total_amount NUMERIC,
  status TEXT,
  steadfast_consignment_id BIGINT,
  steadfast_tracking_code TEXT,
  steadfast_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.order_number,
    o.customer_name,
    o.delivery_zone,
    o.items,
    o.subtotal,
    o.coupon_discount,
    o.threshold_discount,
    o.delivery_charge,
    o.total_amount,
    o.status,
    o.steadfast_consignment_id,
    o.steadfast_tracking_code,
    o.steadfast_status,
    o.created_at
  FROM public.orders o
  WHERE upper(trim(o.order_number)) = upper(trim(p_order_number))
    AND regexp_replace(o.customer_phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
  LIMIT 1;
$$;

-- 7. PUSH SUBSCRIPTIONS (Admin PWA notifications)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins can manage push_subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8. REALTIME ENABLEMENT FOR ADMIN LIVE ORDER ALERTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

-- 9. SEED INITIAL SETTINGS, CATEGORIES, CATALOG PRODUCTS & COUPONS
INSERT INTO public.site_settings (id, hero_banners)
VALUES (
  1,
  '[
    {"id":"banner-1","image_url":"/src/assets/images/hero_demo_converted_1795629000917.jpg","alt":"Inaya Fashion Golden Elegance Collection Showcase","sort_order":1,"is_active":true},
    {"id":"banner-2","image_url":"/src/assets/images/banner_turtleneck_edition_1795630517846.jpg","alt":"Inaya Fashion Women Ribbed Knit Turtleneck Sweater Collection","sort_order":2,"is_active":true},
    {"id":"banner-3","image_url":"/src/assets/images/banner_vneck_mockneck_edition_1795630517862.jpg","alt":"Inaya Fashion V-Neck and Mock Neck Sweater Collection","sort_order":3,"is_active":true},
    {"id":"banner-4","image_url":"/src/assets/images/banner_flare_collection_1795630518731.jpg","alt":"Inaya Fashion Tailored High-Waisted Flare Leg Pants Collection","sort_order":4,"is_active":true}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (name, slug, description, sort_order)
VALUES
  ('Knitwear', 'knitwear', 'Fine ribbed knit turtlenecks, V-neck tops, and mock neck sweaters.', 1),
  ('Trousers', 'trousers', 'High-waisted tailored flare leg pants crafted for clean drape.', 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (
  name, slug, category_id, category_name, description,
  regular_price, discount_price, images, variants, sizes, stock_quantity, is_available, is_featured,
  seo_title, seo_description
)
SELECT
  'Women''s Ribbed Knit Turtleneck Sweater',
  'womens-ribbed-knit-turtleneck-sweater',
  (SELECT id FROM public.categories WHERE slug = 'knitwear' LIMIT 1),
  'Knitwear',
  'Ultra-soft vertical ribbed knit turtleneck crafted with breathable stretch yarn for a sculpted, flattering fit. Ideal for layering under blazers or pairing cleanly with high-waisted trousers.',
  1450,
  1150,
  '["/assets/catalog/catalog_06.jpg","/assets/catalog/catalog_07.jpg","/assets/catalog/catalog_01.jpg","/assets/catalog/catalog_02.jpg","/assets/catalog/catalog_03.jpg","/assets/catalog/catalog_04.jpg","/assets/catalog/catalog_05.jpg"]'::jsonb,
  '[
    {"color":"Ivory Cream","hex":"#F3EFE6","image":"/assets/catalog/catalog_06.jpg","stock":18},
    {"color":"Deep Burgundy","hex":"#581822","image":"/assets/catalog/catalog_07.jpg","stock":14},
    {"color":"Heather Grey","hex":"#A2A5AA","image":"/assets/catalog/catalog_01.jpg","stock":16},
    {"color":"Midnight Navy","hex":"#172038","image":"/assets/catalog/catalog_02.jpg","stock":20},
    {"color":"Pure White","hex":"#F8F9FA","image":"/assets/catalog/catalog_03.jpg","stock":15},
    {"color":"Sky Blue","hex":"#6FAAD8","image":"/assets/catalog/catalog_04.jpg","stock":12},
    {"color":"Crimson Red","hex":"#B81D24","image":"/assets/catalog/catalog_05.jpg","stock":10}
  ]'::jsonb,
  '["S","M","L","XL"]'::jsonb,
  105,
  true,
  true,
  'Women''s Ribbed Knit Turtleneck Sweater | Inaya Fashion',
  'Shop Women''s Ribbed Knit Turtleneck Sweater in 7 refined shades. Soft stretch ribbed knit with Cash on Delivery across Bangladesh.'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (
  name, slug, category_id, category_name, description,
  regular_price, discount_price, images, variants, sizes, stock_quantity, is_available, is_featured,
  seo_title, seo_description
)
SELECT
  'V-Neck Sweater Top',
  'v-neck-sweater-top',
  (SELECT id FROM public.categories WHERE slug = 'knitwear' LIMIT 1),
  'Knitwear',
  'Refined fine-gauge ribbed V-neck sweater designed with a graceful neckline and tailored sleeve length. Transitions effortlessly from office hours to evening dinner.',
  1350,
  1090,
  '["/assets/catalog/catalog_08.jpg","/assets/catalog/catalog_09.jpg","/assets/catalog/catalog_10.jpg","/assets/catalog/catalog_11.jpg","/assets/catalog/catalog_12.jpg"]'::jsonb,
  '[
    {"color":"Wine Burgundy","hex":"#641C25","image":"/assets/catalog/catalog_08.jpg","stock":16},
    {"color":"Royal Blue","hex":"#1A438A","image":"/assets/catalog/catalog_09.jpg","stock":15},
    {"color":"Crimson Red","hex":"#A91E22","image":"/assets/catalog/catalog_10.jpg","stock":12},
    {"color":"Jet Black","hex":"#18181B","image":"/assets/catalog/catalog_11.jpg","stock":22},
    {"color":"Ivory Cream","hex":"#F2EFE6","image":"/assets/catalog/catalog_12.jpg","stock":14}
  ]'::jsonb,
  '["S","M","L","XL"]'::jsonb,
  79,
  true,
  true,
  'V-Neck Sweater Top | Inaya Fashion',
  'Elegant fine-knit V-Neck Sweater Top available in 5 rich tones. Tailored comfort and Cash on Delivery from Inaya Fashion.'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (
  name, slug, category_id, category_name, description,
  regular_price, discount_price, images, variants, sizes, stock_quantity, is_available, is_featured,
  seo_title, seo_description
)
SELECT
  'Mock Neck Sweater',
  'mock-neck-sweater',
  (SELECT id FROM public.categories WHERE slug = 'knitwear' LIMIT 1),
  'Knitwear',
  'Minimalist mock neck sweater featuring clean collar structuring and lightweight warmth. Designed for sleek everyday layering with wide-leg or flare trousers.',
  1400,
  1120,
  '["/assets/catalog/catalog_13.jpg","/assets/catalog/catalog_14.jpg","/assets/catalog/catalog_15.jpg","/assets/catalog/catalog_16.jpg"]'::jsonb,
  '[
    {"color":"Navy Blue","hex":"#1E2C4F","image":"/assets/catalog/catalog_13.jpg","stock":14},
    {"color":"Oatmeal Cream","hex":"#EBE4D8","image":"/assets/catalog/catalog_14.jpg","stock":18},
    {"color":"Jet Black","hex":"#161618","image":"/assets/catalog/catalog_15.jpg","stock":20},
    {"color":"Pure White","hex":"#F7F7F7","image":"/assets/catalog/catalog_16.jpg","stock":15}
  ]'::jsonb,
  '["S","M","L","XL"]'::jsonb,
  67,
  true,
  true,
  'Mock Neck Sweater | Inaya Fashion',
  'Minimalist Mock Neck Sweater in Navy, Oatmeal Cream, Jet Black, and Pure White. Premium soft knitwear by Inaya Fashion.'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (
  name, slug, category_id, category_name, description,
  regular_price, discount_price, images, variants, sizes, stock_quantity, is_available, is_featured,
  seo_title, seo_description
)
SELECT
  'Flare Leg Pants',
  'flare-leg-pants',
  (SELECT id FROM public.categories WHERE slug = 'trousers' LIMIT 1),
  'Trousers',
  'High-waisted tailored flare leg pants engineered for an elongating silhouette with structured stretch fabric that holds its crisp crease all day.',
  1650,
  1290,
  '["/assets/catalog/catalog_18.jpg","/assets/catalog/catalog_19.jpg","/assets/catalog/catalog_17.jpg","/assets/catalog/catalog_20.jpg","/assets/catalog/catalog_21.jpg","/assets/catalog/catalog_22.jpg"]'::jsonb,
  '[
    {"color":"Warm Beige","hex":"#EDE0CC","image":"/assets/catalog/catalog_18.jpg","stock":20},
    {"color":"Espresso Brown","hex":"#4A3429","image":"/assets/catalog/catalog_19.jpg","stock":16},
    {"color":"Jet Black","hex":"#141416","image":"/assets/catalog/catalog_17.jpg","stock":24},
    {"color":"Heather Grey","hex":"#8E9297","image":"/assets/catalog/catalog_20.jpg","stock":14},
    {"color":"Pure White","hex":"#F5F5F4","image":"/assets/catalog/catalog_21.jpg","stock":12},
    {"color":"Wine Maroon","hex":"#581720","image":"/assets/catalog/catalog_22.jpg","stock":14}
  ]'::jsonb,
  '["26","28","30","32","34"]'::jsonb,
  100,
  true,
  true,
  'Flare Leg Pants | Inaya Fashion',
  'High-waisted tailored Flare Leg Pants in 6 signature colors. Flattering elongating fit with Cash on Delivery across Bangladesh.'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.coupons (code, title, discount_type, discount_value, min_purchase_amount, auto_apply_threshold, max_uses, is_active)
VALUES
  ('INAYA10', '10% Welcome Savings', 'percentage', 10, 1000, false, 500, true),
  ('SPEND2500', 'Spend ৳2,500+ Save ৳200 Automatically', 'fixed', 200, 2500, true, NULL, true)
ON CONFLICT (code) DO NOTHING;
