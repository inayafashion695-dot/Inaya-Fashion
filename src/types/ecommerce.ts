export interface ProductVariant {
  color: string;
  hex: string;
  image: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  category_name: string;
  description: string;
  regular_price: number;
  discount_price: number | null;
  images: string[];
  variants: ProductVariant[];
  sizes: string[];
  stock_quantity: number;
  is_available: boolean;
  is_featured: boolean;
  seo_title?: string;
  seo_description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface HeroBanner {
  id: string;
  image_url: string;
  alt: string;
  sort_order: number;
  is_active: boolean;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface SocialLinks {
  facebook: string;
  instagram: string;
  whatsapp: string;
  tiktok: string;
}

export interface HomepageSectionsConfig {
  show_featured: boolean;
  show_reviews: boolean;
  featured_title: string;
  featured_subtitle: string;
}

export interface SiteSettings {
  id: number;
  brand_name: string;
  logo_url: string;
  favicon_url: string;
  announcement_enabled: boolean;
  announcement_text: string;
  hero_banners: HeroBanner[];
  delivery_enabled: boolean;
  delivery_inside_dhaka: number;
  delivery_outside_dhaka: number;
  free_delivery_threshold: number;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  social_links: SocialLinks;
  footer_about: string;
  footer_links: FooterLink[];
  homepage_sections: HomepageSectionsConfig;
  seo_title: string;
  seo_description: string;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount: number;
  auto_apply_threshold: boolean;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  product_id: string;
  name: string;
  slug: string;
  image: string;
  color: string;
  size: string;
  quantity: number;
  unit_price: number;
  regular_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_zone: 'inside_dhaka' | 'outside_dhaka';
  items: OrderItem[];
  subtotal: number;
  product_discount: number;
  coupon_code: string | null;
  coupon_discount: number;
  threshold_discount: number;
  delivery_charge: number;
  total_amount: number;
  payment_method: string;
  status: OrderStatus;
  notes: string;
  steadfast_consignment_id: number | null;
  steadfast_tracking_code: string | null;
  steadfast_status: string | null;
  steadfast_sent_at: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CartItem {
  key: string;
  product_id: string;
  name: string;
  slug: string;
  image: string;
  color: string;
  size: string;
  quantity: number;
  unit_price: number;
  regular_price: number;
}

export interface ReviewItem {
  id: string;
  author: string;
  city: string;
  rating: number;
  product_name: string;
  comment: string;
  date_label: string;
}
