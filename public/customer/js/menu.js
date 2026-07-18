let MENU = { restaurant: null, table: null, categories: [], items: [] };
let activeCategory = 'Popular';
let searchTerm = '';

const PLACEHOLDER_IMG =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#f7f7f8"/><text x="50%" y="50%" font-family="sans-serif" font-size="14" fill="#9a9ea8" text-anchor="middle" dy=".3em">No image</text></svg>'
  );

async function init() {
  const { restaurantSlug, tableSlug } = getSlugsFromUrl();
  if (!restaurantSlug || !tableSlug) {
    document.getElementById('foodList').innerHTML =
      '<div class="empty-state">This link is missing a table code. Please re-scan the QR code on your table.</div>';
    return;
  }

  try {
    const data = await Api.getMenu(restaurantSlug, tableSlug);
    MENU = data;
    // Persist so cart.html / success.html (loaded on separate navigations)
    // know which restaurant + table this session belongs to.
    sessionStorage.setItem('qr_restaurant_slug', data.restaurant.slug);
    sessionStorage.setItem('qr_table_slug', data.table.slug);
    sessionStorage.setItem('qr_restaurant_name', data.restaurant.name);
    sessionStorage.setItem('qr_table_label', data.table.label);

    document.getElementById('restaurantName').innerHTML = data.restaurant.name;
    document.getElementById('tableLabel').textContent = data.table.label.toUpperCase();
    document.title = data.restaurant.name + ' — Menu';

    renderCategoryTabs();
    renderFoodList();
    updateCartBadge();
  } catch (err) {
    document.getElementById('foodList').innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

function renderCategoryTabs() {
  const names = ['Popular', ...MENU.categories.map((c) => c.name)];
  const tabs = document.getElementById('categoryTabs');
  tabs.innerHTML = names
    .map(
      (name) =>
        `<button class="category-tab ${name === activeCategory ? 'active' : ''}" data-cat="${name}">${name}</button>`
    )
    .join('');
  tabs.querySelectorAll('.category-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderCategoryTabs();
      renderFoodList();
    });
  });
}

function getFilteredItems() {
  let items = MENU.items;
  if (activeCategory === 'Popular') {
    const popularOnly = items.filter((i) => i.is_popular);
    items = popularOnly.length ? popularOnly : items;
  } else {
    items = items.filter((i) => i.category_name === activeCategory);
  }
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(term));
  }
  return items;
}

function renderFoodList() {
  const list = document.getElementById('foodList');
  const items = getFilteredItems();

  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state">No dishes found. Try another category or search term.</div>';
    return;
  }

  list.innerHTML = items.map(renderFoodCard).join('');

  list.querySelectorAll('[data-open-item]').forEach((el) => {
    el.addEventListener('click', () => openItemDetail(el.dataset.openItem));
  });
  items.forEach((item) => wireStepper(item, list));
}

function renderFoodCard(item) {
  const qty = Cart.getQuantity(item.id);
  const img = item.image_url || PLACEHOLDER_IMG;
  return `
    <div class="food-card" data-card-id="${item.id}">
      <img class="thumb" src="${img}" alt="${escapeHtml(item.name)}" data-open-item="${item.id}" />
      <div class="body">
        ${item.is_popular ? '<span class="badge-popular">★ Popular</span>' : ''}
        <h3 data-open-item="${item.id}">${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description || '')}</p>
        <p class="price">${formatNaira(item.price)}</p>
        <div class="row">
          <div class="stepper" data-stepper="${item.id}">
            <button data-action="dec">−</button>
            <span data-qty>${qty}</span>
            <button data-action="inc">+</button>
          </div>
          <button class="btn-order" data-action="order" data-item-id="${item.id}">Order</button>
        </div>
      </div>
    </div>`;
}

