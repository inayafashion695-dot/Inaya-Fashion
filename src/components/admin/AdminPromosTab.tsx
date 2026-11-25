import { Edit2, Loader2, Plus, Trash2, Truck, X } from 'lucide-react';
import { useState } from 'react';
import { adminDeleteCoupon, adminSaveCoupon, adminSaveSiteSettings } from '../../lib/api';
import type { Coupon, SiteSettings } from '../../types/ecommerce';

interface AdminPromosTabProps {
  coupons: Coupon[];
  settings: SiteSettings;
  onCouponsChanged: (coupons: Coupon[]) => void;
  onSettingsChanged: (settings: SiteSettings) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export function AdminPromosTab({
  coupons,
  settings,
  onCouponsChanged,
  onSettingsChanged,
  onToast,
}: AdminPromosTabProps) {
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [savingCoupon, setSavingCoupon] = useState(false);

  const [deliveryEnabled, setDeliveryEnabled] = useState(settings.delivery_enabled);
  const [insideDhaka, setInsideDhaka] = useState(settings.delivery_inside_dhaka);
  const [outsideDhaka, setOutsideDhaka] = useState(settings.delivery_outside_dhaka);
  const [freeThreshold, setFreeThreshold] = useState(settings.free_delivery_threshold);
  const [savingDelivery, setSavingDelivery] = useState(false);

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDelivery(true);
    try {
      const updated = await adminSaveSiteSettings({
        ...settings,
        delivery_enabled: deliveryEnabled,
        delivery_inside_dhaka: Number(insideDhaka),
        delivery_outside_dhaka: Number(outsideDhaka),
        free_delivery_threshold: Number(freeThreshold),
      });
      onSettingsChanged(updated);
      onToast('Delivery charge settings updated');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to update delivery charges', true);
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon || !editingCoupon.code?.trim()) return;
    setSavingCoupon(true);
    try {
      const saved = await adminSaveCoupon(editingCoupon);
      const exists = coupons.some((c) => c.id === saved.id);
      const next = exists
        ? coupons.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...coupons];
      onCouponsChanged(next);
      setEditingCoupon(null);
      onToast(`Saved promo "${saved.code}"`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not save coupon', true);
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (c: Coupon) => {
    try {
      await adminDeleteCoupon(c.id);
      onCouponsChanged(coupons.filter((x) => x.id !== c.id));
      onToast(`Deleted promo "${c.code}"`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Delete failed', true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Delivery Charge Management */}
      <form
        onSubmit={handleSaveDelivery}
        className="bg-white border border-[#EAE4DA] rounded-2xl p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#8C6218]" />
            <h3 className="text-sm font-semibold text-[#141210]">Delivery Charge Settings</h3>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-[#141210]">
            <input
              type="checkbox"
              checked={deliveryEnabled}
              onChange={(e) => setDeliveryEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#141210]"
            />
            <span>Charge Delivery Fee</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#575148] mb-1">
              Inside Dhaka (৳)
            </label>
            <input
              type="number"
              min={0}
              value={insideDhaka}
              onChange={(e) => setInsideDhaka(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-[#EAE4DA] rounded-xl tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#575148] mb-1">
              Outside Dhaka (৳)
            </label>
            <input
              type="number"
              min={0}
              value={outsideDhaka}
              onChange={(e) => setOutsideDhaka(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-[#EAE4DA] rounded-xl tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#575148] mb-1">
              Free Delivery Over (৳)
            </label>
            <input
              type="number"
              min={0}
              value={freeThreshold}
              onChange={(e) => setFreeThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-[#EAE4DA] rounded-xl tabular-nums"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={savingDelivery}
          className="min-h-[42px] px-5 py-2 rounded-xl bg-[#141210] text-white text-xs font-semibold flex items-center gap-2 hover:bg-[#8C6218]"
        >
          {savingDelivery && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Save Delivery Settings</span>
        </button>
      </form>

      {/* Coupons & Threshold Discounts */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#141210]">
            Coupons &amp; Purchase Discounts ({coupons.length})
          </h3>
          <p className="text-xs text-[#575148]">
            Create promo codes or automatic spend-based discounts.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setEditingCoupon({
              code: '',
              title: '',
              discount_type: 'percentage',
              discount_value: 10,
              min_purchase_amount: 1000,
              auto_apply_threshold: false,
              max_uses: 200,
              expires_at: null,
              is_active: true,
            })
          }
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#141210] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#8C6218]"
        >
          <Plus className="w-4 h-4 text-[#E6C885]" />
          <span>New Promo</span>
        </button>
      </div>

      <div className="space-y-3">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className="bg-white border border-[#EAE4DA] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono font-bold text-sm text-[#141210]">{coupon.code}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#8C6218] font-semibold">
                  {coupon.discount_type === 'percentage'
                    ? `${coupon.discount_value}% OFF`
                    : `৳${coupon.discount_value} OFF`}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[#575148]">
                  {coupon.auto_apply_threshold ? 'Auto-Apply Threshold' : 'Promo Code'}
                </span>
                <span aria-hidden="true">·</span>
                <span className={coupon.is_active ? 'text-emerald-700 font-medium' : 'text-red-700'}>
                  {coupon.is_active ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#575148]">
                {coupon.title || 'Discount rule'} · Min spend ৳{coupon.min_purchase_amount.toLocaleString()} · Used{' '}
                {coupon.used_count}
                {coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                {coupon.expires_at ? ` · Expires ${new Date(coupon.expires_at).toLocaleDateString()}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingCoupon(structuredClone(coupon))}
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#EAE4DA] text-xs font-medium flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCoupon(coupon)}
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-700 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Coupon Modal */}
      {editingCoupon && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs sm:p-4">
          <form
            onSubmit={handleSaveCoupon}
            className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#EAE4DA] flex items-center justify-between bg-[#FAF8F5]">
              <h3 className="font-display text-xl font-semibold text-[#141210]">
                {editingCoupon.id ? 'Edit Promo Rule' : 'New Promo / Threshold Rule'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCoupon(null)}
                aria-label="Close promo editor"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#575148]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#575148] mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={editingCoupon.code || ''}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })
                    }
                    placeholder="INAYA15"
                    className="w-full px-3 py-2.5 border border-[#EAE4DA] rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#575148] mb-1">
                    Discount Type
                  </label>
                  <select
                    value={editingCoupon.discount_type || 'percentage'}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        discount_type: e.target.value as 'percentage' | 'fixed',
                      })
                    }
                    className="w-full px-3 py-2.5 border border-[#EAE4DA] rounded-xl bg-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (৳)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#575148] mb-1">
                  Title / Description
                </label>
                <input
                  type="text"
                  value={editingCoupon.title || ''}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, title: e.target.value })}
                  placeholder="e.g. Winter Knitwear 15% Off"
                  className="w-full px-3 py-2.5 border border-[#EAE4DA] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#575148] mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingCoupon.discount_value ?? 10}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, discount_value: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 border border-[#EAE4DA] rounded-xl tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#575148] mb-1">
                    Min Purchase (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingCoupon.min_purchase_amount ?? 0}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        min_purchase_amount: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2.5 border border-[#EAE4DA] rounded-xl tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#575148] mb-1">
                    Usage Limit (blank = unlimited)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingCoupon.max_uses ?? ''}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        max_uses: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-[#EAE4DA] rounded-xl tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#575148] mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={
                      editingCoupon.expires_at
                        ? editingCoupon.expires_at.slice(0, 10)
                        : ''
                    }
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        expires_at: e.target.value
                          ? new Date(e.target.value + 'T23:59:59Z').toISOString()
                          : null,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-[#EAE4DA] rounded-xl"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-[#141210]">
                  <input
                    type="checkbox"
                    checked={Boolean(editingCoupon.auto_apply_threshold)}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        auto_apply_threshold: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-[#141210]"
                  />
                  <span>Auto-Apply on Min Purchase (No Code Needed)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-[#141210]">
                  <input
                    type="checkbox"
                    checked={editingCoupon.is_active ?? true}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, is_active: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#141210]"
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-[#EAE4DA] bg-[#FAF8F5] flex gap-3">
              <button
                type="button"
                onClick={() => setEditingCoupon(null)}
                className="min-h-[44px] px-5 rounded-xl border border-[#EAE4DA] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCoupon}
                className="flex-1 min-h-[44px] rounded-xl bg-[#141210] text-white text-xs font-semibold flex items-center justify-center gap-2"
              >
                {savingCoupon && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Promo</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
