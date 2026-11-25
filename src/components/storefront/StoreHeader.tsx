import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';
import type { Category, SiteSettings } from '../../types/ecommerce';

interface StoreHeaderProps {
  settings: SiteSettings;
  categories: Category[];
  cartCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenCart: () => void;
  onNavigate: (path: string) => void;
  onSelectCategory: (slug: string) => void;
}

export function StoreHeader({
  settings,
  categories,
  cartCount,
  searchQuery,
  onSearchChange,
  onOpenCart,
  onNavigate,
  onSelectCategory,
}: StoreHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCategoryClick = (slug: string) => {
    onSelectCategory(slug);
    setMobileMenuOpen(false);
    if (window.location.pathname !== '/') {
      onNavigate('/');
      setTimeout(() => {
        document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#EAE4DA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Logo + Mobile Menu Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-[#141210] hover:text-[#9A6F20] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
            }}
            className="flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B6862C] rounded"
          >
            <img
              src={settings.logo_url}
              alt={settings.brand_name}
              referrerPolicy="no-referrer"
              className="h-9 sm:h-11 w-auto object-contain mix-blend-multiply"
            />
          </a>
        </div>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#575148]"
        >
          <button
            type="button"
            onClick={() => handleCategoryClick('all')}
            className="hover:text-[#141210] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#B6862C]"
          >
            Shop All
          </button>
          {categories.slice(0, 3).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.slug)}
              className="hover:text-[#141210] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#B6862C]"
            >
              {cat.name}
            </button>
          ))}
          <a
            href="/track-order"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/track-order');
            }}
            className="hover:text-[#141210] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#B6862C]"
          >
            Track Order
          </a>
        </nav>

        {/* Zone 3: Search & Cart Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#141210] hover:bg-[#FAF8F5] transition-colors"
            aria-label="Search products"
          >
            {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-[#141210] text-white text-xs sm:text-sm font-medium flex items-center gap-2 hover:bg-[#2C2620] transition-colors whitespace-nowrap shrink-0"
            aria-label={`Shopping bag with ${cartCount} items`}
          >
            <ShoppingBag className="w-4 h-4 text-[#E6C885]" />
            <span>Bag</span>
            <span className="tabular-nums font-mono text-xs bg-[#B6862C] text-white px-1.5 py-0.5 rounded">
              {cartCount}
            </span>
          </button>
        </div>
      </div>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="border-t border-[#EAE4DA] bg-[#FAF8F5] px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-2xl mx-auto relative">
            <Search className="w-4 h-4 text-[#575148] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (window.location.pathname !== '/') {
                  onNavigate('/');
                }
              }}
              placeholder="Search turtlenecks, V-neck tops, mock neck sweaters, flare pants..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#EAE4DA] rounded-lg focus:outline-none focus:border-[#B6862C]"
            />
          </div>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#EAE4DA] bg-white px-4 py-4 space-y-1">
          <button
            type="button"
            onClick={() => handleCategoryClick('all')}
            className="w-full text-left px-3 py-3 text-sm font-medium text-[#141210] hover:bg-[#FAF8F5] rounded-lg"
          >
            Shop All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.slug)}
              className="w-full text-left px-3 py-3 text-sm font-medium text-[#141210] hover:bg-[#FAF8F5] rounded-lg"
            >
              {cat.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('/track-order');
            }}
            className="w-full text-left px-3 py-3 text-sm font-medium text-[#141210] hover:bg-[#FAF8F5] rounded-lg"
          >
            Track Order
          </button>
        </div>
      )}
    </header>
  );
}
