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
        ${
          t.qr_code_url
            ? `<img src="${t.qr_code_url}" alt="QR for ${escapeHtml(t.label)}" />`
            : `<div class="empty-state" style="padding:30px 10px;border:1px dashed var(--border);border-radius:12px;margin-bottom:14px;font-size:12.5px">Flyer not generated yet</div>`
        }
        <h3>${escapeHtml(t.label)}</h3>
        <div class="actions">
          ${
            t.qr_code_url
              ? `<a href="${t.qr_code_url}" download="${escapeHtml(t.slug)}-flyer.png" class="btn btn-outline">Download Flyer</a>`
              : ''
          }
          <button class="btn ${t.qr_code_url ? 'btn-outline' : 'btn-orange'}" data-regen-table="${t.id}">Regenerate Flyer</button>
        </div>
        <button class="btn btn-danger-outline btn-full" data-del-table="${t.id}" style="margin-top:8px;padding:8px;font-size:12.5px">Delete</button>
      </div>`
    ).join('')}
  </div>`;

  body.querySelectorAll('[data-del-table]').forEach((btn) =>
    btn.addEventListener('click', () => deleteTable(btn.dataset.delTable))
  );
  body.querySelectorAll('[data-regen-table]').forEach((btn) =>
    btn.addEventListener('click', () => regenerateFlyer(btn.dataset.regenTable, btn))
  );
}

async function regenerateFlyer(id, btn) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Regenerating...';
  try {
    await AdminApi.regenerateFlyer(id);
    showToast('Flyer regenerated.');
    loadTables();
  } catch (err) {
    showToast(err.message, true);
    btn.disabled = false;
    btn.textContent = original;
  }
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
      const result = await AdminApi.createTable({ label });
      closeModal();
      loadTables();
      if (result.flyerError) {
        showToast('Table added, but the flyer failed to generate — tap "Regenerate Flyer" to retry.', true);
      }
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
