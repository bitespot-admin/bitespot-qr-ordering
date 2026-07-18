// Each admin page includes its own sidebar/header markup directly (with
// data-nav-active already set on the correct link). This helper just fills
// in the restaurant name once loaded, and wires the logout button.
function wireAdminChrome(restaurant) {
  const nameEl = document.getElementById('headerRestaurantName');
  if (nameEl) nameEl.textContent = restaurant?.name || '';

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await AdminApi.logout();
      location.href = '/admin/login.html';
    });
  }
}
