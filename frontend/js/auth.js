// ─────────────────────────────────────────────────────────
// auth.js — Login & Signup logic for index.html
// ─────────────────────────────────────────────────────────

// Redirect if already logged in
window.addEventListener('DOMContentLoaded', async () => {
  if (!getToken()) return;

  const user = getUser();
  if (user && typeof user.isProfileComplete !== 'undefined') {
    window.location.href = user.isProfileComplete ? 'dashboard.html' : 'setup.html';
    return;
  }

  try {
    const data = await api.get('/auth/me');
    if (data?.user) {
      setUser(data.user);
      setRole(data.user.role);
      window.location.href = data.user.isProfileComplete ? 'dashboard.html' : 'setup.html';
    }
  } catch (err) {
    removeToken();
    removeUser();
  }
});

// ── Tab switcher ──────────────────────────────────────────
const switchTab = (tab) => {
  const loginForm  = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const loginTab   = document.getElementById('tab-login');
  const signupTab  = document.getElementById('tab-signup');
  const footerText = document.getElementById('auth-footer-text');
  const footerLink = document.getElementById('auth-footer-link');

  hideAlert('auth-alert');
  clearFieldErrors();

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    footerText.textContent = "Don't have an account?";
    footerLink.textContent = 'Sign Up';
    footerLink.onclick = () => { switchTab('signup'); return false; };
  } else {
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    footerText.textContent = 'Already have an account?';
    footerLink.textContent = 'Login';
    footerLink.onclick = () => { switchTab('login'); return false; };
  }
};

// ── Field error helpers ───────────────────────────────────
const setFieldError = (id, msg) => {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.toggle('hidden', !msg); }
};

const clearFieldErrors = () => {
  document.querySelectorAll('.field-error').forEach(el => {
    el.textContent = '';
    el.classList.add('hidden');
  });
};

// ── Login ─────────────────────────────────────────────────
const handleLogin = async (e) => {
  e.preventDefault();
  clearFieldErrors();
  hideAlert('auth-alert');

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  // Client-side validation
  let valid = true;
  if (!email) {
    setFieldError('login-email-err', 'Email is required'); valid = false;
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    setFieldError('login-email-err', 'Enter a valid email'); valid = false;
  }
  if (!password) {
    setFieldError('login-pw-err', 'Password is required'); valid = false;
  }
  if (!valid) return;

  setLoading('login-btn', true);

  try {
    const data = await api.post('/auth/login', { email, password });

    // Save token and user
    setToken(data.token);
    setUser(data.user);
    setRole(data.user.role);

    // Redirect based on profile completion
    if (data.user.isProfileComplete) {
      window.location.href = 'dashboard.html';
    } else {
      window.location.href = 'setup.html';
    }

  } catch (err) {
    showAlert('auth-alert', err.message || 'Login failed. Please try again.', 'error');
  } finally {
    setLoading('login-btn', false);
  }
};

// ── Signup ────────────────────────────────────────────────
const handleSignup = async (e) => {
  e.preventDefault();
  clearFieldErrors();
  hideAlert('auth-alert');

  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm  = document.getElementById('signup-confirm').value;

  // Client-side validation
  let valid = true;
  if (!name || name.length < 2) {
    setFieldError('signup-name-err', 'Name must be at least 2 characters'); valid = false;
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    setFieldError('signup-email-err', 'Enter a valid email'); valid = false;
  }
  if (!password || password.length < 6) {
    setFieldError('signup-pw-err', 'Password must be at least 6 characters'); valid = false;
  }
  if (password !== confirm) {
    setFieldError('signup-confirm-err', 'Passwords do not match'); valid = false;
  }
  if (!valid) return;

  setLoading('signup-btn', true);

  try {
    const data = await api.post('/auth/signup', { name, email, password });

    setToken(data.token);
    setUser(data.user);
    setRole(data.user.role);

    // New user always goes to setup first
    window.location.href = 'setup.html';

  } catch (err) {
    showAlert('auth-alert', err.message || 'Signup failed. Please try again.', 'error');
  } finally {
    setLoading('signup-btn', false);
  }
};