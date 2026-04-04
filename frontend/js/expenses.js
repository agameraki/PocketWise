// ─────────────────────────────────────────────────────────
// expenses.js — Add / Edit / Delete / Filter expenses
// ─────────────────────────────────────────────────────────

let currentExpenses  = [];
let editingExpenseId = null;
let userCategories   = [];  // from budget — user's own categories

window.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  const user = getUser();
  if (!user?.isProfileComplete) { window.location.href = 'setup.html'; return; }
  initSidebar(user);
  await Promise.all([loadCategories(), loadExpenses()]);
  bindEvents();
});

// ─────────────────────────────────────────────────────────
// LOAD USER'S CATEGORIES from their budget
// ─────────────────────────────────────────────────────────
const loadCategories = async () => {
  try {
    const res      = await api.get('/budget/current');
    userCategories = (res.budget?.categories || []).map(c => c.name);
    populateCategoryDropdown('expense-category');
    populateCategoryDropdown('filter-category');
  } catch {
    userCategories = [];
  }
};

const populateCategoryDropdown = (selectId) => {
  const select = document.getElementById(selectId);
  if (!select) return;

  // Keep first placeholder option
  const placeholder = select.options[0];
  select.innerHTML  = '';
  select.appendChild(placeholder);

  userCategories.forEach(cat => {
    const opt       = document.createElement('option');
    opt.value       = cat;
    opt.textContent = capitalize(cat);
    select.appendChild(opt);
  });

  // Only add "custom" option on the form dropdown, not the filter
  if (selectId === 'expense-category') {
    const other       = document.createElement('option');
    other.value       = '__custom__';
    other.textContent = '+ Type custom category';
    select.appendChild(other);
  }
};

// ─────────────────────────────────────────────────────────
// LOAD EXPENSES
// ─────────────────────────────────────────────────────────
const loadExpenses = async () => {
  setTableLoading(true);
  try {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();
    const res   = await api.get(`/expenses?month=${month}&year=${year}`);
    currentExpenses = res.expenses || [];
    renderExpensesTable(currentExpenses);
    renderExpenseSummary(currentExpenses);
  } catch (err) {
    showPageAlert('expense-alert', err.message || 'Failed to load expenses', 'error');
  } finally {
    setTableLoading(false);
  }
};

// ─────────────────────────────────────────────────────────
// RENDER TABLE
// ─────────────────────────────────────────────────────────
const renderExpensesTable = (expenses) => {
  const tbody = document.getElementById('expenses-tbody');
  const empty = document.getElementById('expenses-empty');
  if (!tbody) return;

  if (!expenses.length) {
    tbody.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  tbody.innerHTML = expenses.map(exp => `
    <tr data-id="${exp._id}">
      <td data-label="Date">${formatDate(exp.date)}</td>
      <td data-label="Category">
        <span class="category-pill">${capitalize(exp.category)}</span>
      </td>
      <td data-label="Description">${exp.description || '—'}</td>
      <td data-label="Amount" class="amount-cell">${formatINR(exp.amount)}</td>
      <td data-label="Source">
        <span class="source-tag source-${exp.source}">${exp.source}</span>
      </td>
      <td data-label="Actions" class="actions-cell">
        <button class="btn-icon btn-edit"   onclick="openEditModal('${exp._id}')" title="Edit">✏️</button>
        <button class="btn-icon btn-delete" onclick="confirmDelete('${exp._id}')" title="Delete">🗑️</button>
      </td>
    </tr>
  `).join('');

  // Re-apply RBAC so edit/delete buttons respect current role
  if (typeof applyRBAC === 'function') applyRBAC();
};

// ─────────────────────────────────────────────────────────
// SUMMARY BAR
// ─────────────────────────────────────────────────────────
const renderExpenseSummary = (expenses) => {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const count = expenses.length;
  setText('expenses-total', formatINR(total));
  setText('expenses-count', `${count} transaction${count !== 1 ? 's' : ''}`);
};

const clearFilters = () => {
  const search   = document.getElementById('search-expenses');
  const category = document.getElementById('filter-category');
  const sort     = document.getElementById('sort-expenses');
  if (search)   search.value   = '';
  if (category) category.value = '';
  if (sort)     sort.value     = 'date-desc';
  renderExpensesTable(currentExpenses);
  renderExpenseSummary(currentExpenses);
};

// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
const applyFilters = () => {
  const search   = document.getElementById('search-expenses')?.value.trim().toLowerCase() || '';
  const category = document.getElementById('filter-category')?.value || '';
  const sortBy   = document.getElementById('sort-expenses')?.value   || 'date-desc';

  let filtered = [...currentExpenses];

  if (search) {
    filtered = filtered.filter(e =>
      e.description?.toLowerCase().includes(search) ||
      e.category.toLowerCase().includes(search)
    );
  }
  if (category) {
    filtered = filtered.filter(e => e.category === category);
  }

  // Sort
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':   return new Date(b.date)   - new Date(a.date);
      case 'date-asc':    return new Date(a.date)   - new Date(b.date);
      case 'amount-desc': return b.amount            - a.amount;
      case 'amount-asc':  return a.amount            - b.amount;
      default:            return 0;
    }
  });

  renderExpensesTable(filtered);
  renderExpenseSummary(filtered);
};

