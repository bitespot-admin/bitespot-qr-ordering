async function init() {
  const restaurant = await requireAuth();
  if (!restaurant) return;
  wireAdminChrome(restaurant);

  await loadOrders();
  setInterval(loadOrders, 8000); // kitchen screens poll for new orders
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
}

function renderOrderCard(order) {
  const time = new Date(order.created_at).toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit'
  });

  console.log(JSON.stringify(order, null, 2));

  let actions = '';
  if (order.status === 'new') {
    actions = `
      <button class="btn btn-orange" data-accept="${order.id}">Accept</button>
      <button class="btn btn-danger-outline" data-cancel="${order.id}">Decline</button>`;
  } else if (order.status === 'preparing') {
    actions = `
      <button class="btn btn-orange" data-serve="${order.id}">Mark as Served</button>`;
  }

  return `
    <div class="order-card is-${order.status}">
      <div class="top-row">
        <span class="table-name">${escapeHtml(order.table_label)}</span>
        <span class="order-time">${time}</span>
      </div>

      <div class="order-number">${escapeHtml(order.order_number)}</div>

      <ul>
        ${order.items.map((i) => `
          <li><b>${i.quantity}×</b> ${escapeHtml(i.item_name)}</li>
        `).join('')}
      </ul>

      <div class="order-total">
        💰 Total: <strong>₦${Number(order.subtotal).toLocaleString()}</strong>
      </div>

      ${order.special_instructions
        ? `<div class="instructions">📝 ${escapeHtml(order.special_instructions)}</div>`
        : ''}

      ${actions ? `<div class="actions">${actions}</div>` : ''}
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
