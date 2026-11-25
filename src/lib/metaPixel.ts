declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackPixelEvent(eventName: string, params?: Record<string, unknown>) {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      if (params) {
        window.fbq('track', eventName, params);
      } else {
        window.fbq('track', eventName);
      }
    }
  } catch {
    // Ignore ad-blocker errors
  }
}

export function trackViewContent(product: { id: string; name: string; price: number; category?: string }) {
  trackPixelEvent('ViewContent', {
    content_ids: [product.id],
    content_name: product.name,
    content_category: product.category || 'Apparel',
    content_type: 'product',
    value: product.price,
    currency: 'BDT',
  });
}

export function trackAddToCart(item: { id: string; name: string; price: number; quantity: number }) {
  trackPixelEvent('AddToCart', {
    content_ids: [item.id],
    content_name: item.name,
    content_type: 'product',
    value: item.price * item.quantity,
    currency: 'BDT',
  });
}

export function trackInitiateCheckout(total: number, numItems: number) {
  trackPixelEvent('InitiateCheckout', {
    value: total,
    num_items: numItems,
    currency: 'BDT',
  });
}

export function trackPurchase(orderNumber: string, total: number, productIds: string[]) {
  trackPixelEvent('Purchase', {
    content_ids: productIds,
    content_type: 'product',
    value: total,
    currency: 'BDT',
    order_id: orderNumber,
  });
}
