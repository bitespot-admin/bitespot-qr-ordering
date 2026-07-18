async function init() {
  const restaurant = await requireAuth();
  if (!restaurant) return;
  wireAdminChrome(restaurant);

  document.getElementById('settingsName').value = restaurant.name || '';
  document.getElementById('settingsPhone').value = restaurant.phone || '';
  document.getElementById('settingsAddress').value = restaurant.address || '';
  document.getElementById('settingsHours').value = restaurant.opening_hours || '';

  if (restaurant.logo_url) {
    const preview = document.getElementById('logoPreview');
    preview.src = restaurant.logo_url;
    preview.style.display = 'block';
  }

  document.getElementById('logoUploadBtn').addEventListener('click', () => document.getElementById('logoInput').click());
  document.getElementById('logoInput').addEventListener('change', uploadLogo);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('changePasswordBtn').addEventListener('click', changePassword);

  initFlyerSettings(restaurant);
  initCloudinarySettings();
}

async function initCloudinarySettings() {
  document.getElementById('saveCloudinaryBtn').addEventListener('click', saveCloudinaryCredentials);
  try {
    const creds = await AdminApi.getCloudinaryCredentials();
    const tag = document.getElementById('cloudinaryStatusTag');
    tag.innerHTML = creds.configured
      ? '<span class="tag tag-available">Connected</span>'
      : '<span class="tag tag-soldout">Not Set Up</span>';
    if (creds.cloudName) document.getElementById('cloudName').value = creds.cloudName;
    if (creds.apiKey) document.getElementById('cloudApiKey').value = creds.apiKey;
  } catch (err) {
    showToast(err.message, true);
  }
}

async function saveCloudinaryCredentials() {
  const cloudName = document.getElementById('cloudName').value.trim();
  const apiKey = document.getElementById('cloudApiKey').value.trim();
  const apiSecret = document.getElementById('cloudApiSecret').value.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return showToast('Cloud name, API key, and API secret are all required.', true);
  }

  const btn = document.getElementById('saveCloudinaryBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    await AdminApi.updateCloudinaryCredentials({ cloudName, apiKey, apiSecret });
    document.getElementById('cloudApiSecret').value = '';
    document.getElementById('cloudinaryStatusTag').innerHTML = '<span class="tag tag-available">Connected</span>';
    showToast('Cloudinary credentials saved.');
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Cloudinary Credentials';
  }
}

function initFlyerSettings(restaurant) {
  let flyerMode = restaurant.flyer_mode || 'default';

  if (restaurant.custom_flyer_url) {
    const preview = document.getElementById('customFlyerPreview');
    preview.src = restaurant.custom_flyer_url;
    preview.style.display = 'block';
  }

  renderFlyerModeButtons(flyerMode);

  document.getElementById('flyerModeDefaultBtn').addEventListener('click', () => setFlyerMode('default'));
  document.getElementById('flyerModeCustomBtn').addEventListener('click', () => setFlyerMode('custom'));
  document.getElementById('customFlyerUploadBtn').addEventListener('click', () => document.getElementById('customFlyerInput').click());
  document.getElementById('customFlyerInput').addEventListener('change', uploadCustomFlyer);

  async function setFlyerMode(mode) {
    flyerMode = mode;
    renderFlyerModeButtons(mode);
    try {
      await AdminApi.updateFlyerMode(mode);
      showToast(`Flyer mode set to ${mode}.`);
    } catch (err) {
      showToast(err.message, true);
    }
  }

  function renderFlyerModeButtons(mode) {
    const defaultBtn = document.getElementById('flyerModeDefaultBtn');
    const customBtn = document.getElementById('flyerModeCustomBtn');
    defaultBtn.className = `btn ${mode === 'default' ? 'btn-orange' : 'btn-outline'}`;
    customBtn.className = `btn ${mode === 'custom' ? 'btn-orange' : 'btn-outline'}`;
    document.getElementById('customFlyerUploadRow').style.display = mode === 'custom' ? 'flex' : 'none';
  }
}

async function uploadCustomFlyer(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('flyer', file);

  try {
    const { customFlyerUrl } = await AdminApi.updateCustomFlyer(formData);
    const preview = document.getElementById('customFlyerPreview');
    preview.src = customFlyerUrl;
    preview.style.display = 'block';
    showToast('Custom flyer uploaded. Regenerate each table\'s flyer to apply it.');
  } catch (err) {
    showToast(err.message, true);
  }
}

async function uploadLogo(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('logo', file);

  try {
    const { logoUrl } = await AdminApi.updateLogo(formData);
    const preview = document.getElementById('logoPreview');
    preview.src = logoUrl;
    preview.style.display = 'block';
    showToast('Logo updated.');
  } catch (err) {
    showToast(err.message, true);
  }
}

async function saveSettings() {
  const btn = document.getElementById('saveSettingsBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    await AdminApi.updateSettings({
      name: document.getElementById('settingsName').value.trim(),
      phone: document.getElementById('settingsPhone').value.trim(),
      address: document.getElementById('settingsAddress').value.trim(),
      openingHours: document.getElementById('settingsHours').value.trim()
    });
    showToast('Settings saved.');
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

async function changePassword() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return showToast('Enter your current password and a new password (6+ characters).', true);
  }

  const btn = document.getElementById('changePasswordBtn');
  btn.disabled = true;
  btn.textContent = 'Updating...';

  try {
    await AdminApi.changePassword({ currentPassword, newPassword });
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    showToast('Password updated.');
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update Password';
  }
}

init();
