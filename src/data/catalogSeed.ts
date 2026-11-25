import type { Category, Coupon, Product, ReviewItem, SiteSettings } from '../types/ecommerce';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: 1,
  brand_name: 'Inaya Fashion',
  logo_url: '/assets/inaya-logo-transparent.png',
  favicon_url: '/favicon.png',
  announcement_enabled: true,
  announcement_text:
    'Complimentary Nationwide Delivery on Orders Over ৳2,500  ·  New Winter Knitwear & Tailored Essentials  ·  Cash on Delivery Across Bangladesh',
  hero_banners: [
    {
      id: 'banner-1',
      image_url: '/src/assets/images/hero_demo_converted_1795629000917.jpg',
      alt: 'Inaya Fashion Golden Elegance Collection Showcase',
      sort_order: 1,
      is_active: true,
    },
    {
      id: 'banner-2',
      image_url: '/src/assets/images/banner_turtleneck_edition_1795630517846.jpg',
      alt: 'Inaya Fashion Women Ribbed Knit Turtleneck Sweater Collection',
      sort_order: 2,
      is_active: true,
    },
    {
      id: 'banner-3',
      image_url: '/src/assets/images/banner_vneck_mockneck_edition_1795630517862.jpg',
      alt: 'Inaya Fashion V-Neck and Mock Neck Sweater Collection',
      sort_order: 3,
      is_active: true,
    },
    {
      id: 'banner-4',
      image_url: '/src/assets/images/banner_flare_collection_1795630518731.jpg',
      alt: 'Inaya Fashion Tailored High-Waisted Flare Leg Pants Collection',
      sort_order: 4,
      is_active: true,
    },
  ],
  delivery_enabled: true,
  delivery_inside_dhaka: 70,
  delivery_outside_dhaka: 130,
  free_delivery_threshold: 2500,
  contact_phone: '+880 1712-345678',
  contact_email: 'inayafashion695@gmail.com',
  contact_address: 'House 24, Road 11, Banani, Dhaka 1213, Bangladesh',
  social_links: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    whatsapp: 'https://wa.me/8801712345678',
    tiktok: 'https://tiktok.com',
  },
  footer_about:
    'Refined knitwear and tailored silhouettes crafted for everyday elegance in Dhaka and nationwide.',
  footer_links: [
    { label: 'Shop Collection', href: '#catalog' },
    { label: 'Track Order', href: '/track-order' },
    { label: 'Customer Notes', href: '#reviews' },
    { label: 'Admin Studio', href: '/admin' },
  ],
  homepage_sections: {
    show_featured: true,
    show_reviews: true,
    featured_title: 'Signature Knitwear & Tailored Essentials',
    featured_subtitle: 'Curated silhouettes in soft ribbed knits and structured flare tailoring.',
  },
  seo_title: "Inaya Fashion – Luxury Women's Knitwear & Tailored Essentials",
  seo_description:
    'Shop Inaya Fashion for refined ribbed knit turtlenecks, V-neck tops, mock neck sweaters, and tailored flare leg pants with nationwide Cash on Delivery.',
};

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-knitwear',
    name: 'Knitwear',
    slug: 'knitwear',
    description: 'Fine ribbed knit turtlenecks, V-neck tops, and mock neck sweaters.',
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'cat-trousers',
    name: 'Trousers',
    slug: 'trousers',
    description: 'High-waisted tailored flare leg pants crafted for clean drape.',
    sort_order: 2,
    is_active: true,
  },
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-turtleneck',
    name: "Women's Ribbed Knit Turtleneck Sweater",
    slug: 'womens-ribbed-knit-turtleneck-sweater',
    category_id: 'cat-knitwear',
    category_name: 'Knitwear',
    description:
      'Ultra-soft vertical ribbed knit turtleneck crafted with breathable stretch yarn for a sculpted, flattering fit. Ideal for layering under blazers or pairing cleanly with high-waisted trousers.',
    regular_price: 1450,
    discount_price: 1150,
    images: [
      '/assets/catalog/catalog_06.jpg',
      '/assets/catalog/catalog_07.jpg',
      '/assets/catalog/catalog_01.jpg',
      '/assets/catalog/catalog_02.jpg',
      '/assets/catalog/catalog_03.jpg',
      '/assets/catalog/catalog_04.jpg',
      '/assets/catalog/catalog_05.jpg',
    ],
    variants: [
      { color: 'Ivory Cream', hex: '#F3EFE6', image: '/assets/catalog/catalog_06.jpg', stock: 18 },
      { color: 'Deep Burgundy', hex: '#581822', image: '/assets/catalog/catalog_07.jpg', stock: 14 },
      { color: 'Heather Grey', hex: '#A2A5AA', image: '/assets/catalog/catalog_01.jpg', stock: 16 },
      { color: 'Midnight Navy', hex: '#172038', image: '/assets/catalog/catalog_02.jpg', stock: 20 },
      { color: 'Pure White', hex: '#F8F9FA', image: '/assets/catalog/catalog_03.jpg', stock: 15 },
      { color: 'Sky Blue', hex: '#6FAAD8', image: '/assets/catalog/catalog_04.jpg', stock: 12 },
      { color: 'Crimson Red', hex: '#B81D24', image: '/assets/catalog/catalog_05.jpg', stock: 10 },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    stock_quantity: 105,
    is_available: true,
    is_featured: true,
    seo_title: "Women's Ribbed Knit Turtleneck Sweater | Inaya Fashion",
    seo_description:
      "Shop Women's Ribbed Knit Turtleneck Sweater in 7 refined shades. Soft stretch ribbed knit with Cash on Delivery across Bangladesh.",
  },
  {
    id: 'prod-vneck',
    name: 'V-Neck Sweater Top',
    slug: 'v-neck-sweater-top',
    category_id: 'cat-knitwear',
    category_name: 'Knitwear',
    description:
      'Refined fine-gauge ribbed V-neck sweater designed with a graceful neckline and tailored sleeve length. Transitions effortlessly from office hours to evening dinner.',
    regular_price: 1350,
    discount_price: 1090,
    images: [
      '/assets/catalog/catalog_08.jpg',
      '/assets/catalog/catalog_09.jpg',
      '/assets/catalog/catalog_10.jpg',
      '/assets/catalog/catalog_11.jpg',
      '/assets/catalog/catalog_12.jpg',
    ],
    variants: [
      { color: 'Wine Burgundy', hex: '#641C25', image: '/assets/catalog/catalog_08.jpg', stock: 16 },
      { color: 'Royal Blue', hex: '#1A438A', image: '/assets/catalog/catalog_09.jpg', stock: 15 },
      { color: 'Crimson Red', hex: '#A91E22', image: '/assets/catalog/catalog_10.jpg', stock: 12 },
      { color: 'Jet Black', hex: '#18181B', image: '/assets/catalog/catalog_11.jpg', stock: 22 },
      { color: 'Ivory Cream', hex: '#F2EFE6', image: '/assets/catalog/catalog_12.jpg', stock: 14 },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    stock_quantity: 79,
    is_available: true,
    is_featured: true,
    seo_title: 'V-Neck Sweater Top | Inaya Fashion',
    seo_description:
      'Elegant fine-knit V-Neck Sweater Top available in 5 rich tones. Tailored comfort and Cash on Delivery from Inaya Fashion.',
  },
  {
    id: 'prod-mockneck',
    name: 'Mock Neck Sweater',
    slug: 'mock-neck-sweater',
    category_id: 'cat-knitwear',
    category_name: 'Knitwear',
    description:
      'Minimalist mock neck sweater featuring clean collar structuring and lightweight warmth. Designed for sleek everyday layering with wide-leg or flare trousers.',
    regular_price: 1400,
    discount_price: 1120,
    images: [
      '/assets/catalog/catalog_13.jpg',
      '/assets/catalog/catalog_14.jpg',
      '/assets/catalog/catalog_15.jpg',
      '/assets/catalog/catalog_16.jpg',
    ],
    variants: [
      { color: 'Navy Blue', hex: '#1E2C4F', image: '/assets/catalog/catalog_13.jpg', stock: 14 },
      { color: 'Oatmeal Cream', hex: '#EBE4D8', image: '/assets/catalog/catalog_14.jpg', stock: 18 },
      { color: 'Jet Black', hex: '#161618', image: '/assets/catalog/catalog_15.jpg', stock: 20 },
      { color: 'Pure White', hex: '#F7F7F7', image: '/assets/catalog/catalog_16.jpg', stock: 15 },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    stock_quantity: 67,
    is_available: true,
    is_featured: true,
    seo_title: 'Mock Neck Sweater | Inaya Fashion',
    seo_description:
      'Minimalist Mock Neck Sweater in Navy, Oatmeal Cream, Jet Black, and Pure White. Premium soft knitwear by Inaya Fashion.',
  },
  {
    id: 'prod-flarepants',
    name: 'Flare Leg Pants',
    slug: 'flare-leg-pants',
    category_id: 'cat-trousers',
    category_name: 'Trousers',
    description:
      'High-waisted tailored flare leg pants engineered for an elongating silhouette with structured stretch fabric that holds its crisp crease all day.',
    regular_price: 1650,
    discount_price: 1290,
    images: [
      '/assets/catalog/catalog_18.jpg',
      '/assets/catalog/catalog_19.jpg',
      '/assets/catalog/catalog_17.jpg',
      '/assets/catalog/catalog_20.jpg',
      '/assets/catalog/catalog_21.jpg',
      '/assets/catalog/catalog_22.jpg',
    ],
    variants: [
      { color: 'Warm Beige', hex: '#EDE0CC', image: '/assets/catalog/catalog_18.jpg', stock: 20 },
      { color: 'Espresso Brown', hex: '#4A3429', image: '/assets/catalog/catalog_19.jpg', stock: 16 },
      { color: 'Jet Black', hex: '#141416', image: '/assets/catalog/catalog_17.jpg', stock: 24 },
      { color: 'Heather Grey', hex: '#8E9297', image: '/assets/catalog/catalog_20.jpg', stock: 14 },
      { color: 'Pure White', hex: '#F5F5F4', image: '/assets/catalog/catalog_21.jpg', stock: 12 },
      { color: 'Wine Maroon', hex: '#581720', image: '/assets/catalog/catalog_22.jpg', stock: 14 },
    ],
    sizes: ['26', '28', '30', '32', '34'],
    stock_quantity: 100,
    is_available: true,
    is_featured: true,
    seo_title: 'Flare Leg Pants | Inaya Fashion',
    seo_description:
      'High-waisted tailored Flare Leg Pants in 6 signature colors. Flattering elongating fit with Cash on Delivery across Bangladesh.',
  },
];

export const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'coupon-inaya10',
    code: 'INAYA10',
    title: '10% Welcome Savings',
    discount_type: 'percentage',
    discount_value: 10,
    min_purchase_amount: 1000,
    auto_apply_threshold: false,
    max_uses: 500,
    used_count: 12,
    expires_at: null,
    is_active: true,
  },
  {
    id: 'coupon-spend2500',
    code: 'SPEND2500',
    title: 'Spend ৳2,500+ Save ৳200 Automatically',
    discount_type: 'fixed',
    discount_value: 200,
    min_purchase_amount: 2500,
    auto_apply_threshold: true,
    max_uses: null,
    used_count: 8,
    expires_at: null,
    is_active: true,
  },
];

