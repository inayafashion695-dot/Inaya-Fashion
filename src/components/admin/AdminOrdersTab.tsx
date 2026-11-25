import {
  CheckSquare,
  Eye,
  Loader2,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Send,
  Square,
  X,
} from 'lucide-react';
import { useState } from 'react';
import {
  adminUpdateOrderStatus,
  dispatchOrderToSteadfast,
  syncSteadfastStatus,
} from '../../lib/api';
import { generateSteadfastStickerPdf } from '../../lib/steadfastStickerPdf';
import type { Order, OrderStatus, SiteSettings } from '../../types/ecommerce';

interface AdminOrdersTabProps {
  orders: Order[];
  settings: SiteSettings;
  onOrderUpdated: (order: Order) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export function AdminOrdersTab({
  orders,
  settings,
  onOrderUpdated,
  onToast,
}: AdminOrdersTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [printingBulk, setPrintingBulk] = useState(false);
  const [pdfLayout, setPdfLayout] = useState<'thermal_100x150' | 'a4_4up'>('thermal_100x150');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q) ||
        String(o.steadfast_consignment_id || '').includes(q)
      );
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((o) => selectedIds.includes(o.id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((o) => o.id));
    }
  };

  const handleStatusChange = async (order: Order, nextStatus: OrderStatus) => {
    setBusyOrderId(order.id);
    try {
      const updated = await adminUpdateOrderStatus(order.id, nextStatus);
      onOrderUpdated(updated);
      if (activeOrder?.id === order.id) setActiveOrder(updated);
      onToast(`Order #${order.order_number} marked as ${nextStatus}`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Status update failed', true);
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleSendToSteadfast = async (order: Order) => {
    if (order.steadfast_consignment_id) {
      onToast(`Already submitted (Consignment #${order.steadfast_consignment_id})`, true);
      return;
    }
    setBusyOrderId(order.id);
    try {
      const res = await dispatchOrderToSteadfast(order.id);
      onOrderUpdated(res.order);
      if (activeOrder?.id === order.id) setActiveOrder(res.order);
      onToast(
        `Dispatched to Steadfast! Consignment #${res.order.steadfast_consignment_id}`
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Steadfast submission failed', true);
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleSyncSteadfast = async (order: Order) => {
    if (!order.steadfast_consignment_id) return;
    setBusyOrderId(order.id);
    try {
      const res = await syncSteadfastStatus(order.id, order.steadfast_consignment_id);
      const updated: Order = {
        ...order,
        steadfast_status: res.delivery_status || order.steadfast_status,
      };
      onOrderUpdated(updated);
      if (activeOrder?.id === order.id) setActiveOrder(updated);
      onToast(`Courier status: ${(res.delivery_status || 'synced').replace(/_/g, ' ')}`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Status sync failed', true);
    } finally {
      setBusyOrderId(null);
    }
  };

  const handlePrintSingle = async (order: Order) => {
    try {
      await generateSteadfastStickerPdf([order], {
        layout: pdfLayout,
        brandName: settings.brand_name,
        brandPhone: settings.contact_phone,
      });
      onToast(`Sticker PDF downloaded for #${order.order_number}`);
    } catch {
      onToast('Could not generate sticker PDF', true);
    }
  };

  const handleBulkPrint = async () => {
    const selectedOrders = orders.filter((o) => selectedIds.includes(o.id));
    if (selectedOrders.length === 0) return;
    setPrintingBulk(true);
    try {
      await generateSteadfastStickerPdf(selectedOrders, {
        layout: pdfLayout,
        brandName: settings.brand_name,
        brandPhone: settings.contact_phone,
      });
      onToast(`Generated 1 bulk PDF with ${selectedOrders.length} shipping stickers`);
    } catch {
      onToast('Bulk PDF generation failed', true);
    } finally {
      setPrintingBulk(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search, Filter & Bulk Print Toolbar */}
      <div className="bg-white border border-[#EAE4DA] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#575148] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Order ID, phone, customer, consignment..."
              className="w-full pl-10 pr-3 py-2.5 text-sm bg-[#FAF8F5] border border-[#EAE4DA] rounded-xl focus:outline-none focus:border-[#B6862C]"
            />
          </div>

          <select
            aria-label="Filter orders by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
            className="min-h-[44px] px-3.5 py-2 text-sm bg-white border border-[#EAE4DA] rounded-xl focus:outline-none focus:border-[#B6862C]"
          >
            <option value="all">All Statuses ({orders.length})</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Bulk Sticker Bar */}
        <div className="pt-3 border-t border-[#F1ECE4] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAllVisible}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#EAE4DA] text-xs font-medium text-[#141210] flex items-center gap-2 hover:bg-[#FAF8F5]"
            >
              {allVisibleSelected ? (
                <CheckSquare className="w-4 h-4 text-[#8C6218]" />
              ) : (
                <Square className="w-4 h-4 text-[#7D756B]" />
              )}
              <span>
                {selectedIds.length > 0
                  ? `${selectedIds.length} Selected`
                  : 'Select All'}
              </span>
            </button>

            <select
              aria-label="Sticker PDF page format"
              value={pdfLayout}
              onChange={(e) => setPdfLayout(e.target.value as 'thermal_100x150' | 'a4_4up')}
              className="min-h-[40px] px-2.5 py-1.5 text-xs border border-[#EAE4DA] rounded-lg bg-[#FAF8F5]"
            >
              <option value="thermal_100x150">Thermal 100×150mm (4×6")</option>
              <option value="a4_4up">A4 Sheet (4 Stickers/Page)</option>
            </select>
          </div>

          <button
            type="button"
            disabled={selectedIds.length === 0 || printingBulk}
            onClick={handleBulkPrint}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#141210] text-white text-xs font-semibold flex items-center gap-2 hover:bg-[#8C6218] disabled:opacity-40 transition-colors"
          >
            {printingBulk ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4 text-[#E6C885]" />
            )}
            <span>Print Bulk Stickers ({selectedIds.length})</span>
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#EAE4DA] rounded-2xl p-10 text-center">
          <p className="text-base font-medium text-[#141210]">No orders match your filters</p>
          <p className="mt-1 text-xs text-[#575148]">
            New orders placed by customers will appear here instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const isSelected = selectedIds.includes(order.id);
            const isBusy = busyOrderId === order.id;

            return (
              <div
                key={order.id}
                className={`bg-white border rounded-2xl p-4 transition-colors ${
                  isSelected ? 'border-[#B6862C] bg-[#FFFDF9]' : 'border-[#EAE4DA]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleSelect(order.id)}
                      aria-label={`Select order ${order.order_number}`}
                      className="min-h-[40px] min-w-[36px] flex items-center justify-center text-[#575148]"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[#8C6218]" />
                      ) : (
                        <Square className="w-5 h-5 text-[#C4BCAE]" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#575148]">
                        <span className="font-mono font-semibold text-[#141210]">
                          {order.order_number}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(order.created_at).toLocaleDateString('en-GB')}</span>
                        <span aria-hidden="true">·</span>
                        <span className="uppercase font-medium text-[#8C6218]">
                          {order.status}
                        </span>
                      </div>

                      <h3 className="mt-1 text-base font-semibold text-[#141210] truncate">
                        {order.customer_name}
                      </h3>
                      <p className="text-xs text-[#575148] truncate">
                        {order.customer_phone} · {order.customer_address}
                      </p>

                      {order.steadfast_consignment_id && (
                        <div className="mt-1.5 text-xs font-mono text-emerald-800">
                          Steadfast CID #{order.steadfast_consignment_id}
                          {order.steadfast_status ? ` · ${order.steadfast_status.replace(/_/g, ' ')}` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-[#141210] tabular-nums">
                      ৳{Math.round(order.total_amount).toLocaleString()}
                    </div>
                    <div className="text-[11px] text-[#7D756B]">
                      {order.items.reduce((s, i) => s + i.quantity, 0)} pcs
                    </div>
                  </div>
                </div>

                {/* Mobile-Friendly Action Strip */}
                <div className="mt-3 pt-3 border-t border-[#F1ECE4] flex flex-wrap items-center gap-2">
                  <select
                    aria-label={`Change status for ${order.order_number}`}
                    value={order.status}
                    disabled={isBusy}
                    onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)}
                    className="min-h-[40px] px-2.5 py-1.5 text-xs border border-[#EAE4DA] rounded-lg bg-[#FAF8F5] font-medium"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>

                  <a
                    href={`tel:${order.customer_phone.replace(/\s+/g, '')}`}
                    className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#EAE4DA] text-xs font-medium text-[#141210] flex items-center gap-1.5 hover:bg-[#FAF8F5]"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#8C6218]" />
                    <span>Call</span>
                  </a>

                  {!order.steadfast_consignment_id ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSendToSteadfast(order)}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#141210] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#8C6218] disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-[#E6C885]" />
                      )}
                      <span>Send to Steadfast</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSyncSteadfast(order)}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-medium flex items-center gap-1.5 hover:bg-emerald-100"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                      <span>Sync Courier</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handlePrintSingle(order)}
                    className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#EAE4DA] text-xs font-medium text-[#141210] flex items-center gap-1.5 hover:bg-[#FAF8F5]"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Sticker</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveOrder(order)}
                    className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#EAE4DA] text-xs font-medium text-[#575148] flex items-center gap-1.5 hover:text-[#141210] ml-auto"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Bottom Sheet / Modal */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EAE4DA] flex items-center justify-between bg-[#FAF8F5]">
              <div>
                <h3 className="font-mono font-bold text-base text-[#141210]">
                  {activeOrder.order_number}
                </h3>
                <p className="text-xs text-[#575148]">
                  {new Date(activeOrder.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveOrder(null)}
                aria-label="Close order details"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#575148]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              <div className="bg-[#FAF8F5] border border-[#EAE4DA] rounded-xl p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#141210]">{activeOrder.customer_name}</span>
                  <a
                    href={`tel:${activeOrder.customer_phone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#8C6218]"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{activeOrder.customer_phone}</span>
                  </a>
                </div>
                <p className="text-xs text-[#575148]">{activeOrder.customer_address}</p>
                {activeOrder.notes && (
                  <p className="text-xs text-[#8C6218] pt-1">Note: {activeOrder.notes}</p>
                )}
              </div>

              {activeOrder.steadfast_consignment_id && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-xs space-y-1 text-emerald-950">
                  <div className="flex justify-between">
                    <span>Consignment ID</span>
                    <span className="font-mono font-bold">{activeOrder.steadfast_consignment_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tracking Code</span>
                    <span className="font-mono">{activeOrder.steadfast_tracking_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Steadfast Status</span>
                    <span className="capitalize font-semibold">
                      {(activeOrder.steadfast_status || 'in_review').replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#575148]">
                  Ordered Items
                </h4>
                {activeOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 pb-2.5 border-b border-[#F1ECE4]">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-14 object-cover rounded-lg bg-[#FAF8F5] shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#141210] truncate">{item.name}</p>
                      <p className="text-[11px] text-[#575148]">
                        {item.color} · Size {item.size} · Qty {item.quantity}
                      </p>
                    </div>
                    <span className="text-xs font-semibold tabular-nums">
                      ৳{(item.unit_price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 text-xs pt-2">
                <div className="flex justify-between text-[#575148]">
                  <span>Subtotal</span>
                  <span className="tabular-nums">৳{Math.round(activeOrder.subtotal).toLocaleString()}</span>
                </div>
                {activeOrder.threshold_discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Threshold Discount</span>
                    <span className="tabular-nums">-৳{Math.round(activeOrder.threshold_discount).toLocaleString()}</span>
                  </div>
                )}
                {activeOrder.coupon_discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Coupon ({activeOrder.coupon_code})</span>
                    <span className="tabular-nums">-৳{Math.round(activeOrder.coupon_discount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#575148]">
                  <span>Delivery Charge</span>
                  <span className="tabular-nums">৳{Math.round(activeOrder.delivery_charge).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#141210] pt-2 border-t border-[#EAE4DA]">
                  <span>Total COD</span>
                  <span className="tabular-nums">৳{Math.round(activeOrder.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#EAE4DA] bg-[#FAF8F5] flex gap-2">
              <button
                type="button"
                onClick={() => handlePrintSingle(activeOrder)}
                className="flex-1 min-h-[44px] rounded-xl border border-[#141210] text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Sticker PDF</span>
              </button>
              {!activeOrder.steadfast_consignment_id && (
                <button
                  type="button"
                  onClick={() => handleSendToSteadfast(activeOrder)}
                  className="flex-1 min-h-[44px] rounded-xl bg-[#141210] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4 text-[#E6C885]" />
                  <span>Send to Steadfast</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
