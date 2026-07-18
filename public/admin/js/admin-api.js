// All admin requests use credentials:'include' so the HttpOnly JWT cookie
// is sent automatically — the token is never read or stored in JS.
const AdminApi = {
  async _request(path, options = {}) {
    const res = await fetch('/api' + path, {
      credentials: 'include',
      headers: options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
      ...options
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json.data !== undefined ? json.data : json;
  },

  // Auth
  register(body) { return this._request('/auth/register', { method: 'POST', body: JSON.stringify(body) }); },
  login(body) { return this._request('/auth/login', { method: 'POST', body: JSON.stringify(body) }); },
  logout() { return this._request('/auth/logout', { method: 'POST' }); },
  me() { return this._request('/auth/me'); },
  changePassword(body) { return this._request('/auth/password', { method: 'PATCH', body: JSON.stringify(body) }); },

  // Categories
  getCategories() { return this._request('/categories'); },
  createCategory(body) { return this._request('/categories', { method: 'POST', body: JSON.stringify(body) }); },
  updateCategory(id, body) { return this._request(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }); },
  deleteCategory(id) { return this._request(`/categories/${id}`, { method: 'DELETE' }); },

  // Menu items
  getMenuItems() { return this._request('/menu-items'); },
  createMenuItem(formData) { return this._request('/menu-items', { method: 'POST', body: formData }); },
  updateMenuItem(id, formData) { return this._request(`/menu-items/${id}`, { method: 'PATCH', body: formData }); },
  setAvailability(id, isAvailable) { return this._request(`/menu-items/${id}/availability`, { method: 'PATCH', body: JSON.stringify({ isAvailable }) }); },
  deleteMenuItem(id) { return this._request(`/menu-items/${id}`, { method: 'DELETE' }); },

  // Tables
  getTables() { return this._request('/tables'); },
  createTable(body) { return this._request('/tables', { method: 'POST', body: JSON.stringify(body) }); },
  regenerateFlyer(id) { return this._request(`/tables/${id}/regenerate-flyer`, { method: 'PATCH' }); },
  deleteTable(id) { return this._request(`/tables/${id}`, { method: 'DELETE' }); },

  // Orders
  getOrders(status) { return this._request('/orders' + (status ? `?status=${status}` : '')); },
  updateOrderStatus(id, status) { return this._request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); },
  getDashboardStats() { return this._request('/orders/dashboard-stats'); },

  // Waiter calls
  getWaiterCalls() { return this._request('/waiter-calls'); },
  acknowledgeWaiterCall(id) { return this._request(`/waiter-calls/${id}/acknowledge`, { method: 'PATCH' }); },

  // Settings
  updateSettings(body) { return this._request('/settings', { method: 'PATCH', body: JSON.stringify(body) }); },
  updateLogo(formData) { return this._request('/settings/logo', { method: 'PATCH', body: formData }); },
  updateFlyerMode(flyerMode) { return this._request('/settings/flyer-mode', { method: 'PATCH', body: JSON.stringify({ flyerMode }) }); },
  updateCustomFlyer(formData) { return this._request('/settings/custom-flyer', { method: 'PATCH', body: formData }); },
  getCloudinaryCredentials() { return this._request('/settings/cloudinary'); },
  updateCloudinaryCredentials(body) { return this._request('/settings/cloudinary', { method: 'PATCH', body: JSON.stringify(body) }); }
};

function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showToast(message, isError = false) {
  let root = document.getElementById('toastRoot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toastRoot';
    document.body.appendChild(root);
  }
  root.innerHTML = `<div class="toast ${isError ? 'error' : ''}">${escapeHtml(message)}</div>`;
  setTimeout(() => (root.innerHTML = ''), 2500);
}

// Guards admin pages: redirects to login if the session cookie is missing/expired.
async function requireAuth() {
  try {
    return await AdminApi.me();
  } catch {
    location.href = '/admin/login.html';
    return null;
  }
}