// ─────────────────────────────────────────────────────────
// OPEN ADD MODAL
// ─────────────────────────────────────────────────────────
const openAddModal = () => {
  editingExpenseId = null;
  clearForm();
  // Default date = today
  const dateInput = document.getElementById('expense-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  setText('modal-title', 'Add Expense');
  document.getElementById('expense-modal')?.classList.remove('hidden');
};

// ─────────────────────────────────────────────────────────
// OPEN EDIT MODAL
// ─────────────────────────────────────────────────────────
const openEditModal = (id) => {
  const exp = currentExpenses.find(e => e._id === id);
  if (!exp) return;
  editingExpenseId = id;

  document.getElementById('expense-amount').value      = exp.amount;
  document.getElementById('expense-description').value = exp.description || '';
  document.getElementById('expense-date').value        = exp.date?.split('T')[0] || '';

  const select      = document.getElementById('expense-category');
  const customInput = document.getElementById('expense-category-custom');
  const customWrap  = document.getElementById('custom-category-wrap');

  if (select) {
    const existsInBudget = userCategories.includes(exp.category);
    if (existsInBudget) {
      select.value = exp.category;
      customWrap?.classList.add('hidden');
    } else {
      select.value = '__custom__';
      customWrap?.classList.remove('hidden');
      if (customInput) customInput.value = exp.category;
    }
  }

  setText('modal-title', 'Edit Expense');
  document.getElementById('expense-modal')?.classList.remove('hidden');
};

// ─────────────────────────────────────────────────────────
// CLOSE MODAL
// ─────────────────────────────────────────────────────────
const closeModal = () => {
  document.getElementById('expense-modal')?.classList.add('hidden');
  clearForm();
  editingExpenseId = null;
};

// ─────────────────────────────────────────────────────────
// SAVE EXPENSE (Add or Edit)
// ─────────────────────────────────────────────────────────
const saveExpense = async () => {
  hideAlert('modal-alert');

  // Get category — handle custom input
  const selectVal   = document.getElementById('expense-category')?.value;
  const customInput = document.getElementById('expense-category-custom');
  const category    = selectVal === '__custom__'
    ? customInput?.value.trim().toLowerCase()
    : selectVal;

  const amount      = parseFloat(document.getElementById('expense-amount')?.value);
  const description = document.getElementById('expense-description')?.value.trim();
  const date        = document.getElementById('expense-date')?.value;

  // Validation
  if (!category) {
    showAlert('modal-alert', 'Please select or enter a category', 'error'); return;
  }
  if (!amount || amount <= 0) {
    showAlert('modal-alert', 'Please enter a valid amount greater than ₹0', 'error'); return;
  }
  if (!date) {
    showAlert('modal-alert', 'Please select a date', 'error'); return;
  }

  const payload = { amount, category, description, date };

  setLoading('save-expense-btn', true);
  try {
    if (editingExpenseId) {
      await api.put(`/expenses/${editingExpenseId}`, payload);
      showPageAlert('expense-alert', 'Expense updated successfully!', 'success');
    } else {
      await api.post('/expenses', payload);
      showPageAlert('expense-alert', 'Expense added successfully!', 'success');
    }
    closeModal();
    await loadExpenses();
  } catch (err) {
    showAlert('modal-alert', err.message || 'Failed to save expense', 'error');
  } finally {
    setLoading('save-expense-btn', false);
  }
};

// ─────────────────────────────────────────────────────────
// DELETE EXPENSE
// ─────────────────────────────────────────────────────────
const confirmDelete = (id) => {
  const exp = currentExpenses.find(e => e._id === id);
  if (!exp) return;
  setText('delete-expense-name',
    `${capitalize(exp.category)} — ${formatINR(exp.amount)} on ${formatDate(exp.date)}`
  );
  document.getElementById('delete-modal')?.classList.remove('hidden');
  document.getElementById('confirm-delete-btn').onclick = () => deleteExpense(id);
};

const closeDeleteModal = () => {
  document.getElementById('delete-modal')?.classList.add('hidden');
};

const deleteExpense = async (id) => {
  try {
    await api.delete(`/expenses/${id}`);
    closeDeleteModal();
    showPageAlert('expense-alert', 'Expense deleted.', 'success');
    await loadExpenses();
  } catch (err) {
    showPageAlert('expense-alert', err.message || 'Failed to delete expense', 'error');
  }
};

// ─────────────────────────────────────────────────────────
// BIND EVENTS
// ─────────────────────────────────────────────────────────
const bindEvents = () => {
  // Category dropdown → show/hide custom input
  document.getElementById('expense-category')?.addEventListener('change', (e) => {
    const customWrap = document.getElementById('custom-category-wrap');
    customWrap?.classList.toggle('hidden', e.target.value !== '__custom__');
  });

  // Live search + filter
  document.getElementById('search-expenses')?.addEventListener('input',  applyFilters);
  document.getElementById('filter-category')?.addEventListener('change', applyFilters);
  document.getElementById('sort-expenses')?.addEventListener('change',   applyFilters);

  // Close modal on backdrop click
  document.getElementById('expense-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'expense-modal') closeModal();
  });
  document.getElementById('delete-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'delete-modal') closeDeleteModal();
  });

  // Keyboard escape closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closeDeleteModal(); }
  });
};

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
const clearForm = () => {
  ['expense-amount', 'expense-description', 'expense-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const select = document.getElementById('expense-category');
  if (select) select.value = '';
  const customWrap = document.getElementById('custom-category-wrap');
  customWrap?.classList.add('hidden');
  hideAlert('modal-alert');
};

const setTableLoading = (loading) => {
  const spinner = document.getElementById('table-loading');
  const table   = document.getElementById('expenses-table');
  spinner?.classList.toggle('hidden', !loading);
  table?.classList.toggle('hidden',   loading);
};

const setText = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};