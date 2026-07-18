let RESTAURANTS = [];

async function init() {
  const admin = await requireSuperAdminAuth();
  if (!admin) return;
  document.getElementById('headerName').textContent = admin.username;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await SuperAdminApi.logout();
    location.href = '/super-admin/login.html';
  });
  document.getElementById('addRestaurantBtn').addEventListener('click', openCreateModal);

  await loadRestaurants();
}

async function loadRestaurants() {
  try {
    RESTAURANTS = await SuperAdminApi.listRestaurants();
    renderStats();
    renderTable();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderStats() {
  const active = RESTAURANTS.filter((r) => r.status === 'active').length;
  const suspended = RESTAURANTS.filter((r) => r.status === 'suspended').length;
  document.getElementById('statTotal').textContent = RESTAURANTS.length;
  document.getElementById('statActive').textContent = active;
  document.getElementById('statSuspended').textContent = suspended;
}

function renderTable() {
  const body = document.getElementById('restaurantsBody');
  if (RESTAURANTS.length === 0) {
    body.innerHTML = '<div class="empty-state" style="padding:20px">No restaurants yet. Create the first one.</div>';
    return;
  }

  body.innerHTML = `
    <table class="data-table">
      <thead>
        <tr><th>Restaurant</th><th>Owner Username</th><th>Slug</th><th>Status</th><th>Created</th><th></th></tr>
      </thead>
      <tbody>
        ${RESTAURANTS.map((r) => `
          <tr>
            <td>${escapeHtml(r.name)}</td>
            <td>${escapeHtml(r.owner_username)}</td>
            <td style="font-family:var(--font-mono);font-size:12.5px;color:var(--cream-dim)">${escapeHtml(r.slug)}</td>
            <td><span class="tag ${r.status === 'active' ? 'tag-available' : 'tag-soldout'}">${r.status}</span></td>
            <td style="font-family:var(--font-mono);font-size:12.5px;color:var(--cream-dim)">${new Date(r.created_at).toLocaleDateString()}</td>
            <td>
              <button class="btn ${r.status === 'active' ? 'btn-danger-outline' : 'btn-outline'}" style="padding:7px 12px;font-size:12px" data-toggle="${r.id}" data-current="${r.status}">
                ${r.status === 'active' ? 'Suspend' : 'Activate'}
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  body.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => toggleStatus(btn.dataset.toggle, btn.dataset.current));
  });
}

async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
  const verb = newStatus === 'suspended' ? 'suspend' : 'activate';
  if (!confirm(`Are you sure you want to ${verb} this restaurant?`)) return;

  try {
    await SuperAdminApi.setRestaurantStatus(id, newStatus);
    showToast(`Restaurant ${newStatus}.`);
    loadRestaurants();
  } catch (err) {
    showToast(err.message, true);
  }
}

function openCreateModal() {
  const root = document.getElementById('modalRoot');
  root.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal">
        <div class="modal-header">
          <h2>Create Restaurant</h2>
          <button class="icon-btn" id="closeModal">✕</button>
        </div>
        <div class="modal-body" id="modalBody">
          <div class="field">
            <label>Restaurant Name</label>
            <input type="text" id="newRestaurantName" placeholder="e.g. Bella Kitchen" />
          </div>
          <div class="field">
            <label>Owner Username</label>
            <input type="text" id="newUsername" placeholder="e.g. bella_owner" />
          </div>
          <div class="field">
            <label>Owner Password</label>
            <input type="password" id="newPassword" placeholder="At least 6 characters" />
          </div>
          <div style="border-top:1px solid var(--border);margin:18px 0 16px;padding-top:16px">
            <p style="font-size:12.5px;color:var(--cream-dim);margin:0 0 14px">
              Each restaurant hosts its own images on its own Cloudinary account. Create a free account at
              <a href="https://cloudinary.com" target="_blank" style="color:var(--ember-bright)">cloudinary.com</a>
              for this restaurant and paste its credentials here (found on their dashboard home page).
            </p>
            <div class="field">
              <label>Cloudinary Cloud Name</label>
              <input type="text" id="newCloudName" placeholder="e.g. dxyzabc123" />
            </div>
            <div class="field">
              <label>Cloudinary API Key</label>
              <input type="text" id="newApiKey" placeholder="e.g. 123456789012345" />
            </div>
            <div class="field">
              <label>Cloudinary API Secret</label>
              <input type="password" id="newApiSecret" placeholder="Kept encrypted, never shown again" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="cancelModal">Cancel</button>
          <button class="btn btn-orange" id="saveRestaurantBtn">Create</button>
        </div>
      </div>
    </div>`;

  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelModal').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });

  document.getElementById('saveRestaurantBtn').addEventListener('click', async () => {
    const restaurantName = document.getElementById('newRestaurantName').value.trim();
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const cloudinaryCloudName = document.getElementById('newCloudName').value.trim();
    const cloudinaryApiKey = document.getElementById('newApiKey').value.trim();
    const cloudinaryApiSecret = document.getElementById('newApiSecret').value.trim();

    if (!restaurantName || !username || !password) {
      return showToast('Restaurant name, username, and password are required.', true);
    }
    if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
      return showToast('Cloudinary cloud name, API key, and API secret are all required.', true);
    }

    const btn = document.getElementById('saveRestaurantBtn');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
      const result = await SuperAdminApi.createRestaurant({
        restaurantName,
        username,
        password,
        cloudinaryCloudName,
        cloudinaryApiKey,
        cloudinaryApiSecret
      });
      showCredentials(result);
      loadRestaurants();
    } catch (err) {
      showToast(err.message, true);
      btn.disabled = false;
      btn.textContent = 'Create';
    }
  });
}

// After creation, show the credentials once so the super admin can copy
// them to hand to the restaurant owner — they're never shown again.
function showCredentials(result) {
  const modalBody = document.getElementById('modalBody');
  const modalFooter = document.querySelector('.modal-footer');
  modalBody.innerHTML = `
    <p style="font-size:13.5px;color:var(--cream-dim);margin-bottom:16px">
      Restaurant created. Copy these credentials now — they won't be shown again.
    </p>
    <div style="background:var(--char);border:1px solid var(--border);border-radius:10px;padding:16px;font-family:var(--font-mono);font-size:13.5px;line-height:2">
      <div>Restaurant: <strong style="color:var(--ember-bright)">${escapeHtml(result.name)}</strong></div>
      <div>Login URL: <strong style="color:var(--ember-bright)">/admin/login.html</strong></div>
      <div>Username: <strong style="color:var(--ember-bright)">${escapeHtml(result.username)}</strong></div>
      <div>Password: <strong style="color:var(--ember-bright)">${escapeHtml(result.password)}</strong></div>
    </div>`;
  modalFooter.innerHTML = `<button class="btn btn-orange" id="doneModal">Done</button>`;
  document.getElementById('doneModal').addEventListener('click', closeModal);
}

function closeModal() {
  document.getElementById('modalRoot').innerHTML = '';
}

init();