function wireStepper(item, container) {
  const stepperEl = container.querySelector(`[data-stepper="${item.id}"]`);
  const cardEl = container.querySelector(`[data-card-id="${item.id}"]`);
  if (!stepperEl) return;

  const qtySpan = stepperEl.querySelector('[data-qty]');
  const orderBtn = cardEl.querySelector('[data-action="order"]');

  stepperEl.querySelector('[data-action="dec"]').addEventListener('click', () => {
    const newQty = Math.max(0, Cart.getQuantity(item.id) - 1);
    Cart.setQuantity(item, newQty);
    qtySpan.textContent = newQty;
    updateCartBadge();
  });
  stepperEl.querySelector('[data-action="inc"]').addEventListener('click', () => {
    const newQty = Cart.getQuantity(item.id) + 1;
    Cart.setQuantity(item, newQty);
    qtySpan.textContent = newQty;
    updateCartBadge();
  });
  orderBtn.addEventListener('click', () => {
    const current = Cart.getQuantity(item.id);
    const newQty = current === 0 ? 1 : current;
    Cart.setQuantity(item, newQty);
    qtySpan.textContent = newQty;
    updateCartBadge();
    showToast(`${item.name} added to your order`);
  });
}

function updateCartBadge() {
  const count = Cart.totalItems();
  document.getElementById('cartLabel').textContent = `Order (${count})`;
  document.getElementById('cartTotalLabel').textContent = count > 0 ? '· ' + formatNaira(Cart.subtotal()) : '';
}

function openItemDetail(itemId) {
  const item = MENU.items.find((i) => String(i.id) === String(itemId));
  if (!item) return;
  const qty = Math.max(1, Cart.getQuantity(item.id));
  const img = item.image_url || PLACEHOLDER_IMG;

  const root = document.getElementById('itemOverlayRoot');
  root.innerHTML = `
    <div class="item-overlay">
      <div style="position:relative">
        <img class="hero-image" src="${img}" alt="${escapeHtml(item.name)}" />
        <div class="hero-top">
          <button class="icon-btn" id="closeOverlay"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg></button>
        </div>
      </div>
      <div class="content">
        ${item.is_popular ? '<span class="badge-popular">★ Popular</span>' : ''}
        <h2>${escapeHtml(item.name)}</h2>
        <p class="price">${formatNaira(item.price)}</p>
        <p class="desc">${escapeHtml(item.description || '')}</p>
      </div>
      <div class="footer-row">
        <div class="stepper" id="overlayStepper">
          <button data-action="dec">−</button>
          <span data-qty>${qty}</span>
          <button data-action="inc">+</button>
        </div>
        <button class="btn-order" id="overlayOrderBtn">Order</button>
      </div>
    </div>`;

  let localQty = qty;
  const qtySpan = root.querySelector('[data-qty]');
  root.querySelector('#closeOverlay').addEventListener('click', () => (root.innerHTML = ''));
  root.querySelector('[data-action="dec"]').addEventListener('click', () => {
    localQty = Math.max(1, localQty - 1);
    qtySpan.textContent = localQty;
  });
  root.querySelector('[data-action="inc"]').addEventListener('click', () => {
    localQty += 1;
    qtySpan.textContent = localQty;
  });
  root.querySelector('#overlayOrderBtn').addEventListener('click', () => {
    Cart.setQuantity(item, localQty);
    updateCartBadge();
    renderFoodList();
    root.innerHTML = '';
    showToast(`${item.name} added to your order`);
  });
}

function showToast(message) {
  const root = document.getElementById('toastRoot');
  root.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
  setTimeout(() => (root.innerHTML = ''), 1800);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  searchTerm = e.target.value;
  renderFoodList();
});

document.getElementById('waiterBtn').addEventListener('click', async () => {
  const { restaurantSlug, tableSlug } = getSlugsFromUrl();
  try {
    await Api.callWaiter({ restaurantSlug, tableSlug });
    showToast('A waiter has been notified 👋');
  } catch (err) {
    showToast(err.message);
  }
});

init();