// Natural Banglish sample style impressions (varied ratings 3-5 stars; clearly labeled as sample impressions)
export const SAMPLE_BANGLISH_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    author: 'Nusrat Jahan',
    city: 'Dhanmondi, Dhaka',
    rating: 5,
    product_name: "Women's Ribbed Knit Turtleneck Sweater",
    comment:
      'Ivory Cream ta niyechilam, fabric ta onek soft ar body fitting ekdom perfect. Winter-e blazer er sathe porte khub classy lage.',
    date_label: 'Sample Style Note',
  },
  {
    id: 'rev-2',
    author: 'Farhana Tasnim',
    city: 'Uttara, Dhaka',
    rating: 4,
    product_name: 'Flare Leg Pants',
    comment:
      'Espresso Brown shade ta khub sundor, high-waist fitting valo chilo. Amar height 5\'2" tai length ta halka alter kore nite hoyeche, baki quality top notch.',
    date_label: 'Sample Style Note',
  },
  {
    id: 'rev-3',
    author: 'Maliha Rahman',
    city: 'Nasirabad, Chattogram',
    rating: 5,
    product_name: 'V-Neck Sweater Top',
    comment:
      'Wine Burgundy r Royal Blue duitai office er jonno perfect. Neckline beshi deep na, tai modest ar smart duitai maintain kore.',
    date_label: 'Sample Style Note',
  },
  {
    id: 'rev-4',
    author: 'Sadia Afrin',
    city: 'Mirpur, Dhaka',
    rating: 3,
    product_name: 'Mock Neck Sweater',
    comment:
      'Oatmeal Cream color ta dekhte clean, kintu Dhaka te ekdom bhari shit na porle dupur bela ektu warm lagte pare. Evening wear er jonno best.',
    date_label: 'Sample Style Note',
  },
  {
    id: 'rev-5',
    author: 'Raisa Chowdhury',
    city: 'Sylhet',
    rating: 4,
    product_name: 'Flare Leg Pants',
    comment:
      'Warm Beige flare pant ta turtleneck er sathe pair korle ekdom boutique look ashe. Packaging ar delivery time o bhaloi chilo.',
    date_label: 'Sample Style Note',
  },
];
