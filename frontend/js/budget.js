// ─────────────────────────────────────────────────────────
// budget.js — Budget Manager page
// ─────────────────────────────────────────────────────────

let currentBudget  = null;
let editingCatName = null;

window.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  const user = getUser();
  if (!user?.isProfileComplete) { window.location.href = 'setup.html'; return; }
  initSidebar(user);
  await loadBudget();
  bindBudgetEvents();
});

// ─────────────────────────────────────────────────────────
// LOAD BUDGET
// ─────────────────────────────────────────────────────────
const loadBudget = async () => {
  setPageLoading(true);
  try {
    const res     = await api.get('/budget/current');
    currentBudget = res.budget;
    renderBudgetHeader(currentBudget);
    renderCategoryCards(currentBudget);
    renderAllocationChart(currentBudget);
  } catch (err) {
    showPageAlert('budget-alert', err.message || 'Failed to load budget', 'error');
  } finally {
    setPageLoading(false);
  }
};

// ─────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────
const renderBudgetHeader = (budget) => {
  const income      = budget.totalIncome      || 0;
  const allocated   = budget.totalAllocated   || 0;
  const spent       = budget.totalSpent       || 0;
  const unallocated = budget.unallocated      || 0;
  const remaining   = budget.totalRemaining   || 0;
  const usedPct     = income > 0 ? Math.round((spent / income) * 100) : 0;

  setText('budget-income',      formatINR(income));
  setText('budget-allocated',   formatINR(allocated));
  setText('budget-spent',       formatINR(spent));
  setText('budget-remaining',   `${formatINR(remaining)} remaining`);
  setText('budget-unallocated', `${formatINR(unallocated)} unallocated`);
  setText('budget-used-pct',    `${usedPct}% of income`);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  setText('budget-month-label', `${monthNames[(budget.month||1) - 1]} ${budget.year}`);

  const bar = document.getElementById('budget-overall-bar');
  if (bar) {
    bar.style.width = `${Math.min(100, usedPct)}%`;
    bar.className   = `progress-fill ${
      usedPct >= 100 ? 'progress-danger' :
      usedPct >= 80  ? 'progress-warning' : 'progress-success'
    }`;
  }
};

// ─────────────────────────────────────────────────────────
// CATEGORY CARDS
// ─────────────────────────────────────────────────────────
const renderCategoryCards = (budget) => {
  const grid  = document.getElementById('category-cards-grid');
  const empty = document.getElementById('categories-empty');
  if (!grid) return;

  const cats = budget.categories || [];
  setText('cat-count', cats.length);

  if (!cats.length) {
    grid.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  grid.innerHTML = cats.map(cat => {
    const pct    = cat.allocatedAmount > 0
      ? Math.min(100, Math.round((cat.spentAmount / cat.allocatedAmount) * 100)) : 0;
    const status = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'success';
    const remaining = Math.max(0, cat.allocatedAmount - cat.spentAmount);

    return `
      <div class="category-card category-card-${status}">
        <div class="category-card-header">
          <span class="category-card-name">${capitalize(cat.name)}</span>
          <div class="category-card-actions">
            <button class="btn-icon btn-edit" onclick="openEditCategoryModal('${cat.name}')" title="Edit">✏️</button>
            <button class="btn-icon btn-delete" onclick="confirmDeleteCategory('${cat.name}')" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="category-card-amounts">
          <span class="cat-spent">${formatINR(cat.spentAmount)}</span>
          <span class="cat-divider"> / </span>
          <span class="cat-allocated">${formatINR(cat.allocatedAmount)}</span>
        </div>
        <div class="cat-progress-track">
          <div class="cat-progress-fill cat-progress-${status}" style="width:${pct}%"></div>
        </div>
        <div class="category-card-footer">
          <span class="cat-pct cat-pct-${status}">${pct}% used</span>
          <span class="cat-remaining">${formatINR(remaining)} left</span>
        </div>
        ${pct >= 80 ? `<div class="cat-alert-badge badge-${status}">${pct >= 100 ? '🚨 Overspent' : '⚠️ Near limit'}</div>` : ''}
      </div>
    `;
  }).join('');
};

// ─────────────────────────────────────────────────────────
// ALLOCATION CHART
// ─────────────────────────────────────────────────────────
let allocationChart = null;

const renderAllocationChart = (budget) => {
  const canvas = document.getElementById('allocation-chart');
  if (!canvas || !budget.categories?.length) return;

  const labels = budget.categories.map(c => capitalize(c.name));
  const values = budget.categories.map(c => c.allocatedAmount);
  const colors = budget.categories.map((_, i) => getChartColor(i));

  if (allocationChart) allocationChart.destroy();

  allocationChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatINR(ctx.raw)}` } },
      },
    },
  });

  const legend = document.getElementById('allocation-legend');
  if (legend) {
    legend.innerHTML = budget.categories.map((cat, i) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${colors[i]}"></span>
        <span class="legend-label">${capitalize(cat.name)}</span>
        <span class="legend-value">${formatINR(cat.allocatedAmount)}</span>
      </div>
    `).join('');
  }
};

