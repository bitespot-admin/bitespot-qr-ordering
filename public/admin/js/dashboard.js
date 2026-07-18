async function init() {
  const restaurant = await requireAuth();
  if (!restaurant) return;
  wireAdminChrome(restaurant);

  await Promise.all([loadStats(), loadWaiterCalls()]);

  connectAdminRealtime({
    onNewOrder: () => loadStats(),
    onOrderStatus: () => loadStats(),
    onWaiterCall: () => loadWaiterCalls()
  });

  // Fallback only, in case the socket connection drops silently.
  setInterval(loadWaiterCalls, 30000);
}

async function loadStats() {
  try {
    const { statusCounts, popularDishes } = await AdminApi.getDashboardStats();
    const counts = { new: 0, preparing: 0, served: 0 };
    statusCounts.forEach((row) => { if (counts[row.status] !== undefined) counts[row.status] = row.count; });

    document.getElementById('statGrid').innerHTML = `
      <div class="stat-card orange"><div class="label">New Orders</div><div class="value">${counts.new}</div></div>
      <div class="stat-card"><div class="label">Preparing</div><div class="value">${counts.preparing}</div></div>
      <div class="stat-card"><div class="label">Served Today</div><div class="value">${counts.served}</div></div>
    `;

    const popularBody = document.getElementById('popularBody');
    if (popularDishes.length === 0) {
      popularBody.innerHTML = '<div class="empty-state" style="padding:24px">No orders yet today.</div>';
    } else {
      popularBody.innerHTML = `
        <table class="data-table">
          <thead><tr><th>Dish</th><th>Ordered</th></tr></thead>
          <tbody>
            ${popularDishes.map((d) => `<tr><td>${escapeHtml(d.item_name)}</td><td>${d.total_ordered}</td></tr>`).join('')}
          </tbody>
        </table>`;
    }
  } catch (err) {
    showToast(err.message, true);
  }
}

async function loadWaiterCalls() {
  try {
    const calls = await AdminApi.getWaiterCalls();
    const body = document.getElementById('waiterCallsBody');

    if (calls.length === 0) {
      body.innerHTML = '<div class="empty-state" style="padding:24px">No pending requests.</div>';
      return;
    }

    body.innerHTML = calls
      .map(
        (call) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
        <div>
          <strong>${escapeHtml(call.table_label)}</strong>
          <div style="font-size:12.5px;color:var(--cream-dim)">needs assistance</div>
        </div>
        <button class="btn btn-orange" style="padding:8px 14px;font-size:13px" data-ack="${call.id}">Acknowledge</button>
      </div>`
      )
      .join('');

    body.querySelectorAll('[data-ack]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await AdminApi.acknowledgeWaiterCall(btn.dataset.ack);
          loadWaiterCalls();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  } catch (err) {
    showToast(err.message, true);
  }
}

init();
