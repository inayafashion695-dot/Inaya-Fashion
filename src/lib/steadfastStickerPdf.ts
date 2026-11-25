import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { Order } from '../types/ecommerce';

// Code 128B encoding table for crisp vector courier barcodes
const CODE128B_PATTERNS: string[] = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
  '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
  '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
  '114131','311141','411131','211412','211214','211232','2331112'
];

function drawCode128Barcode(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const clean = text.replace(/[^\x20-\x7E]/g, '').slice(0, 24) || 'INAYA';
  const codes: number[] = [104]; // Start B
  let checksum = 104;
  for (let i = 0; i < clean.length; i++) {
    const val = clean.charCodeAt(i) - 32;
    codes.push(val);
    checksum += val * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(106); // Stop

  const patternStr = codes.map((c) => CODE128B_PATTERNS[c] || '212222').join('');
  const totalUnits = patternStr.split('').reduce((s, d) => s + Number(d), 0);
  const unitW = width / totalUnits;

  let cursorX = x;
  doc.setFillColor(20, 18, 16);
  for (let i = 0; i < patternStr.length; i++) {
    const barW = Number(patternStr[i]) * unitW;
    if (i % 2 === 0) {
      doc.rect(cursorX, y, barW, height, 'F');
    }
    cursorX += barW;
  }
}

async function renderStickerOnCanvasRect(
  doc: jsPDF,
  order: Order,
  ox: number,
  oy: number,
  w: number,
  h: number,
  brandName: string,
  brandPhone: string
) {
  const pad = 4;
  const innerW = w - pad * 2;

  // Outer label border
  doc.setDrawColor(20, 18, 16);
  doc.setLineWidth(0.45);
  doc.rect(ox + 1.5, oy + 1.5, w - 3, h - 3);

  // Header strip
  doc.setFillColor(20, 18, 16);
  doc.rect(ox + 1.5, oy + 1.5, w - 3, 13, 'F');
  doc.setTextColor(212, 168, 83);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(brandName.toUpperCase(), ox + pad + 1, oy + 8.5);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('STEADFAST COURIER', ox + w - pad - 1, oy + 7.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(brandPhone, ox + w - pad - 1, oy + 11.8, { align: 'right' });

  // Consignment / Order ID Row
  const cidLabel = order.steadfast_consignment_id
    ? `CID: ${order.steadfast_consignment_id}`
    : `ORD: ${order.order_number}`;
  const trackingLabel = order.steadfast_tracking_code
    ? `TRK: ${order.steadfast_tracking_code}`
    : `INV: ${order.order_number}`;

  doc.setTextColor(20, 18, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(cidLabel, ox + pad + 1, oy + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(trackingLabel, ox + w - pad - 1, oy + 20, { align: 'right' });

  // Barcode + QR Code
  const barcodeVal = String(order.steadfast_consignment_id || order.order_number);
  drawCode128Barcode(doc, barcodeVal, ox + pad + 1, oy + 22.5, innerW - 24, 13);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.text(barcodeVal, ox + (innerW - 24) / 2 + pad, oy + 38.5, { align: 'center' });

  try {
    const qrPayload = order.steadfast_tracking_code
      ? `https://steadfast.com.bd/t/${order.steadfast_tracking_code}`
      : `${order.order_number}|${order.customer_phone}|BDT${order.total_amount}`;
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 0, width: 140 });
    doc.addImage(qrDataUrl, 'PNG', ox + w - pad - 19, oy + 22, 18, 18);
  } catch {
    // QR fallback ignored
  }

  // Divider
  doc.setDrawColor(190, 184, 174);
  doc.setLineWidth(0.25);
  doc.line(ox + pad, oy + 42, ox + w - pad, oy + 42);

  // COD Box
  doc.setFillColor(248, 245, 239);
  doc.setDrawColor(20, 18, 16);
  doc.setLineWidth(0.35);
  doc.rect(ox + pad, oy + 44.5, innerW, 13, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 75, 68);
  doc.text('CASH ON DELIVERY (COD)', ox + pad + 3, oy + 49.5);
  doc.setFontSize(13);
  doc.setTextColor(20, 18, 16);
  doc.text(`BDT ${Math.round(order.total_amount).toLocaleString()}`, ox + pad + 3, oy + 55.2);

  doc.setFontSize(8);
  doc.text(
    order.delivery_zone === 'inside_dhaka' ? 'INSIDE DHAKA' : 'OUTSIDE DHAKA',
    ox + w - pad - 3,
    oy + 52.5,
    { align: 'right' }
  );

  // Recipient Block
  let curY = oy + 64;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 102, 92);
  doc.text('RECIPIENT DETAILS', ox + pad, curY);

  curY += 4.8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 18, 16);
  doc.text(order.customer_name, ox + pad, curY);

  curY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Phone: ${order.customer_phone}`, ox + pad, curY);

  curY += 4.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const addrLines = doc.splitTextToSize(order.customer_address, innerW - 2).slice(0, 3);
  doc.text(addrLines, ox + pad, curY);
  curY += addrLines.length * 4 + 3;

  // Divider
  doc.setDrawColor(210, 205, 196);
  doc.line(ox + pad, curY, ox + w - pad, curY);
  curY += 4.5;

  // Items Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 102, 92);
  doc.text(`PARCEL ITEMS (${order.items.reduce((s, i) => s + i.quantity, 0)} PCS)`, ox + pad, curY);
  curY += 4.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(20, 18, 16);
  const maxItemsY = oy + h - 14;
  for (const item of order.items) {
    if (curY > maxItemsY) {
      doc.text('...more items in parcel', ox + pad, curY);
      break;
    }
    const line = `${item.quantity}x ${item.name} [${item.color} / ${item.size}]`;
    const wrapped = doc.splitTextToSize(line, innerW - 2).slice(0, 2);
    doc.text(wrapped, ox + pad, curY);
    curY += wrapped.length * 3.6 + 1;
  }

  // Footer
  const footerY = oy + h - 7.5;
  doc.setDrawColor(210, 205, 196);
  doc.line(ox + pad, footerY - 3.5, ox + w - pad, footerY - 3.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(90, 84, 76);
  doc.text(`Invoice: ${order.order_number}`, ox + pad, footerY);
  doc.text(
    new Date(order.created_at).toLocaleDateString('en-GB'),
    ox + w - pad,
    footerY,
    { align: 'right' }
  );
}

export async function generateSteadfastStickerPdf(
  orders: Order[],
  options: {
    layout?: 'thermal_100x150' | 'a4_4up';
    brandName?: string;
    brandPhone?: string;
  } = {}
) {
  if (!orders.length) return;
  const layout = options.layout || 'thermal_100x150';
  const brandName = options.brandName || 'Inaya Fashion';
  const brandPhone = options.brandPhone || '+880 1712-345678';

  if (layout === 'thermal_100x150') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [100, 150],
    });
    for (let i = 0; i < orders.length; i++) {
      if (i > 0) doc.addPage([100, 150], 'portrait');
      await renderStickerOnCanvasRect(doc, orders[i], 0, 0, 100, 150, brandName, brandPhone);
    }
    const fileName =
      orders.length === 1
        ? `steadfast-sticker-${orders[0].order_number}.pdf`
        : `steadfast-stickers-bulk-${orders.length}-orders.pdf`;
    doc.save(fileName);
    return;
  }

  // A4 4-up grid (2x2 stickers per A4 sheet, each ~100x142mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  const marginX = 5;
  const marginY = 6;
  const cardW = 100;
  const cardH = 142;

  for (let i = 0; i < orders.length; i++) {
    const slot = i % 4;
    if (i > 0 && slot === 0) {
      doc.addPage('a4', 'portrait');
    }
    const col = slot % 2;
    const row = Math.floor(slot / 2);
    const ox = marginX + col * cardW;
    const oy = marginY + row * cardH;
    await renderStickerOnCanvasRect(doc, orders[i], ox, oy, cardW, cardH, brandName, brandPhone);
  }

  const fileName =
    orders.length === 1
      ? `steadfast-sticker-a4-${orders[0].order_number}.pdf`
      : `steadfast-stickers-a4-bulk-${orders.length}-orders.pdf`;
  doc.save(fileName);
}
