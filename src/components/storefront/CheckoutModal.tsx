import { CheckCircle2, Loader2, Tag, X } from 'lucide-react';
import { useState } from 'react';
import { submitCustomerOrder } from '../../lib/api';
import { trackInitiateCheckout, trackPurchase } from '../../lib/metaPixel';
import { calculateOrderBreakdown } from '../../lib/pricing';
import type { CartItem, Coupon, Order, SiteSettings } from '../../types/ecommerce';

const BANGLADESH_DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
] as const;

interface CheckoutModalProps {
  open: boolean;
  items: CartItem[];
  coupons: Coupon[];
  settings: SiteSettings;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
  onTrackOrder: (orderNumber: string) => void;
}

export function CheckoutModal({
  open,
  items,
  coupons,
  settings,
  onClose,
  onOrderSuccess,
  onTrackOrder,
}: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [division, setDivision] = useState<string>('Dhaka');
  const [customerAddress, setCustomerAddress] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  if (!open) return null;

  // Automatically determined solely by selected Division
  const deliveryZone: 'inside_dhaka' | 'outside_dhaka' =
    division === 'Dhaka' ? 'inside_dhaka' : 'outside_dhaka';

  const breakdown = calculateOrderBreakdown({
    items,
    coupons,
    couponCode: appliedCode,
    deliveryZone,
    settings,
  });

  const handleNameChange = (val: string) => {
    // Strip digits to prevent numbers inside the name field
    const withoutDigits = val.replace(/\d/g, '');
    setCustomerName(withoutDigits);
  };

  const handlePhoneChange = (val: string) => {
    // Allow digits only, maximum 11 digits
    const digitsOnly = val.replace(/\D/g, '').slice(0, 11);
    setCustomerPhone(digitsOnly);
  };

  const handleApplyCoupon = () => {
    setAppliedCode(couponInput.trim().toUpperCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = customerName.trim();
    if (trimmedName.length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (/\d/.test(trimmedName)) {
      setError('Customer name cannot contain numbers.');
      return;
    }
    if (!/^01\d{9}$/.test(customerPhone)) {
      setError('Phone number must be exactly 11 digits and start with 01 (e.g. 01712345678).');
      return;
    }
    if (customerAddress.trim().length < 5) {
      setError('Please enter your complete delivery address.');
      return;
    }
    if (items.length === 0) {
      setError('Your bag is empty.');
      return;
    }

    setSubmitting(true);
    trackInitiateCheckout(
      breakdown.totalAmount,
      items.reduce((s, i) => s + i.quantity, 0)
    );

    const fullAddressWithDivision = customerAddress.toLowerCase().includes(division.toLowerCase())
      ? customerAddress.trim()
      : `${customerAddress.trim()}, ${division} Division`;

    try {
      const order = await submitCustomerOrder({
        customer_name: trimmedName,
        customer_phone: customerPhone,
        customer_address: fullAddressWithDivision,
        division,
        delivery_zone: deliveryZone,
        coupon_code: breakdown.appliedCouponCode || undefined,
        notes: notes.trim(),
        items: items.map((i) => ({
          product_id: i.product_id,
          color: i.color,
          size: i.size,
          quantity: i.quantity,
          name: i.name,
          slug: i.slug,
          image: i.image,
          unit_price: i.unit_price,
          regular_price: i.regular_price,
        })),
      });

      trackPurchase(
        order.order_number,
        order.total_amount,
        items.map((i) => i.product_id)
      );

      setConfirmedOrder(order);
      onOrderSuccess(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to place your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setConfirmedOrder(null);
    setError(null);
    onClose();
  };

  const phoneIsValid = customerPhone.length === 0 || /^01\d{9}$/.test(customerPhone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#EAE4DA] overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Express checkout"
      >
        <div className="px-6 py-4 border-b border-[#EAE4DA] flex items-center justify-between bg-[#FAF8F5]">
          <h2 className="font-display text-2xl font-semibold text-[#141210]">
            {confirmedOrder ? 'Order Confirmed' : 'Express Cash on Delivery Checkout'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close checkout"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#575148] hover:text-[#141210]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedOrder ? (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-700 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wider text-[#575148]">
                  Thank you, {confirmedOrder.customer_name}
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold text-[#141210]">
                  Order #{confirmedOrder.order_number} Confirmed
                </h3>
                <p className="mt-1 text-sm text-[#575148]">
                  Our team will confirm your parcel shortly for delivery to{' '}
                  <strong className="text-[#141210]">{confirmedOrder.customer_address}</strong>.
                </p>
              </div>
            </div>

            <div className="bg-[#FAF8F5] border border-[#EAE4DA] rounded-xl p-5 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[#575148]">Order ID</span>
                <span className="font-mono font-semibold text-[#141210]">{confirmedOrder.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#575148]">Phone</span>
                <span className="font-mono tabular-nums">{confirmedOrder.customer_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#575148]">Payment Method</span>
                <span className="font-medium">Cash on Delivery</span>
              </div>
              <div className="pt-2 border-t border-[#EAE4DA] flex justify-between text-base font-bold text-[#141210]">
                <span>Total Payable</span>
                <span className="tabular-nums">৳{Math.round(confirmedOrder.total_amount).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  const num = confirmedOrder.order_number;
                  handleClose();
                  onTrackOrder(num);
                }}
                className="flex-1 min-h-[44px] px-5 py-2.5 rounded-lg bg-[#141210] text-white text-sm font-medium hover:bg-[#8C6218]"
              >
                Track Order Status
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] px-5 py-2.5 rounded-lg border border-[#EAE4DA] text-sm font-medium text-[#141210] hover:bg-[#FAF8F5]"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
            {error && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#575148] mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Nusrat Jahan"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#EAE4DA] rounded-lg focus:outline-none focus:border-[#B6862C]"
                />
                <p className="mt-1 text-[11px] text-[#7D756B]">Letters only (no numbers)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#575148] mb-1.5">
                  Phone Number (11 Digits) *
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  maxLength={11}
                  value={customerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-lg font-mono focus:outline-none ${
                    phoneIsValid
                      ? 'border-[#EAE4DA] focus:border-[#B6862C]'
                      : 'border-red-400 focus:border-red-600'
                  }`}
                />
                <p
                  className={`mt-1 text-[11px] ${
                    !phoneIsValid ? 'text-red-700' : 'text-[#7D756B]'
                  }`}
                >
                  Must start with 01 and be exactly 11 digits ({customerPhone.length}/11)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#575148] mb-1.5">
                  Division *
                </label>
                <select
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#EAE4DA] rounded-lg focus:outline-none focus:border-[#B6862C]"
                >
                  {BANGLADESH_DIVISIONS.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
                {settings.delivery_enabled && (
                  <p className="mt-1 text-[11px] text-[#8C6218]">
                    {breakdown.freeDeliveryApplied
                      ? 'Free delivery applied'
                      : `Auto delivery: ৳${breakdown.deliveryCharge}`}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#575148] mb-1.5">
                  Full Delivery Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="House, Road, Block / Area, Thana / District"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#EAE4DA] rounded-lg focus:outline-none focus:border-[#B6862C]"
                />
              </div>
            </div>

            {/* Promo Code & Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#575148] mb-1.5">
                  Promo Code
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-[#7D756B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="e.g. INAYA10"
                      className="w-full pl-8 pr-3 py-2 text-sm border border-[#EAE4DA] rounded-lg uppercase font-mono focus:outline-none focus:border-[#B6862C]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 rounded-lg border border-[#141210] text-xs font-semibold text-[#141210] hover:bg-[#FAF8F5]"
                  >
                    Apply
                  </button>
                </div>
                {breakdown.couponError && (
                  <p className="mt-1 text-xs text-red-700">{breakdown.couponError}</p>
                )}
                {breakdown.appliedCouponCode && (
                  <p className="mt-1 text-xs text-emerald-700">
                    Code {breakdown.appliedCouponCode} applied (-৳{breakdown.couponDiscount.toLocaleString()})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#575148] mb-1.5">
                  Delivery Note (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Call before arrival, landmark..."
                  className="w-full px-3.5 py-2 text-sm border border-[#EAE4DA] rounded-lg focus:outline-none focus:border-[#B6862C]"
                />
              </div>
            </div>

            {/* Order Summary Breakdown */}
            <div className="bg-[#FAF8F5] border border-[#EAE4DA] rounded-xl p-4 space-y-2 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#575148] mb-2">
                Order Summary ({items.reduce((s, i) => s + i.quantity, 0)} items)
              </div>
              {items.map((i) => (
                <div key={i.key} className="flex justify-between text-xs text-[#575148]">
                  <span className="truncate pr-3">
                    {i.quantity}× {i.name} ({i.color}, {i.size})
                  </span>
                  <span className="tabular-nums font-medium text-[#141210]">
                    ৳{(i.unit_price * i.quantity).toLocaleString()}
                  </span>
                </div>
              ))}

              <div className="pt-2 border-t border-[#EAE4DA] flex justify-between">
                <span className="text-[#575148]">Subtotal</span>
                <span className="tabular-nums">৳{breakdown.subtotal.toLocaleString()}</span>
              </div>
              {breakdown.productDiscount > 0 && (
                <div className="flex justify-between text-xs text-[#8C6218]">
                  <span>Catalog Savings</span>
                  <span className="tabular-nums">-৳{breakdown.productDiscount.toLocaleString()}</span>
                </div>
              )}
              {breakdown.thresholdDiscount > 0 && (
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>{breakdown.thresholdRuleTitle || 'Purchase Milestone Discount'}</span>
                  <span className="tabular-nums">-৳{breakdown.thresholdDiscount.toLocaleString()}</span>
                </div>
              )}
              {breakdown.couponDiscount > 0 && (
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>Coupon ({breakdown.appliedCouponCode})</span>
                  <span className="tabular-nums">-৳{breakdown.couponDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#575148]">
                  Delivery Charge ({division} Division)
                </span>
                <span className="tabular-nums">
                  {breakdown.deliveryCharge === 0
                    ? 'Free'
                    : `৳${breakdown.deliveryCharge.toLocaleString()}`}
                </span>
              </div>
              <div className="pt-2 border-t border-[#EAE4DA] flex justify-between text-base font-bold text-[#141210]">
                <span>Payable Total (Cash on Delivery)</span>
                <span className="tabular-nums">৳{breakdown.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] px-6 py-3 rounded-lg bg-[#141210] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#8C6218] disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : (
                <span>Confirm Order · ৳{breakdown.totalAmount.toLocaleString()}</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
