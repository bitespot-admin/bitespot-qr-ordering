// Opens a small print-ready receipt in a new tab and triggers the browser's
// print dialog. Works with any printer the browser can already see —
// including thermal receipt printers registered as a system printer — so
// there's no vendor-specific driver/integration needed.
function printReceipt(restaurant, order) {
  const win = window.open('', '_blank', 'width=420,height=640');
  if (!win) {
    alert('Please allow pop-ups for this site to print receipts.');
    return;
  }

  const time = new Date(order.created_at || Date.now());
  const dateLabel = time.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeLabel = time.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

  const itemsHtml = order.items
    .map((item) => {
      const lineTotal = Number(item.item_price ?? item.price) * item.quantity;
      const name = escapeHtmlReceipt(item.item_name ?? item.name);
      return `
        <tr>
          <td class="qty">${item.quantity}×</td>
          <td class="name">${name}</td>
          <td class="amt">${formatNairaReceipt(lineTotal)}</td>
        </tr>`;
    })
    .join('');

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Receipt ${escapeHtmlReceipt(order.order_number)}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        * { box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          width: 300px;
          margin: 0 auto;
          padding: 16px 8px;
          color: #000;
          font-size: 13px;
        }
        h1 { font-size: 16px; text-align: center; margin: 0 0 2px; letter-spacing: 0.02em; }
        .meta { text-align: center; font-size: 11.5px; margin-bottom: 10px; color: #333; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 3px 0; vertical-align: top; }
        td.qty { width: 30px; }
        td.name { }
        td.amt { text-align: right; white-space: nowrap; }
        .total-row td { border-top: 1px dashed #000; padding-top: 6px; font-weight: bold; font-size: 14px; }
        .footer { text-align: center; margin-top: 16px; font-size: 12px; }
        .order-meta-row { display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 2px; }
      </style>
    </head>
    <body>
      <h1>${escapeHtmlReceipt(restaurant.name)}</h1>
      <div class="meta">${dateLabel} · ${timeLabel}</div>
      <div class="divider"></div>
      <div class="order-meta-row"><span>Order</span><span>${escapeHtmlReceipt(order.order_number)}</span></div>
      <div class="order-meta-row"><span>Table</span><span>${escapeHtmlReceipt(order.table_label ?? order.tableLabel)}</span></div>
      <div class="divider"></div>
      <table>
        ${itemsHtml}
        <tr class="total-row">
          <td colspan="2">Total</td>
          <td class="amt">${formatNairaReceipt(order.subtotal)}</td>
        </tr>
      </table>
      ${order.special_instructions ? `<div class="divider"></div><div style="font-size:11.5px">Note: ${escapeHtmlReceipt(order.special_instructions)}</div>` : ''}
      <div class="divider"></div>
      <div class="footer">Thank you for dining with us!</div>
      <script>
        window.onload = function () {
          window.print();
        };
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
}

function formatNairaReceipt(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

function escapeHtmlReceipt(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
