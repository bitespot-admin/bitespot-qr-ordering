let TABLES = [];

async function init() {
  const restaurant = await requireAuth();
  if (!restaurant) return;
  wireAdminChrome(restaurant);

  await loadTables();
  document.getElementById('addTableBtn').addEventListener('click', openAddTableModal);
}

async function loadTables() {
  try {
    TABLES = await AdminApi.getTables();
    renderTables();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderTables() {
  const body = document.getElementById('tablesBody');
  if (TABLES.length === 0) {
    body.innerHTML = '<div class="empty-state" style="padding:20px">No tables yet. Add your first table to generate its branded QR flyer.</div>';
    return;
  }

  body.innerHTML = `<div class="table-grid">
    ${TABLES.map(
      (t) => `
      <div class="table-card">
        <img src="${t.qr_code_url}" alt="QR for ${escapeHtml(t.label)}" />
        <h3>${escapeHtml(t.label)}</h3>
        <div class="actions">
          <a href="${t.qr_code_url}" download="${escapeHtml(t.slug)}-flyer.png" class="btn btn-outline">Download Flyer</a>
          <button class="btn btn-danger-outline" data-del-table="${t.id}">Delete</button>
        </div>
      </div>`
    ).join('')}
  </div>`;

  body.querySelectorAll('[data-del-table]').forEach((btn) =>
    btn.addEventListener('click', () => deleteTable(btn.dataset.delTable))
  );
}

function openAddTableModal() {
  const root = document.getElementById('modalRoot');
  root.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal">
        <div class="modal-header">
          <h2>Add Table</h2>
          <button class="icon-btn" id="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Table Label</label>
            <input type="text" id="tableLabel" placeholder="e.g. Table 4" />
          </div>
          <p style="font-size:13px;color:var(--cream-dim)">A branded QR flyer with your restaurant's name will be generated automatically once you add this table.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="cancelModal">Cancel</button>
          <button class="btn btn-orange" id="saveTableBtn">Add Table</button>
        </div>
      </div>
    </div>`;

  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelModal').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });

  document.getElementById('saveTableBtn').addEventListener('click', async () => {
    const label = document.getElementById('tableLabel').value.trim();
    if (!label) return showToast('Table label is required.', true);

    const btn = document.getElementById('saveTableBtn');
    btn.disabled = true;
    btn.textContent = 'Generating flyer...';

    try {
      await AdminApi.createTable({ label });
      closeModal();
      loadTables();
    } catch (err) {
      showToast(err.message, true);
      btn.disabled = false;
      btn.textContent = 'Add Table';
    }
  });
}

async function deleteTable(id) {
  if (!confirm('Delete this table? Its QR code will stop working.')) return;
  try {
    await AdminApi.deleteTable(id);
    loadTables();
  } catch (err) {
    showToast(err.message, true);
  }
}

function closeModal() {
  document.getElementById('modalRoot').innerHTML = '';
}

init();
