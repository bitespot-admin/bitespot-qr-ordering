document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const errorBox = document.getElementById('formError');
  const btn = document.getElementById('submitBtn');
  
  errorBox.classList.remove('show');
  btn.disabled = true;
  btn.textContent = 'Logging in...';

  try {
    await AdminApi.login({
      username: document.getElementById('username').value.trim(),
      password: document.getElementById('password').value
    });
    location.href = '/admin/dashboard.html';
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Log In';
  }
});

const passwordInput = document.getElementById("password");
const toggleBtn = document.querySelector(".toggle-password");

toggleBtn.addEventListener("click", () => {
  const hidden = passwordInput.type === "password";

  passwordInput.type = hidden ? "text" : "password";
  toggleBtn.textContent = hidden ? "🙈" : "👁️";
  toggleBtn.setAttribute(
    "aria-label",
    hidden ? "Hide password" : "Show password"
  );
});
