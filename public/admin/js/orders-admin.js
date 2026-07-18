let CURRENT_RESTAURANT = null;
let ORDERS_BY_ID = {};

async function init() {
  const restaurant = await requireAuth();
  if (!restaurant) return;
  CURRENT_RESTAURANT = restaurant;
  wireAdminChrome(restaurant);

  await loadOrders();

  // Real-time is the primary update path — the socket pushes the moment
  // an order is placed or its status changes, so the board reflects
  // reality within milliseconds instead of the old 8s poll delay.
  connectAdminRealtime({
    onNewOrder: () => loadOrders(),
    onOrderStatus: () => loadOrders(),
    onWaiterCall: (data) => showToast(`🔔 ${data.tableLabel} needs a waiter`)
  });

  // Kept as a safety net only — covers the rare case of a dropped socket
  // connection (e.g. wifi hiccup) reconnecting silently in the background.
  setInterval(loadOrders, 30000);
}

async function loadOrders() {
  try {
    const orders = await AdminApi.getOrders();
    renderBoard(orders);
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderBoard(orders) {
  const columns = { new: [], preparing: [], served: [] };
  orders.forEach((o) => {
    if (columns[o.status]) columns[o.status].push(o);
  });
  // Served column is a same-day log, not an unbounded archive.
  columns.served = columns.served.slice(0, 12);

  ORDERS_BY_ID = {};
  orders.forEach((o) => { ORDERS_BY_ID[o.id] = o; });

  Object.keys(columns).forEach((status) => {
    document.getElementById(`count-${status}`).textContent = columns[status].length;
    const col = document.getElementById(`col-${status}`);
    if (columns[status].length === 0) {
      col.innerHTML = '<div class="empty-state" style="padding:24px;font-size:13px">No orders</div>';
      return;
    }
    col.innerHTML = columns[status].map(renderOrderCard).join('');
  });

  document.querySelectorAll('[data-accept]').forEach((btn) => {
    btn.addEventListener('click', () => updateStatus(btn.dataset.accept, 'preparing'));
  });
  document.querySelectorAll('[data-serve]').forEach((btn) => {
    btn.addEventListener('click', () => updateStatus(btn.dataset.serve, 'served'));
  });
  document.querySelectorAll('[data-cancel]').forEach((btn) => {
    btn.addEventListener('click', () => cancelOrder(btn.dataset.cancel));
  });
  document.querySelectorAll('[data-print]').forEach((btn) => {
    btn.addEventListener('click', () => printReceipt(CURRENT_RESTAURANT, ORDERS_BY_ID[btn.dataset.print]));
  });
}

function renderOrderCard(order) {
  const time = new Date(order.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

  let actions = '';
  if (order.status === 'new') {
    actions = `
      <button class="btn btn-orange" data-accept="${order.id}">Accept</button>
      <button class="btn btn-danger-outline" data-cancel="${order.id}">Decline</button>`;
  } else if (order.status === 'preparing') {
    actions = `<button class="btn btn-orange" data-serve="${order.id}">Mark as Served</button>`;
  }

  return `
    <div class="order-card is-${order.status}">
      <div class="top-row">
        <span class="table-name">${escapeHtml(order.table_label)}</span>
        <span class="order-time">${time}</span>
      </div>
      <div class="order-number">${escapeHtml(order.order_number)}</div>
      <ul>
        ${order.items.map((i) => `<li><b>${i.quantity}×</b> ${escapeHtml(i.item_name)}</li>`).join('')}
      </ul>
      ${order.special_instructions ? `<div class="instructions">📝 ${escapeHtml(order.special_instructions)}</div>` : ''}
      <div class="actions">
        ${actions}
        <button class="btn btn-outline" data-print="${order.id}" title="Print receipt" style="flex:0 0 auto;padding:11px 14px">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        </button>
      </div>
    </div>`;
}

async function updateStatus(id, status) {
  try {
    await AdminApi.updateOrderStatus(id, status);
    loadOrders();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function cancelOrder(id) {
  if (!confirm('Decline this order?')) return;
  try {
    await AdminApi.updateOrderStatus(id, 'cancelled');
    loadOrders();
  } catch (err) {
    showToast(err.message, true);
  }
}

init();
