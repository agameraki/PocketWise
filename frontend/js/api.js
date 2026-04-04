// ─────────────────────────────────────────────────────────
// api.js — Central Fetch Wrapper
// Every JS file uses this. Never write raw fetch() elsewhere.
// ─────────────────────────────────────────────────────────

// Auto-detect: use current host in production, localhost in dev
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : `${window.location.origin}/api`;

// ── Token helpers ─────────────────────────────────────────
const getToken  = ()        => localStorage.getItem('pw_token');
const setToken  = (token)   => localStorage.setItem('pw_token', token);
const removeToken = ()      => localStorage.removeItem('pw_token');

const getUser   = ()        => {
  try {
    return JSON.parse(localStorage.getItem('pw_user'));
  } catch { return null; }
};
const setUser   = (user)    => localStorage.setItem('pw_user', JSON.stringify(user));
const removeUser = ()       => localStorage.removeItem('pw_user');

// ── Auth guard — redirect to login if no token ────────────
const requireAuth = () => {
  if (!getToken()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
};

// ── Logout ────────────────────────────────────────────────
const logout = () => {
  removeToken();
  removeUser();
  window.location.href = 'index.html';
};

// ─────────────────────────────────────────────────────────
// CORE REQUEST FUNCTION
// ─────────────────────────────────────────────────────────
const request = async (method, endpoint, body = null, isFormData = false) => {
  const headers = {};

  // Attach token if available
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Only set Content-Type for JSON (not FormData)
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const config = { method, headers };
  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  try {
    const res  = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await res.json();

    // Token expired or invalid — force logout
    if (res.status === 401) {
      removeToken();
      removeUser();
      window.location.href = 'index.html';
      return;
    }

    if (!res.ok) {
      throw { status: res.status, message: data.message || 'Something went wrong', data };
    }

    return data;

  } catch (err) {
    // Network error (server down etc)
    if (err instanceof TypeError) {
      throw { status: 0, message: 'Cannot connect to server. Is the backend running?' };
    }
    throw err;
  }
};

// ─────────────────────────────────────────────────────────
// SHORTHAND METHODS
// ─────────────────────────────────────────────────────────
const api = {
  get:    (endpoint)              => request('GET',    endpoint),
  post:   (endpoint, body)        => request('POST',   endpoint, body),
  put:    (endpoint, body)        => request('PUT',    endpoint, body),
  delete: (endpoint)              => request('DELETE', endpoint),
  upload: (endpoint, formData)    => request('POST',   endpoint, formData, true),
};

// ─────────────────────────────────────────────────────────
// UI HELPERS — used across all pages
// ─────────────────────────────────────────────────────────

// Format number as Indian Rupee
const formatINR = (amount) => {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// Format date nicely
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
};

// Capitalize first letter
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Show / hide loading state on a button
const setLoading = (btnId, isLoading) => {
  const btn    = document.getElementById(btnId);
  if (!btn) return;
  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = isLoading;
  if (text)   text.classList.toggle('hidden',  isLoading);
  if (loader) loader.classList.toggle('hidden', !isLoading);
};

// Show alert box with message and type (success | error | warning)
const showAlert = (elementId, message, type = 'error') => {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent  = message;
  el.className    = `auth-alert alert-${type}`;
  el.classList.remove('hidden');

  // Auto-hide success alerts after 3s
  if (type === 'success') {
    setTimeout(() => el.classList.add('hidden'), 3000);
  }
};

const hideAlert = (elementId) => {
  const el = document.getElementById(elementId);
  if (el) el.classList.add('hidden');
};

// Show page-level alert (different styling from modal alert)
const showPageAlert = (elementId, message, type = 'error') => {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className   = `page-alert alert-${type}`;
  el.classList.remove('hidden');
  if (type === 'success') setTimeout(() => el.classList.add('hidden'), 3000);
};

// Toggle password visibility
const togglePassword = (inputId, btn) => {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type   = isPassword ? 'text' : 'password';
  btn.textContent = isPassword ? 'Hide' : 'Show';
};

// Sidebar toggle (mobile)
const toggleSidebar = () => {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  sidebar?.classList.toggle('sidebar-open');
  overlay?.classList.toggle('hidden');
};

// Populate sidebar user info (called on every protected page)
const initSidebar = (user) => {
  if (!user) return;
  const nameEl   = document.getElementById('sidebar-user-name');
  const incomeEl = document.getElementById('sidebar-user-income');
  const avatarEl = document.getElementById('user-avatar');
  if (nameEl)   nameEl.textContent   = user.name;
  if (incomeEl) incomeEl.textContent = `${formatINR(user.monthlyIncome)} / month`;
  if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
  initSidebarLogo();
  applyTheme(getTheme());
  applyRBAC();
};

// Get greeting based on time of day
const getGreeting = (name) => {
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    hour < 21 ? 'Good evening' : 'Hey';
  return `${greet}, ${name} 👋`;
};

// Format today's date nicely
const getTodayString = () => {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });
};

