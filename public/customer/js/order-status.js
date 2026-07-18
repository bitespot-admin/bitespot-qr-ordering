const STEPS = [
  { key: 'new', label: 'Received' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'served', label: 'Served' }
];

const STATUS_COPY = {
  new: { headline: 'Order received', sub: 'The kitchen has your order and will start on it shortly.' },
  preparing: { headline: 'Your food is cooking', sub: 'Your order is being prepared right now.' },
  served: { headline: 'Enjoy your meal!', sub: 'Your order has been served. Bon appétit!' },
  cancelled: { headline: 'Order cancelled', sub: 'This order was cancelled. Please speak to a member of staff.' }
};

let pollTimer = null;
let socket = null;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function init() {
  const orderId = sessionStorage.getItem('qr_last_order_id');
  const tableSlug = sessionStorage.getItem('qr_table_slug');

  document.getElementById('backBtn').addEventListener('click', goToMenu);

  if (!orderId || !tableSlug) {
    document.getElementById('statusBody').innerHTML =
      '<div class="empty-state">We couldn\'t find a recent order for this table. Place an order from the menu to track it here.</div>';
    return;
  }

  await load(orderId, tableSlug);

  // Real-time: join this order's room so the moment the kitchen updates
  // its status, this page updates instantly instead of waiting on a poll.
  socket = io();
  socket.emit('track-order', { orderId });
  socket.on('order:status', (payload) => {
    if (String(payload.id) === String(orderId)) load(orderId, tableSlug);
  });

  // Fallback only, in case the socket connection drops (e.g. patchy
  // restaurant wifi) — keeps the page eventually-correct either way.
  pollTimer = setInterval(() => load(orderId, tableSlug), 20000);
}

async function load(orderId, tableSlug) {
  try {
    const order = await Api.getOrderStatus(orderId, tableSlug);
    render(order);
    if (order.status === 'served' || order.status === 'cancelled') {
      clearInterval(pollTimer);
      if (socket) socket.disconnect();
    }
  } catch (err) {
    document.getElementById('statusBody').innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
    clearInterval(pollTimer);
    if (socket) socket.disconnect();
  }
}

function render(order) {
  const copy = STATUS_COPY[order.status] || STATUS_COPY.new;
  const isCancelled = order.status === 'cancelled';
  const currentIndex = STEPS.findIndex((s) => s.key === order.status);

  const stepsHtml = STEPS.map((step, i) => {
    let cls = '';
    if (isCancelled) {
      cls = i === 0 ? 'done' : '';
    } else if (i < currentIndex) cls = 'done';
    else if (i === currentIndex) cls = 'active';

    const icon =
      cls === 'done'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>'
        : i + 1;

    return `
      <div class="status-step ${cls}">
        <div class="dot">${icon}</div>
        <div class="label">${step.label}</div>
      </div>`;
  }).join('');

  const itemsHtml = order.items
    .map(
      (item) => `
      <div class="row">
        <span><span class="qty">${item.quantity}×</span>${escapeHtml(item.name)}</span>
        <span class="line-price">${formatNaira(item.price * item.quantity)}</span>
      </div>`
    )
    .join('');

  document.getElementById('statusBody').innerHTML = `
    <div class="status-tracker">
      <div class="status-steps ${isCancelled ? 'cancelled' : ''}">${isCancelled ? '' : stepsHtml}</div>
      <h1 class="status-headline">${copy.headline}</h1>
      <p class="status-sub">${copy.sub}</p>

      <div class="order-summary-card">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span style="font-family:var(--font-mono);font-size:12.5px;color:var(--cream-dim)">${escapeHtml(order.orderNumber)}</span>
          <span style="font-family:var(--font-mono);font-size:12.5px;color:var(--cream-dim)">${escapeHtml(order.tableLabel)}</span>
        </div>
        ${itemsHtml}
        <div class="total-row"><span>Total</span><span>${formatNaira(order.subtotal)}</span></div>
      </div>
    </div>
  `;
}

function goToMenu() {
  const restaurantSlug = sessionStorage.getItem('qr_restaurant_slug');
  const tableSlug = sessionStorage.getItem('qr_table_slug');
  location.href = restaurantSlug && tableSlug ? `/menu/${restaurantSlug}/${tableSlug}` : '/customer/menu.html';
}

init();
