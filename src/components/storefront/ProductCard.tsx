import { ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '../../types/ecommerce';

interface ProductCardProps {
  product: Product;
  onOpenProduct: (slug: string) => void;
  onQuickAdd: (product: Product, color: string, image: string) => void;
}

export function ProductCard({ product, onOpenProduct, onQuickAdd }: ProductCardProps) {
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [imgError, setImgError] = useState(false);

  const activeVariant = product.variants[selectedVariantIdx];
  const displayImage = activeVariant?.image || product.images[0] || '';
  const effectivePrice =
    product.discount_price && product.discount_price > 0
      ? product.discount_price
      : product.regular_price;
  const hasDiscount =
    product.discount_price !== null &&
    product.discount_price > 0 &&
    product.discount_price < product.regular_price;
  const discountPct = hasDiscount
    ? Math.round(((product.regular_price - effectivePrice) / product.regular_price) * 100)
    : 0;

  return (
    <article className="group flex flex-col bg-white border border-[#EAE4DA] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <a
        href={`/product/${product.slug}`}
        onClick={(e) => {
          e.preventDefault();
          onOpenProduct(product.slug);
        }}
        className="relative aspect-[3/4] w-full bg-[#FAF8F5] overflow-hidden block"
      >
        {!imgError && displayImage ? (
          <img
            src={displayImage}
            alt={`${product.name}${activeVariant ? ` in ${activeVariant.color}` : ''}`}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-6 text-center bg-gradient-to-br from-[#FAF8F5] to-[#EFE9DF] text-[#575148] text-sm font-medium">
            {product.name}
          </div>
        )}
      </a>

      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between gap-2.5 sm:gap-3">
        <div>
          {/* Unboxed clean metadata line (no pill badges) */}
          <div className="flex items-center flex-wrap gap-1.5 text-[11px] sm:text-xs text-[#575148]">
            <span className="uppercase tracking-wider">{product.category_name}</span>
            {hasDiscount && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#8C6218] font-medium">-{discountPct}%</span>
              </>
            )}
            {product.stock_quantity === 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-red-700 font-medium">Sold Out</span>
              </>
            )}
          </div>

          <h3 className="mt-1 text-xs sm:text-base font-semibold text-[#141210] leading-snug line-clamp-2">
            <a
              href={`/product/${product.slug}`}
              onClick={(e) => {
                e.preventDefault();
                onOpenProduct(product.slug);
              }}
              className="hover:text-[#9A6F20] transition-colors"
            >
              {product.name}
            </a>
          </h3>

          {/* Color Swatches */}
          {product.variants.length > 0 && (
            <div className="mt-2 sm:mt-3 flex items-center flex-wrap gap-1 sm:gap-1.5">
              {product.variants.map((variant, idx) => (
                <button
                  key={`${variant.color}-${idx}`}
                  type="button"
                  onClick={() => {
                    setImgError(false);
                    setSelectedVariantIdx(idx);
                  }}
                  title={variant.color}
                  aria-label={`Select color ${variant.color}`}
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border transition-transform ${
                    idx === selectedVariantIdx
                      ? 'border-[#141210] ring-2 ring-[#B6862C]/50 scale-110'
                      : 'border-[#D8D0C5] hover:scale-105'
                  }`}
                  style={{ backgroundColor: variant.hex || '#D4CBBF' }}
                />
              ))}
              {activeVariant && (
                <span className="hidden sm:inline ml-1 text-xs text-[#575148] truncate max-w-[110px]">
                  {activeVariant.color}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-[#F1ECE4] flex items-center justify-between gap-2">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 tabular-nums">
            <span className="text-sm sm:text-base font-semibold text-[#141210]">
              ৳{effectivePrice.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-[11px] sm:text-xs text-[#7D756B] line-through">
                ৳{product.regular_price.toLocaleString()}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!product.is_available || product.stock_quantity === 0}
            onClick={() =>
              onQuickAdd(
                product,
                activeVariant?.color || 'Default',
                displayImage
              )
            }
            className="min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg bg-[#141210] text-white text-xs font-medium flex items-center gap-1.5 hover:bg-[#8C6218] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </article>
  );
}