// Generate color palette for charts — your green palette first, then extras
const CHART_COLORS = [
  '#4E9F3D',  // accent-2 green
  '#D8E9A8',  // accent-3 light green
  '#1E5128',  // accent-1 deep green
  '#7ec850',  // mid green
  '#a8d87a',  // soft green
  '#fbbf24',  // amber
  '#60a5fa',  // blue
  '#f87171',  // red
  '#c084fc',  // purple
  '#34d399',  // teal
  '#fb923c',  // orange
  '#38bdf8',  // sky
];

const getChartColor = (index) => CHART_COLORS[index % CHART_COLORS.length];

// ─────────────────────────────────────────────────────────
// THEME TOGGLE — dark / light
// ─────────────────────────────────────────────────────────
const THEME_KEY = 'pw_theme';

const getTheme  = ()      => localStorage.getItem(THEME_KEY) || 'dark';
const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  // update toggle button label if present
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️  Light mode' : '🌙  Dark mode';
};

const toggleTheme = () => {
  const current = getTheme();
  applyTheme(current === 'dark' ? 'light' : 'dark');
};

// Apply saved theme immediately on every page load
(function () { applyTheme(getTheme()); })();

// ─────────────────────────────────────────────────────────
// SIDEBAR SVG LOGO HELPER
// ─────────────────────────────────────────────────────────
const PW_LOGO_SVG = `
  <svg viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="17" cy="17" r="14" stroke="white" stroke-width="2" stroke-opacity="0.4"/>
    <path d="M11 17h12M17 11v12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="17" cy="17" r="4" fill="white" fill-opacity="0.85"/>
  </svg>`;

const initSidebarLogo = () => {
  const logoEl = document.querySelector('.brand-logo');
  if (logoEl) logoEl.innerHTML = PW_LOGO_SVG;
  const topbarLogoEl = document.querySelector('.topbar-logo');
  if (topbarLogoEl) topbarLogoEl.innerHTML = PW_LOGO_SVG;
};

// ─────────────────────────────────────────────────────────
// RBAC — Role Based Access Control
// Roles: 'admin' (full access) | 'viewer' (read-only)
// ─────────────────────────────────────────────────────────
const ROLE_KEY = 'pw_role';

const getRole   = ()     => localStorage.getItem(ROLE_KEY) || 'admin';
const setRole   = (role) => localStorage.setItem(ROLE_KEY, role);
const isAdmin   = ()     => getRole() === 'admin';
const isViewer  = ()     => getRole() === 'viewer';

// Elements that only admins can see/use
// Add class="admin-only" to any button/section to auto-hide for viewers
const applyRBAC = () => {
  const role = getRole();

  // Update role switcher dropdown if present
  const switcher = document.getElementById('role-switcher');
  if (switcher) switcher.value = role;

  // Update role badge in sidebar
  const badge = document.getElementById('role-badge');
  if (badge) {
    badge.textContent  = role === 'admin' ? '👑 Admin' : '👁️ Viewer';
    badge.className    = `role-badge role-badge-${role}`;
  }

  // Show/hide all admin-only elements
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = role === 'admin' ? '' : 'none';
  });

  // Show/hide all viewer-only elements
  document.querySelectorAll('.viewer-only').forEach(el => {
    el.style.display = role === 'viewer' ? '' : 'none';
  });

  // Table action buttons (edit/delete) — re-check after render
  document.querySelectorAll('.btn-edit, .btn-delete').forEach(btn => {
    btn.style.display = role === 'admin' ? '' : 'none';
  });

  // Show read-only banner for viewer
  const banner = document.getElementById('viewer-banner');
  if (banner) {
    banner.style.display = role === 'viewer' ? 'flex' : 'none';
  }
};

// Switch role and reapply
const switchRole = (role) => {
  setRole(role);
  applyRBAC();
  // Re-render any dynamic content that depends on role
  // (table rows with edit/delete buttons get re-hidden)
  setTimeout(applyRBAC, 100);
};

// Call on every page after sidebar init
// Apply immediately + after a short delay to catch dynamically rendered buttons
(function () {
  applyRBAC();
  // Re-apply after page content likely loaded
  setTimeout(applyRBAC, 500);
  setTimeout(applyRBAC, 1500);
})();