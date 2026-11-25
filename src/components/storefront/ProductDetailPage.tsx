import { ArrowLeft, Check, Minus, Plus, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { trackViewContent } from '../../lib/metaPixel';
import type { Product, SiteSettings } from '../../types/ecommerce';
import { SeoHead } from './SeoHead';

interface ProductDetailPageProps {
  product: Product;
  relatedProducts: Product[];
  settings: SiteSettings;
  onBack: () => void;
  onOpenProduct: (slug: string) => void;
  onAddToCart: (product: Product, color: string, size: string, quantity: number, image: string) => void;
  onBuyNow: (product: Product, color: string, size: string, quantity: number, image: string) => void;
}

export function ProductDetailPage({
  product,
  relatedProducts,
  settings,
  onBack,
  onOpenProduct,
  onAddToCart,
  onBuyNow,
}: ProductDetailPageProps) {
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || 'M');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(
    product.variants[0]?.image || product.images[0] || ''
  );

  useEffect(() => {
    setSelectedVariantIdx(0);
    setSelectedSize(product.sizes[0] || 'M');
    setQuantity(1);
    setActiveImage(product.variants[0]?.image || product.images[0] || '');
    const price = product.discount_price && product.discount_price > 0 ? product.discount_price : product.regular_price;
    trackViewContent({ id: product.id, name: product.name, price, category: product.category_name });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product]);

  const activeVariant = product.variants[selectedVariantIdx];
  const effectivePrice =
    product.discount_price && product.discount_price > 0
      ? product.discount_price
      : product.regular_price;
  const hasDiscount =
    product.discount_price !== null &&
    product.discount_price > 0 &&
    product.discount_price < product.regular_price;
  const savings = hasDiscount ? product.regular_price - effectivePrice : 0;

  const galleryImages = Array.from(
    new Set([
      ...product.variants.map((v) => v.image).filter(Boolean),
      ...product.images.filter(Boolean),
    ])
  );

  const selectedColorName = activeVariant?.color || 'Default';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <SeoHead settings={settings} product={product} />

      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#575148] hover:text-[#141210] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Collection</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[3/4] w-full bg-[#FAF8F5] rounded-2xl overflow-hidden border border-[#EAE4DA]">
            {activeImage ? (
              <img
                src={activeImage}
                alt={`${product.name} - ${selectedColorName}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#575148]">
                {product.name}
              </div>
            )}
          </div>

          {galleryImages.length > 1 && (
            <div className="grid grid-cols-5 sm:grid-cols-7 gap-2.5">
              {galleryImages.map((imgUrl, idx) => {
                const matchedVariantIndex = product.variants.findIndex((v) => v.image === imgUrl);
                const isSelected = activeImage === imgUrl;
                return (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => {
                      setActiveImage(imgUrl);
                      if (matchedVariantIndex >= 0) {
                        setSelectedVariantIdx(matchedVariantIndex);
                      }
                    }}
                    className={`aspect-[3/4] rounded-lg overflow-hidden border transition-all bg-[#FAF8F5] ${
                      isSelected
                        ? 'border-[#141210] ring-2 ring-[#B6862C]/60'
                        : 'border-[#EAE4DA] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${product.name} view ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Contiguous Purchase Module */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 bg-white border border-[#EAE4DA] rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#575148] uppercase tracking-wider">
              <span>{product.category_name}</span>
              <span aria-hidden="true">·</span>
              <span>{product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}</span>
            </div>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-[#141210] leading-tight">
              {product.name}
            </h1>

            <div className="mt-4 flex items-baseline gap-3 tabular-nums">
              <span className="text-2xl font-bold text-[#141210]">
                ৳{effectivePrice.toLocaleString()}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base text-[#7D756B] line-through">
                    ৳{product.regular_price.toLocaleString()}
                  </span>
                  <span className="text-xs font-medium text-[#8C6218]">
                    Save ৳{savings.toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="text-sm text-[#575148] leading-relaxed">{product.description}</p>

          {/* Color Selector */}
          {product.variants.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs mb-2.5">
                <span className="font-semibold text-[#141210] uppercase tracking-wider">Color</span>
                <span className="text-[#575148]">{selectedColorName}</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((variant, idx) => (
                  <button
                    key={`${variant.color}-${idx}`}
                    type="button"
                    onClick={() => {
                      setSelectedVariantIdx(idx);
                      if (variant.image) setActiveImage(variant.image);
                    }}
                    className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors ${
                      idx === selectedVariantIdx
                        ? 'border-[#141210] bg-[#FAF8F5] text-[#141210]'
                        : 'border-[#EAE4DA] text-[#575148] hover:border-[#B6862C]'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                      style={{ backgroundColor: variant.hex || '#D4CBBF' }}
                    />
                    <span>{variant.color}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {product.sizes.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs mb-2.5">
                <span className="font-semibold text-[#141210] uppercase tracking-wider">Size</span>
                <span className="text-[#575148]">Selected: {selectedSize}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-h-[42px] min-w-[52px] px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                      selectedSize === size
                        ? 'bg-[#141210] text-white border-[#141210]'
                        : 'bg-white text-[#141210] border-[#EAE4DA] hover:border-[#B6862C]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-[#EAE4DA] rounded-lg">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#141210] hover:bg-[#FAF8F5]"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-sm font-mono tabular-nums font-medium">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  aria-label="Increase quantity"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#141210] hover:bg-[#FAF8F5]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={!product.is_available || product.stock_quantity === 0}
                onClick={() =>
                  onAddToCart(product, selectedColorName, selectedSize, quantity, activeImage)
                }
                className="flex-1 min-h-[44px] px-5 py-2.5 rounded-lg border border-[#141210] text-[#141210] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#FAF8F5] disabled:opacity-40 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Bag</span>
              </button>
            </div>

            <button
              type="button"
              disabled={!product.is_available || product.stock_quantity === 0}
              onClick={() =>
                onBuyNow(product, selectedColorName, selectedSize, quantity, activeImage)
              }
              className="w-full min-h-[48px] px-6 py-3 rounded-lg bg-[#141210] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#8C6218] disabled:opacity-40 transition-colors"
            >
              <Check className="w-4 h-4 text-[#E6C885]" />
              <span>Order Now — Cash on Delivery</span>
            </button>
          </div>

          <div className="pt-4 border-t border-[#EAE4DA] space-y-2.5 text-xs text-[#575148]">
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-[#8C6218] shrink-0" />
              <span>
                {settings.delivery_enabled
                  ? `Inside Dhaka ৳${settings.delivery_inside_dhaka} · Outside Dhaka ৳${settings.delivery_outside_dhaka}${
                      settings.free_delivery_threshold > 0
                        ? ` · Free over ৳${settings.free_delivery_threshold.toLocaleString()}`
                        : ''
                    }`
                  : 'Complimentary nationwide delivery on all orders'}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#8C6218] shrink-0" />
              <span>Cash on Delivery via Steadfast Courier across Bangladesh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Pieces */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-12 border-t border-[#EAE4DA]">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#141210] mb-6">
            Pair With
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {relatedProducts.slice(0, 4).map((rel) => {
              const p = rel.discount_price && rel.discount_price > 0 ? rel.discount_price : rel.regular_price;
              return (
                <a
                  key={rel.id}
                  href={`/product/${rel.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenProduct(rel.slug);
                  }}
                  className="group block border border-[#EAE4DA] rounded-xl overflow-hidden bg-white hover:shadow-md transition-all"
                >
                  <div className="aspect-[3/4] bg-[#FAF8F5] overflow-hidden">
                    <img
                      src={rel.images[0]}
                      alt={rel.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3.5">
                    <p className="text-sm font-semibold text-[#141210] line-clamp-1">{rel.name}</p>
                    <p className="mt-1 text-xs font-mono tabular-nums text-[#575148]">
                      ৳{p.toLocaleString()}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
