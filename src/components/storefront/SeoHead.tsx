import { useEffect } from 'react';
import type { Product, SiteSettings } from '../../types/ecommerce';

interface SeoHeadProps {
  settings: SiteSettings;
  product?: Product | null;
  pageTitle?: string;
  pageDescription?: string;
}

export function SeoHead({ settings, product, pageTitle, pageDescription }: SeoHeadProps) {
  useEffect(() => {
    const title = product
      ? product.seo_title || `${product.name} | ${settings.brand_name}`
      : pageTitle || settings.seo_title || settings.brand_name;

    const description = product
      ? product.seo_description || product.description.slice(0, 155)
      : pageDescription || settings.seo_description;

    document.title = title;

    const setMeta = (selector: string, attr: 'name' | 'property', key: string, value: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);

    if (product?.images?.[0]) {
      setMeta('meta[property="og:image"]', 'property', 'og:image', product.images[0]);
    }

    // Update favicon dynamically if customized in admin
    if (settings.favicon_url) {
      let iconEl = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!iconEl) {
        iconEl = document.createElement('link');
        iconEl.rel = 'icon';
        document.head.appendChild(iconEl);
      }
      iconEl.href = settings.favicon_url;
    }

    // Update canonical URL
    const canonicalUrl = window.location.origin + window.location.pathname;
    let canonEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonEl) {
      canonEl = document.createElement('link');
      canonEl.rel = 'canonical';
      document.head.appendChild(canonEl);
    }
    canonEl.href = canonicalUrl;
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);

    // Product JSON-LD Structured Data
    const existingScript = document.getElementById('inaya-product-schema');
    if (product) {
      const price = product.discount_price && product.discount_price > 0 ? product.discount_price : product.regular_price;
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: product.images,
        description: product.description,
        brand: {
          '@type': 'Brand',
          name: settings.brand_name,
        },
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'BDT',
          price: String(price),
          availability: product.is_available && product.stock_quantity > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        },
      };
      let scriptEl = existingScript as HTMLScriptElement | null;
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'inaya-product-schema';
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(schema);
    } else if (existingScript) {
      existingScript.remove();
    }
  }, [settings, product, pageTitle, pageDescription]);

  return null;
}
