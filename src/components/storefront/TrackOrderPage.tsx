import { ArrowLeft, PackageCheck, Search } from 'lucide-react';
import { useState } from 'react';
import { trackCustomerOrder } from '../../lib/api';
import type { Order, SiteSettings } from '../../types/ecommerce';
import { SeoHead } from './SeoHead';

interface TrackOrderPageProps {
  settings: SiteSettings;
  initialOrderNumber?: string;
  onBack: () => void;
}

export function TrackOrderPage({ settings, initialOrderNumber = '', onBack }: TrackOrderPageProps) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOrder(null);
    setLoading(true);
    try {
      const found = await trackCustomerOrder(orderNumber.trim(), phone.trim());
      if (!found) {
        setError('No matching order was found. Check your Order ID and phone number.');
      } else {
        setOrder(found);
      }
    } catch {
      setError('Unable to check order status right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <SeoHead
        settings={settings}
        pageTitle={`Track Order | ${settings.brand_name}`}
        pageDescription="Track your Inaya Fashion Cash on Delivery order status and Steadfast Courier parcel progress."
      />

      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#575148] hover:text-[#141210] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Storefront</span>
      </button>

      <div className="bg-white border border-[#EAE4DA] rounded-2xl p-6 sm:p-8">
        <h1 className="font-display text-3xl font-semibold text-[#141210]">Track Your Order</h1>
        <p className="mt-1.5 text-sm text-[#575148]">
          Enter the Order ID and mobile phone number used during checkout.
        </p>

        <form onSubmit={handleTrack} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#575148] mb-1.5">
                Order ID
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. INY-261125-4821"
                className="w-full px-3.5 py-2.5 text-sm border border-[#EAE4DA] rounded-lg font-mono uppercase focus:outline-none focus:border-[#B6862C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#575148] mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3.5 py-2.5 text-sm border border-[#EAE4DA] rounded-lg font-mono focus:outline-none focus:border-[#B6862C]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] px-5 py-2.5 rounded-lg bg-[#141210] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#8C6218]"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Searching...' : 'Check Order Status'}</span>
          </button>
        </form>

        {error && (
          <div className="mt-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {error}
          </div>
        )}

        {order && (
          <div className="mt-6 pt-6 border-t border-[#EAE4DA] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PackageCheck className="w-5 h-5 text-[#8C6218]" />
                <span className="font-mono font-semibold text-[#141210]">{order.order_number}</span>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8C6218]">
                {order.status}
              </span>
            </div>

            {order.steadfast_tracking_code && (
              <div className="p-3.5 rounded-lg bg-[#FAF8F5] border border-[#EAE4DA] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#575148]">Steadfast Consignment</span>
                  <span className="font-mono font-semibold text-[#141210]">
                    {order.steadfast_consignment_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#575148]">Tracking Code</span>
                  <span className="font-mono text-[#141210]">{order.steadfast_tracking_code}</span>
                </div>
                {order.steadfast_status && (
                  <div className="flex justify-between">
                    <span className="text-[#575148]">Courier Status</span>
                    <span className="capitalize font-medium text-[#141210]">
                      {order.steadfast_status.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 text-sm">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs text-[#575148]">
                  <span>
                    {item.quantity}× {item.name} ({item.color}, {item.size})
                  </span>
                  <span className="tabular-nums font-medium text-[#141210]">
                    ৳{(item.unit_price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-[#EAE4DA] flex justify-between font-bold text-[#141210]">
                <span>Total (COD)</span>
                <span className="tabular-nums">৳{Math.round(order.total_amount).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
