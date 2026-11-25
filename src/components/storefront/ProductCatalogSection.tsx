import { Search } from 'lucide-react';
import type { Category, Product, SiteSettings } from '../../types/ecommerce';
import { ProductCard } from './ProductCard';

export type SortOption = 'featured' | 'price_asc' | 'price_desc' | 'newest';

interface ProductCatalogSectionProps {
  settings: SiteSettings;
  products: Product[];
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (slug: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onOpenProduct: (slug: string) => void;
  onQuickAdd: (product: Product, color: string, image: string) => void;
}

export function ProductCatalogSection({
  settings,
  products,
  categories,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onOpenProduct,
  onQuickAdd,
}: ProductCatalogSectionProps) {
  if (!settings.homepage_sections.show_featured) return null;

  const filtered = products
    .filter((p) => {
      if (!p.is_available) return false;
      if (selectedCategory !== 'all') {
        const cat = categories.find((c) => c.slug === selectedCategory);
        const matchesSlug = cat ? p.category_id === cat.id || p.category_name.toLowerCase() === cat.name.toLowerCase() : true;
        if (!matchesSlug) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName = p.name.toLowerCase().includes(q);
        const inDesc = p.description.toLowerCase().includes(q);
        const inCat = p.category_name.toLowerCase().includes(q);
        const inColor = p.variants.some((v) => v.color.toLowerCase().includes(q));
        return inName || inDesc || inCat || inColor;
      }
      return true;
    })
    .sort((a, b) => {
      const priceA = a.discount_price && a.discount_price > 0 ? a.discount_price : a.regular_price;
      const priceB = b.discount_price && b.discount_price > 0 ? b.discount_price : b.regular_price;
      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      if (sortBy === 'newest') {
        return (new Date(b.created_at || 0).getTime() || 0) - (new Date(a.created_at || 0).getTime() || 0);
      }
      return Number(b.is_featured) - Number(a.is_featured);
    });

  return (
    <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#EAE4DA]">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#141210] tracking-tight text-balance">
            {settings.homepage_sections.featured_title}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#575148]">
            {settings.homepage_sections.featured_subtitle}
          </p>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-initial min-w-[200px]">
            <Search className="w-4 h-4 text-[#575148] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search styles or shades..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF8F5] border border-[#EAE4DA] rounded-lg focus:outline-none focus:border-[#B6862C]"
            />
          </div>

          <select
            aria-label="Sort products"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="min-h-[40px] px-3 py-2 text-sm bg-white border border-[#EAE4DA] rounded-lg text-[#141210] focus:outline-none focus:border-[#B6862C]"
          >
            <option value="featured">Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest Arrivals</option>
          </select>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Filter by category">
        <button
          type="button"
          onClick={() => onCategoryChange('all')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-[#141210] text-white'
              : 'bg-[#FAF8F5] text-[#575148] hover:text-[#141210] border border-[#EAE4DA]'
          }`}
        >
          All Collection ({products.filter((p) => p.is_available).length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onCategoryChange(cat.slug)}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === cat.slug
                ? 'bg-[#141210] text-white'
                : 'bg-[#FAF8F5] text-[#575148] hover:text-[#141210] border border-[#EAE4DA]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="mt-10 py-16 text-center border border-dashed border-[#EAE4DA] rounded-2xl bg-[#FAF8F5]">
          <p className="text-base font-medium text-[#141210]">No matching pieces found</p>
          <p className="mt-1 text-sm text-[#575148]">Try clearing your search or selecting another category.</p>
          <button
            type="button"
            onClick={() => {
              onCategoryChange('all');
              onSearchChange('');
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-[#141210] text-white text-xs font-medium hover:bg-[#8C6218]"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="mt-6 sm:mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpenProduct={onOpenProduct}
              onQuickAdd={onQuickAdd}
            />
          ))}
        </div>
      )}
    </section>
  );
}
