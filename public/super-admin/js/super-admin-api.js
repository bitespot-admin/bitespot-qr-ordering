// Mirrors admin-api.js's pattern but talks to /api/super-admin, which
// authenticates via the separate `super_token` cookie so it can never
// collide with a restaurant owner's session in the same browser.
const SuperAdminApi = {
  async _request(path, options = {}) {
    const res = await fetch('/api/super-admin' + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json.data !== undefined ? json.data : json;
  },

  login(body) { return this._request('/login', { method: 'POST', body: JSON.stringify(body) }); },
  logout() { return this._request('/logout', { method: 'POST' }); },
  me() { return this._request('/me'); },
  listRestaurants() { return this._request('/restaurants'); },
  createRestaurant(body) { return this._request('/restaurants', { method: 'POST', body: JSON.stringify(body) }); },
  setRestaurantStatus(id, status) {
    return this._request(`/restaurants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  }
};

async function requireSuperAdminAuth() {
  try {
    return await SuperAdminApi.me();
  } catch {
    location.href = '/super-admin/login.html';
    return null;
  }
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