// ─────────────────────────────────────────────────────────
// INLINE ADD CATEGORY (from page form)
// ─────────────────────────────────────────────────────────
const saveCategory = async () => {
  hideAlert('cat-modal-alert');
  const name   = document.getElementById('cat-name')?.value.trim().toLowerCase();
  const amount = parseFloat(document.getElementById('cat-amount')?.value);

  if (!name) { showPageAlert('budget-alert', 'Please enter a category name', 'error'); return; }
  if (!amount || amount < 0) { showPageAlert('budget-alert', 'Please enter a valid amount', 'error'); return; }

  setLoading('save-cat-btn', true);
  try {
    await api.post('/budget/category', { name, allocatedAmount: amount });
    document.getElementById('cat-name').value   = '';
    document.getElementById('cat-amount').value = '';
    setText('cat-pct-preview', '0% of income');
    showPageAlert('budget-alert', `"${capitalize(name)}" added!`, 'success');
    await loadBudget();
  } catch (err) {
    showPageAlert('budget-alert', err.message || 'Failed to add category', 'error');
  } finally {
    setLoading('save-cat-btn', false);
  }
};

// ─────────────────────────────────────────────────────────
// EDIT CATEGORY MODAL
// ─────────────────────────────────────────────────────────
const openEditCategoryModal = (name) => {
  const cat = currentBudget?.categories?.find(c => c.name === name);
  if (!cat) return;
  editingCatName = name;

  const nameInput   = document.getElementById('cat-name-field');
  const amountInput = document.getElementById('cat-amount-modal');
  if (nameInput)   { nameInput.value = capitalize(cat.name); nameInput.setAttribute('readonly', true); }
  if (amountInput)   amountInput.value = cat.allocatedAmount;

  setText('cat-modal-title', 'Edit Category');
  updateCatPctPreviewModal();
  document.getElementById('category-modal')?.classList.remove('hidden');
};

const closeCategoryModal = () => {
  document.getElementById('category-modal')?.classList.add('hidden');
  editingCatName = null;
};

const saveCategoryModal = async () => {
  const amount = parseFloat(document.getElementById('cat-amount-modal')?.value);
  if (!amount || amount < 0) {
    showPageAlert('budget-alert', 'Please enter a valid amount', 'error'); return;
  }
  setLoading('save-cat-modal-btn', true);
  try {
    await api.put(`/budget/category/${encodeURIComponent(editingCatName)}`, { allocatedAmount: amount });
    closeCategoryModal();
    showPageAlert('budget-alert', 'Category updated!', 'success');
    await loadBudget();
  } catch (err) {
    showPageAlert('budget-alert', err.message || 'Failed to update', 'error');
  } finally {
    setLoading('save-cat-modal-btn', false);
  }
};

// ─────────────────────────────────────────────────────────
// DELETE CATEGORY
// ─────────────────────────────────────────────────────────
const confirmDeleteCategory = (name) => {
  setText('delete-cat-name', `"${capitalize(name)}"`);
  document.getElementById('delete-cat-modal')?.classList.remove('hidden');
  document.getElementById('confirm-delete-cat-btn').onclick = () => deleteCategory(name);
};

const closeDeleteCatModal = () => {
  document.getElementById('delete-cat-modal')?.classList.add('hidden');
};

const deleteCategory = async (name) => {
  try {
    await api.delete(`/budget/category/${encodeURIComponent(name)}`);
    closeDeleteCatModal();
    showPageAlert('budget-alert', `Category deleted.`, 'success');
    await loadBudget();
  } catch (err) {
    showPageAlert('budget-alert', err.message || 'Failed to delete', 'error');
  }
};

// ─────────────────────────────────────────────────────────
// UPDATE INCOME (inline form)
// ─────────────────────────────────────────────────────────
const saveIncome = async () => {
  hideAlert('income-modal-alert');
  const income = parseFloat(document.getElementById('new-income')?.value);
  if (!income || income <= 0) {
    document.getElementById('income-modal-alert')?.classList.remove('hidden');
    showAlert('income-modal-alert', 'Please enter a valid income', 'error');
    return;
  }
  setLoading('save-income-btn', true);
  try {
    const res = await api.put('/budget/income', { totalIncome: income });
    const user = getUser();
    if (user) { user.monthlyIncome = income; setUser(user); }
    document.getElementById('new-income').value = '';
    showPageAlert('budget-alert', 'Income updated!', 'success');
    await loadBudget();
  } catch (err) {
    showPageAlert('budget-alert', err.message || 'Failed to update income', 'error');
  } finally {
    setLoading('save-income-btn', false);
  }
};

// ─────────────────────────────────────────────────────────
// LIVE % PREVIEW
// ─────────────────────────────────────────────────────────
const updateCatPctPreview = () => {
  const amount  = parseFloat(document.getElementById('cat-amount')?.value) || 0;
  const income  = currentBudget?.totalIncome || 0;
  const pct     = income > 0 ? Math.round((amount / income) * 100) : 0;
  setText('cat-pct-preview', `${pct}% of income`);
};

const updateCatPctPreviewModal = () => {
  const amount  = parseFloat(document.getElementById('cat-amount-modal')?.value) || 0;
  const income  = currentBudget?.totalIncome || 0;
  const pct     = income > 0 ? Math.round((amount / income) * 100) : 0;
  setText('cat-pct-preview-modal', `${pct}% of income`);
};

// ─────────────────────────────────────────────────────────
// BIND EVENTS
// ─────────────────────────────────────────────────────────
const bindBudgetEvents = () => {
  document.getElementById('cat-amount')?.addEventListener('input', updateCatPctPreview);
  document.getElementById('cat-amount-modal')?.addEventListener('input', updateCatPctPreviewModal);

  ['category-modal', 'delete-cat-modal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      if (e.target.id === 'category-modal')   closeCategoryModal();
      if (e.target.id === 'delete-cat-modal') closeDeleteCatModal();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeCategoryModal(); closeDeleteCatModal(); }
  });
};

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
const setPageLoading = (loading) => {
  document.getElementById('budget-loading')?.classList.toggle('hidden', !loading);
  document.getElementById('budget-content')?.classList.toggle('hidden',  loading);
};

const setText = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};