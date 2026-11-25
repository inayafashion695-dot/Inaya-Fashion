import type { CartItem, Coupon, SiteSettings } from '../types/ecommerce';

export interface PriceBreakdown {
  subtotal: number;
  regularSubtotal: number;
  productDiscount: number;
  thresholdDiscount: number;
  thresholdRuleTitle: string | null;
  couponDiscount: number;
  appliedCouponCode: string | null;
  couponError: string | null;
  deliveryCharge: number;
  freeDeliveryApplied: boolean;
  totalAmount: number;
}

export function isCouponValid(coupon: Coupon, subtotal: number): { valid: boolean; reason?: string } {
  if (!coupon.is_active) return { valid: false, reason: 'This promo code is currently inactive.' };
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return { valid: false, reason: 'This promo code has expired.' };
  }
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, reason: 'This promo code has reached its usage limit.' };
  }
  if (subtotal < coupon.min_purchase_amount) {
    return {
      valid: false,
      reason: `Minimum order of ৳${coupon.min_purchase_amount.toLocaleString()} required for ${coupon.code}.`,
    };
  }
  return { valid: true };
}

export function calculateOrderBreakdown(params: {
  items: Pick<CartItem, 'quantity' | 'unit_price' | 'regular_price'>[];
  coupons: Coupon[];
  couponCode?: string;
  deliveryZone: 'inside_dhaka' | 'outside_dhaka';
  settings: SiteSettings;
}): PriceBreakdown {
  const { items, coupons, couponCode, deliveryZone, settings } = params;

  const subtotal = items.reduce((sum, i) => sum + Number(i.unit_price) * Number(i.quantity), 0);
  const regularSubtotal = items.reduce(
    (sum, i) => sum + Math.max(Number(i.regular_price), Number(i.unit_price)) * Number(i.quantity),
    0
  );
  const productDiscount = Math.max(0, regularSubtotal - subtotal);

  // Automatic purchase-threshold discounts (pick highest eligible savings)
  let thresholdDiscount = 0;
  let thresholdRuleTitle: string | null = null;
  for (const c of coupons) {
    if (!c.auto_apply_threshold) continue;
    const check = isCouponValid(c, subtotal);
    if (!check.valid) continue;
    const val =
      c.discount_type === 'percentage'
        ? Math.round((subtotal * c.discount_value) / 100)
        : Math.round(c.discount_value);
    if (val > thresholdDiscount) {
      thresholdDiscount = val;
      thresholdRuleTitle = c.title || c.code;
    }
  }

  // Manual coupon code
  let couponDiscount = 0;
  let appliedCouponCode: string | null = null;
  let couponError: string | null = null;

  const trimmedCode = (couponCode || '').trim().toUpperCase();
  if (trimmedCode) {
    const matched = coupons.find((c) => c.code.toUpperCase() === trimmedCode && !c.auto_apply_threshold);
    const fallbackAuto = !matched
      ? coupons.find((c) => c.code.toUpperCase() === trimmedCode)
      : undefined;
    const target = matched || fallbackAuto;
    if (!target) {
      couponError = 'Invalid promo code.';
    } else if (target.auto_apply_threshold && thresholdRuleTitle) {
      couponError = 'Purchase-based discount is already applied automatically.';
    } else {
      const check = isCouponValid(target, subtotal);
      if (!check.valid) {
        couponError = check.reason || 'Promo code cannot be applied.';
      } else {
        couponDiscount =
          target.discount_type === 'percentage'
            ? Math.round((subtotal * target.discount_value) / 100)
            : Math.round(target.discount_value);
        appliedCouponCode = target.code.toUpperCase();
      }
    }
  }

  const netMerchandise = Math.max(0, subtotal - thresholdDiscount - couponDiscount);

  let deliveryCharge = 0;
  let freeDeliveryApplied = false;
  if (settings.delivery_enabled && items.length > 0) {
    if (settings.free_delivery_threshold > 0 && netMerchandise >= settings.free_delivery_threshold) {
      deliveryCharge = 0;
      freeDeliveryApplied = true;
    } else {
      deliveryCharge =
        deliveryZone === 'inside_dhaka'
          ? Number(settings.delivery_inside_dhaka)
          : Number(settings.delivery_outside_dhaka);
    }
  }

  const totalAmount = Math.max(0, netMerchandise + deliveryCharge);

  return {
    subtotal,
    regularSubtotal,
    productDiscount,
    thresholdDiscount,
    thresholdRuleTitle,
    couponDiscount,
    appliedCouponCode,
    couponError,
    deliveryCharge,
    freeDeliveryApplied,
    totalAmount,
  };
}
