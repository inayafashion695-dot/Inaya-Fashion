import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { CartItem, SiteSettings } from '../../types/ecommerce';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  settings: SiteSettings;
  onClose: () => void;
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onCheckout: () => void;
}

export function CartDrawer({
  open,
  items,
  settings,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  if (!open) return null;

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const threshold = settings.free_delivery_threshold;
  const remainingForFree =
    settings.delivery_enabled && threshold > 0 ? Math.max(0, threshold - subtotal) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
      >
        <div className="px-6 py-4 border-b border-[#EAE4DA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#8C6218]" />
            <h2 className="font-display text-2xl font-semibold text-[#141210]">
              Your Bag ({items.reduce((s, i) => s + i.quantity, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shopping bag"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#575148] hover:text-[#141210]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {settings.delivery_enabled && threshold > 0 && items.length > 0 && (
          <div className="px-6 py-2.5 bg-[#FAF8F5] border-b border-[#EAE4DA] text-xs text-[#575148]">
            {remainingForFree > 0 ? (
              <span>
                Add <strong className="text-[#141210] tabular-nums">৳{remainingForFree.toLocaleString()}</strong> more for complimentary delivery
              </span>
            ) : (
              <span className="text-[#8C6218] font-medium">
                You qualify for complimentary nationwide delivery
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="w-10 h-10 text-[#D8D0C5] mb-3" />
              <p className="text-base font-medium text-[#141210]">Your bag is empty</p>
              <p className="mt-1 text-sm text-[#575148]">
                Select a sweater or tailored trouser to begin.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.key}
                className="flex gap-4 pb-4 border-b border-[#F1ECE4]"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-24 object-cover object-top rounded-lg bg-[#FAF8F5] shrink-0 border border-[#EAE4DA]"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#141210] line-clamp-2">
                        {item.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.key)}
                        aria-label={`Remove ${item.name}`}
                        className="text-[#7D756B] hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-[#575148]">
                      {item.color} · Size {item.size}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center border border-[#EAE4DA] rounded-md">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.key, -1)}
                        aria-label="Decrease item quantity"
                        className="w-8 h-8 flex items-center justify-center text-[#141210] hover:bg-[#FAF8F5]"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-mono tabular-nums font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.key, 1)}
                        aria-label="Increase item quantity"
                        className="w-8 h-8 flex items-center justify-center text-[#141210] hover:bg-[#FAF8F5]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-sm font-semibold text-[#141210] tabular-nums">
                      ৳{(item.unit_price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-[#EAE4DA] bg-[#FAF8F5] space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#575148]">Subtotal</span>
              <span className="text-lg font-bold text-[#141210] tabular-nums">
                ৳{subtotal.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              className="w-full min-h-[48px] px-6 py-3 rounded-lg bg-[#141210] text-white text-sm font-semibold hover:bg-[#8C6218] transition-colors"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
