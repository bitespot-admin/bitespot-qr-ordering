// Thin fetch wrapper for the public (unauthenticated) customer endpoints.
const Api = {
  async getMenu(restaurantSlug, tableSlug) {
    const res = await fetch(`/api/public/menu/${restaurantSlug}/${tableSlug}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to load menu');
    return json.data;
  },

  async placeOrder({ restaurantSlug, tableSlug, items, specialInstructions }) {
    const res = await fetch('/api/public/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantSlug, tableSlug, items, specialInstructions })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to place order');
    return json.data;
  },

  async callWaiter({ restaurantSlug, tableSlug }) {
    const res = await fetch('/api/public/waiter-calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantSlug, tableSlug })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to call waiter');
    return json;
  },

  async getOrderStatus(orderId, tableSlug) {
    const res = await fetch(`/api/public/orders/${orderId}?table=${encodeURIComponent(tableSlug)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to load order status');
    return json.data;
  }
};

// Reads /menu/:restaurantSlug/:tableSlug straight from the URL —
// this is how the backend "already knows" the table once scanned.
function getSlugsFromUrl() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const menuIndex = parts.indexOf('menu');
  return {
    restaurantSlug: parts[menuIndex + 1],
    tableSlug: parts[menuIndex + 2]
  };
}

function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}
