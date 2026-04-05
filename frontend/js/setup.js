// ─────────────────────────────────────────────────────────
// setup.js — First-time profile setup logic
// ─────────────────────────────────────────────────────────

let monthlyIncome  = 0;
let categories     = []; // array of { name, allocatedAmount }

window.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  // If profile already complete, skip setup
  const user = getUser();
  if (user?.isProfileComplete) {
    window.location.href = 'dashboard.html';
    return;
  }
});

// ─────────────────────────────────────────────────────────
// STEP 1 → STEP 2
// ─────────────────────────────────────────────────────────
const goToStep2 = async () => {
  hideAlert('setup-alert');

  const incomeInput = document.getElementById('monthly-income');
  const income      = parseFloat(incomeInput.value);

  if (!income || income <= 0) {
    document.getElementById('income-err').textContent = 'Please enter a valid income';
    return;
  }
  document.getElementById('income-err').textContent = '';

  monthlyIncome = income;

  // Fetch suggested categories from backend
  try {
    const data = await api.get('/budget/suggestions');
    categories  = data.suggestions.map(s => ({
      name:            s.name,
      allocatedAmount: s.allocatedAmount,
    }));
  } catch (err) {
    // Fallback: build locally if API fails
    categories = [
      { name: 'food',          allocatedAmount: Math.round(income * 0.30) },
      { name: 'travel',        allocatedAmount: Math.round(income * 0.15) },
      { name: 'entertainment', allocatedAmount: Math.round(income * 0.10) },
      { name: 'savings',       allocatedAmount: Math.round(income * 0.20) },
      { name: 'shopping',      allocatedAmount: Math.round(income * 0.10) },
      { name: 'health',        allocatedAmount: Math.round(income * 0.05) },
      { name: 'utilities',     allocatedAmount: Math.round(income * 0.05) },
      { name: 'education',     allocatedAmount: Math.round(income * 0.03) },
      { name: 'other',         allocatedAmount: Math.round(income * 0.02) },
    ];
  }

  // Activate step 2
  setStep(2);
  renderCategories();
  updateSummaryBar();
};

const goToStep1 = () => setStep(1);

// ─────────────────────────────────────────────────────────
// STEP NAVIGATION
// ─────────────────────────────────────────────────────────
const setStep = (step) => {
  [1].forEach(n => {
    document.getElementById(`step-${n}`).classList.toggle('hidden', n !== step);
    const dot = document.getElementById(`step-dot-${n}`);
    if (dot) dot.classList.toggle('active', n <= step);
  });
};

// ─────────────────────────────────────────────────────────
// RENDER CATEGORY LIST
// ─────────────────────────────────────────────────────────
const renderCategories = () => {
  const container = document.getElementById('category-list');
  if (!container) return;

  container.innerHTML = categories.map((cat, index) => `
    <div class="category-row" id="cat-row-${index}">
      <div class="category-row-name">${capitalize(cat.name)}</div>
      <div class="category-row-inputs">
        <div class="input-wrapper">
          <span class="input-prefix">₹</span>
          <input
            type="number"
            class="cat-amount-input"
            value="${cat.allocatedAmount}"
            min="0"
            onchange="updateCategoryAmount(${index}, this.value)"
          />
        </div>
        <span class="category-pct" id="cat-pct-${index}">
          ${monthlyIncome > 0 ? Math.round((cat.allocatedAmount / monthlyIncome) * 100) : 0}%
        </span>
        <button class="btn-icon btn-danger-icon" onclick="removeCategory(${index})" title="Remove">✕</button>
      </div>
    </div>
  `).join('');
};

// ─────────────────────────────────────────────────────────
// CATEGORY ACTIONS
// ─────────────────────────────────────────────────────────
const updateCategoryAmount = (index, value) => {
  categories[index].allocatedAmount = parseFloat(value) || 0;
  const pct = monthlyIncome > 0
    ? Math.round((categories[index].allocatedAmount / monthlyIncome) * 100)
    : 0;
  const pctEl = document.getElementById(`cat-pct-${index}`);
  if (pctEl) pctEl.textContent = `${pct}%`;
  updateSummaryBar();
};

const removeCategory = (index) => {
  categories.splice(index, 1);
  renderCategories();
  updateSummaryBar();
};

const addCustomCategory = () => {
  const nameInput   = document.getElementById('new-cat-name');
  const amountInput = document.getElementById('new-cat-amount');

  const name   = nameInput.value.trim().toLowerCase();
  const amount = parseFloat(amountInput.value);

  if (!name) {
    showAlert('setup-alert', 'Please enter a category name', 'error');
    return;
  }
  if (!amount || amount <= 0) {
    showAlert('setup-alert', 'Please enter a valid amount', 'error');
    return;
  }
  if (categories.some(c => c.name === name)) {
    showAlert('setup-alert', `Category "${name}" already exists`, 'error');
    return;
  }

  hideAlert('setup-alert');
  categories.push({ name, allocatedAmount: amount });
  renderCategories();
  updateSummaryBar();

  nameInput.value   = '';
  amountInput.value = '';
};

// ─────────────────────────────────────────────────────────
// SUMMARY BAR
// ─────────────────────────────────────────────────────────
const updateSummaryBar = () => {
  const totalAllocated = categories.reduce((s, c) => s + c.allocatedAmount, 0);
  const unallocated    = Math.max(0, monthlyIncome - totalAllocated);

  const incomeEl      = document.getElementById('summary-income');
  const allocatedEl   = document.getElementById('summary-allocated');
  const unallocatedEl = document.getElementById('summary-unallocated');

  if (incomeEl)      incomeEl.textContent      = formatINR(monthlyIncome);
  if (allocatedEl)   allocatedEl.textContent   = formatINR(totalAllocated);
  if (unallocatedEl) unallocatedEl.textContent = formatINR(unallocated);

  // Warn if over-allocated
  if (totalAllocated > monthlyIncome) {
    showAlert('setup-alert',
      `You've allocated ${formatINR(totalAllocated)} which exceeds your income of ${formatINR(monthlyIncome)}. Please reduce some categories.`,
      'error'
    );
  } else {
    hideAlert('setup-alert');
  }
};

// ─────────────────────────────────────────────────────────
// COMPLETE SETUP
// ─────────────────────────────────────────────────────────
const completeSetup = async () => {
  hideAlert('setup-alert');

  const incomeInput = document.getElementById('monthly-income');
  const income      = parseFloat(incomeInput.value);

  if (!income || income <= 0) {
    document.getElementById('income-err').textContent = 'Please enter a valid income';
    return;
  }
  document.getElementById('income-err').textContent = '';

  setLoading('complete-setup-btn', true);

  try {
    const data = await api.put('/auth/setup', {
      monthlyIncome: income,
    });

    // Update stored user
    setUser(data.user);

    // Redirect immediately
    animateRedirect();

  } catch (err) {
    showAlert('setup-alert', err.message || 'Setup failed. Please try again.', 'error');
  } finally {
    setLoading('complete-setup-btn', false);
  }
};

// ─────────────────────────────────────────────────────────
// REDIRECT ANIMATION
// ─────────────────────────────────────────────────────────
const animateRedirect = () => {
  window.location.href = 'dashboard.html';
};