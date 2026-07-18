let CATEGORIES = [];
let ITEMS = [];

async function init() {
  const restaurant = await requireAuth();
  if (!restaurant) return;
  wireAdminChrome(restaurant);

  await Promise.all([loadCategories(), loadItems()]);
  document.getElementById('addCategoryBtn').addEventListener('click', () => openCategoryModal());
  document.getElementById('addItemBtn').addEventListener('click', () => openItemModal());
}

/* ---------------- Categories ---------------- */
async function loadCategories() {
  try {
    CATEGORIES = await AdminApi.getCategories();
    renderCategories();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderCategories() {
  const body = document.getElementById('categoriesBody');
  if (CATEGORIES.length === 0) {
    body.innerHTML = '<div class="empty-state" style="padding:20px">No categories yet. Add one to organize your menu.</div>';
    return;
  }
  body.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      ${CATEGORIES.map(
        (c) => `
        <div style="display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:999px;padding:6px 6px 6px 14px">
          <span style="font-size:13.5px;font-weight:600">${escapeHtml(c.name)}</span>
          <button class="icon-btn" data-edit-cat="${c.id}" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
          <button class="icon-btn" data-del-cat="${c.id}" title="Delete" style="color:var(--clay)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/></svg></button>
        </div>`
      ).join('')}
    </div>`;

  body.querySelectorAll('[data-edit-cat]').forEach((btn) =>
    btn.addEventListener('click', () => openCategoryModal(CATEGORIES.find((c) => c.id == btn.dataset.editCat)))
  );
  body.querySelectorAll('[data-del-cat]').forEach((btn) =>
    btn.addEventListener('click', () => deleteCategory(btn.dataset.delCat))
  );
}

function openCategoryModal(category = null) {
  const isEdit = !!category;
  renderModal(`
    <div class="modal-header">
      <h2>${isEdit ? 'Edit Category' : 'Add Category'}</h2>
      <button class="icon-btn" id="closeModal">✕</button>
    </div>
    <div class="modal-body">
      <div class="field">
        <label>Category Name</label>
        <input type="text" id="catName" value="${isEdit ? escapeHtml(category.name) : ''}" placeholder="e.g. Burgers" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" id="cancelModal">Cancel</button>
      <button class="btn btn-orange" id="saveCatBtn">${isEdit ? 'Save Changes' : 'Add Category'}</button>
    </div>
  `);

  document.getElementById('saveCatBtn').addEventListener('click', async () => {
    const name = document.getElementById('catName').value.trim();
    if (!name) return showToast('Category name is required.', true);
    try {
      if (isEdit) {
        await AdminApi.updateCategory(category.id, { name, displayOrder: category.display_order });
      } else {
        await AdminApi.createCategory({ name });
      }
      closeModal();
      loadCategories();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

async function deleteCategory(id) {
  if (!confirm('Delete this category? Items in it will become uncategorized.')) return;
  try {
    await AdminApi.deleteCategory(id);
    loadCategories();
    loadItems();
  } catch (err) {
    showToast(err.message, true);
  }
}

/* ---------------- Menu items ---------------- */
async function loadItems() {
  try {
    ITEMS = await AdminApi.getMenuItems();
    renderItems();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderItems() {
  const body = document.getElementById('itemsBody');
  if (ITEMS.length === 0) {
    body.innerHTML = '<div class="empty-state" style="padding:20px">No menu items yet. Add your first dish.</div>';
    return;
  }

  body.innerHTML = `<div class="item-grid">
    ${ITEMS.map(
      (item) => `
      <div class="item-card">
        <img class="thumb" src="${item.image_url || placeholderImg()}" alt="${escapeHtml(item.name)}" />
        <div class="body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <h3>${escapeHtml(item.name)}</h3>
            <span class="tag ${item.is_available ? 'tag-available' : 'tag-soldout'}">${item.is_available ? 'Available' : 'Sold Out'}</span>
          </div>
          <p class="desc">${escapeHtml(item.description || '')}</p>
          <p class="price">${formatNaira(item.price)}</p>
          <div class="actions">
            <button class="btn btn-outline" data-edit-item="${item.id}">Edit</button>
            <button class="btn ${item.is_available ? 'btn-outline' : 'btn-orange'}" data-toggle-item="${item.id}">${item.is_available ? 'Mark Sold Out' : 'Mark Available'}</button>
          </div>
          <button class="btn btn-danger-outline btn-full" data-del-item="${item.id}" style="margin-top:8px;padding:8px;font-size:12.5px">Delete</button>
        </div>
      </div>`
    ).join('')}
  </div>`;

  body.querySelectorAll('[data-edit-item]').forEach((btn) =>
    btn.addEventListener('click', () => openItemModal(ITEMS.find((i) => i.id == btn.dataset.editItem)))
  );
  body.querySelectorAll('[data-toggle-item]').forEach((btn) =>
    btn.addEventListener('click', () => toggleAvailability(btn.dataset.toggleItem))
  );
  body.querySelectorAll('[data-del-item]').forEach((btn) =>
    btn.addEventListener('click', () => deleteItem(btn.dataset.delItem))
  );
}

function placeholderImg() {
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="130"><rect width="200" height="130" fill="#f7f7f8"/><text x="50%" y="50%" font-family="sans-serif" font-size="13" fill="#9a9ea8" text-anchor="middle" dy=".3em">No image</text></svg>'
  );
}

function openItemModal(item = null) {
  const isEdit = !!item;
  const categoryOptions = CATEGORIES.map(
    (c) => `<option value="${c.id}" ${isEdit && item.category_id == c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
  ).join('');

  renderModal(`
    <div class="modal-header">
      <h2>${isEdit ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
      <button class="icon-btn" id="closeModal">✕</button>
    </div>
    <div class="modal-body">
      <div class="field">
        <label>Name</label>
        <input type="text" id="itemName" value="${isEdit ? escapeHtml(item.name) : ''}" placeholder="e.g. Classic Beef Burger" />
      </div>
      <div class="field">
        <label>Description</label>
        <textarea id="itemDesc" rows="3" placeholder="Short description shown to customers">${isEdit ? escapeHtml(item.description || '') : ''}</textarea>
      </div>
      <div class="field">
        <label>Price (₦)</label>
        <input type="number" id="itemPrice" min="1" step="1" value="${isEdit ? item.price : ''}" placeholder="e.g. 4500" />
      </div>
      <div class="field">
        <label>Category</label>
        <select id="itemCategory">
          <option value="">Uncategorized</option>
          ${categoryOptions}
        </select>
      </div>
      <div class="field">
        <label>Image</label>
        <input type="file" id="itemImage" accept="image/png, image/jpeg, image/webp" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" id="cancelModal">Cancel</button>
      <button class="btn btn-orange" id="saveItemBtn">${isEdit ? 'Save Changes' : 'Add Item'}</button>
    </div>
  `);

  document.getElementById('saveItemBtn').addEventListener('click', async () => {
    const name = document.getElementById('itemName').value.trim();
    const price = document.getElementById('itemPrice').value;
    if (!name || !price || Number(price) <= 0) {
      return showToast('Name and a valid price are required.', true);
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', document.getElementById('itemDesc').value.trim());
    formData.append('price', price);
    formData.append('categoryId', document.getElementById('itemCategory').value);
    const file = document.getElementById('itemImage').files[0];
    if (file) formData.append('image', file);

    const saveBtn = document.getElementById('saveItemBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      if (isEdit) {
        await AdminApi.updateMenuItem(item.id, formData);
      } else {
        await AdminApi.createMenuItem(formData);
      }
      closeModal();
      loadItems();
    } catch (err) {
      showToast(err.message, true);
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? 'Save Changes' : 'Add Item';
    }
  });
}

async function toggleAvailability(id) {
  const item = ITEMS.find((i) => i.id == id);
  try {
    await AdminApi.setAvailability(id, !item.is_available);
    loadItems();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function deleteItem(id) {
  if (!confirm('Delete this menu item permanently?')) return;
  try {
    await AdminApi.deleteMenuItem(id);
    loadItems();
  } catch (err) {
    showToast(err.message, true);
  }
}

/* ---------------- Modal helper ---------------- */
function renderModal(innerHtml) {
  const root = document.getElementById('modalRoot');
  root.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal">${innerHtml}</div></div>`;
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelModal').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
}
function closeModal() {
  document.getElementById('modalRoot').innerHTML = '';
}

init();
