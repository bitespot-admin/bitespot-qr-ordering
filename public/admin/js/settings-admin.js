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
