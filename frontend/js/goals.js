// ─────────────────────────────────────────────────────────
// goals.js — Set goals, view affordability analysis
// ─────────────────────────────────────────────────────────

let currentGoals    = [];
let editingGoalId   = null;

window.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  const user = getUser();
  if (!user?.isProfileComplete) { window.location.href = 'setup.html'; return; }
  initSidebar(user);
  await loadGoals();
  bindGoalEvents();
});

// ─────────────────────────────────────────────────────────
// LOAD GOALS
// ─────────────────────────────────────────────────────────
const loadGoals = async () => {
  setGoalsLoading(true);
  try {
    const res    = await api.get('/goals');
    currentGoals = res.goals || [];
    renderGoalsList(currentGoals);
    renderGoalsSummary(currentGoals);
  } catch (err) {
    showPageAlert('goals-alert', err.message || 'Failed to load goals', 'error');
  } finally {
    setGoalsLoading(false);
  }
};

// ─────────────────────────────────────────────────────────
// RENDER GOALS LIST
// ─────────────────────────────────────────────────────────
const renderGoalsList = (goals) => {
  const grid  = document.getElementById('goals-grid');
  const empty = document.getElementById('goals-empty');
  if (!grid) return;

  const active    = goals.filter(g => g.status === 'active');
  const achieved  = goals.filter(g => g.status === 'achieved');
  const cancelled = goals.filter(g => g.status === 'cancelled');

  if (!goals.length) {
    grid.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  // Render active first, then achieved, then cancelled
  grid.innerHTML = [
    ...active.map(g => renderGoalCard(g)),
    ...achieved.map(g => renderGoalCard(g)),
    ...cancelled.map(g => renderGoalCard(g)),
  ].join('');

  // Re-apply RBAC after dynamic render
  if (typeof applyRBAC === 'function') applyRBAC();
};

const renderGoalCard = (goal) => {
  const analysis  = goal.analysis;  // pre-computed by backend
  const statusCls = goal.status === 'achieved'  ? 'goal-achieved'  :
                    goal.status === 'cancelled'  ? 'goal-cancelled' :
                    analysis?.canAffordNow       ? 'goal-affordable': 'goal-saving';

  const deadlineStr = goal.deadline
    ? `Deadline: ${formatDate(goal.deadline)} (${goal.daysLeft ?? '?'} days left)`
    : 'No deadline set';

  return `
    <div class="goal-card ${statusCls}" data-id="${goal._id}">
      <div class="goal-card-header">
        <div class="goal-card-title-row">
          <span class="goal-title">${goal.title}</span>
          <span class="goal-status-badge status-${goal.status}">${capitalize(goal.status)}</span>
        </div>
        <span class="goal-amount">${formatINR(goal.targetAmount)}</span>
      </div>

      ${goal.notes ? `<p class="goal-notes">${goal.notes}</p>` : ''}
      <p class="goal-deadline">${deadlineStr}</p>

      ${goal.status === 'active' && analysis ? `
        <div class="goal-analysis-box">
          <p class="analysis-verdict ${analysis.canAffordNow ? 'verdict-success' : 'verdict-warning'}">
            ${analysis.canAffordNow ? '✅' : '🎯'} ${analysis.verdict}
          </p>
          <div class="analysis-grid">
            <div class="analysis-item">
              <span class="analysis-label">Available now</span>
              <span class="analysis-value">${formatINR(analysis.totalRemaining)}</span>
            </div>
            <div class="analysis-item">
              <span class="analysis-label">Shortfall</span>
              <span class="analysis-value ${analysis.shortfall > 0 ? 'text-danger' : 'text-success'}">
                ${analysis.shortfall > 0 ? formatINR(analysis.shortfall) : 'None!'}
              </span>
            </div>
            ${analysis.safeDailyBudget > 0 ? `
            <div class="analysis-item">
              <span class="analysis-label">Safe daily limit</span>
              <span class="analysis-value">${formatINR(analysis.safeDailyBudget)}/day</span>
            </div>` : ''}
            ${analysis.dailyReductionNeeded > 0 ? `
            <div class="analysis-item">
              <span class="analysis-label">Reduce daily by</span>
              <span class="analysis-value text-warning">${formatINR(analysis.dailyReductionNeeded)}/day</span>
            </div>` : ''}
            ${analysis.monthsToSave ? `
            <div class="analysis-item">
              <span class="analysis-label">Months to save</span>
              <span class="analysis-value">${analysis.monthsToSave} months</span>
            </div>` : ''}
            <div class="analysis-item">
              <span class="analysis-label">Days left in month</span>
              <span class="analysis-value">${analysis.daysLeftInMonth}</span>
            </div>
          </div>
        </div>
      ` : ''}

      ${goal.status === 'active' ? `
        <div class="goal-card-actions">
          <button class="btn btn-sm btn-success admin-only" onclick="markAchieved('${goal._id}')">✅ Mark Achieved</button>
          <button class="btn btn-sm btn-outline admin-only"  onclick="openEditGoalModal('${goal._id}')">✏️ Edit</button>
          <button class="btn btn-sm btn-danger admin-only"   onclick="confirmDeleteGoal('${goal._id}')">🗑️ Delete</button>
        </div>
      ` : `
        <div class="goal-card-actions">
          <button class="btn btn-sm btn-outline admin-only" onclick="confirmDeleteGoal('${goal._id}')">🗑️ Delete</button>
        </div>
      `}
    </div>
  `;
};

// ─────────────────────────────────────────────────────────
// GOALS SUMMARY COUNTS
// ─────────────────────────────────────────────────────────
const renderGoalsSummary = (goals) => {
  setText('goals-total',    goals.length);
  setText('goals-active',   goals.filter(g => g.status === 'active').length);
  setText('goals-achieved', goals.filter(g => g.status === 'achieved').length);
};

// ─────────────────────────────────────────────────────────
// OPEN ADD / EDIT GOAL MODAL
// ─────────────────────────────────────────────────────────
const openAddGoalModal = () => {
  editingGoalId = null;
  clearGoalForm();
  setText('goal-modal-title', 'Add Goal');
  document.getElementById('goal-modal')?.classList.remove('hidden');
};

// Filter goals by status
const filterGoals = (status) => {
  if (!status) {
    renderGoalsList(currentGoals);
  } else {
    renderGoalsList(currentGoals.filter(g => g.status === status));
  }
};

// ─────────────────────────────────────────────────────────
// OPEN EDIT GOAL MODAL
// ─────────────────────────────────────────────────────────
const openEditGoalModal = (id) => {
  const goal = currentGoals.find(g => g._id === id);
  if (!goal) return;
  editingGoalId = id;

  document.getElementById('goal-title').value        = goal.title;
  document.getElementById('goal-amount').value       = goal.targetAmount;
  document.getElementById('goal-notes').value        = goal.notes || '';
  document.getElementById('goal-deadline').value     = goal.deadline?.split('T')[0] || '';

  setText('goal-modal-title', 'Edit Goal');
  document.getElementById('goal-modal')?.classList.remove('hidden');
};

// ─────────────────────────────────────────────────────────
// CLOSE GOAL MODAL
// ─────────────────────────────────────────────────────────
const closeGoalModal = () => {
  document.getElementById('goal-modal')?.classList.add('hidden');
  clearGoalForm();
  editingGoalId = null;
};

// ─────────────────────────────────────────────────────────
// SAVE GOAL
// ─────────────────────────────────────────────────────────
const saveGoal = async () => {
  hideAlert('goal-modal-alert');

  const title        = document.getElementById('goal-title')?.value.trim();
  const targetAmount = parseFloat(document.getElementById('goal-amount')?.value);
  const notes        = document.getElementById('goal-notes')?.value.trim();
  const deadline     = document.getElementById('goal-deadline')?.value || null;

  if (!title) {
    showAlert('goal-modal-alert', 'Please enter a goal title', 'error'); return;
  }
  if (!targetAmount || targetAmount <= 0) {
    showAlert('goal-modal-alert', 'Please enter a valid target amount', 'error'); return;
  }

  const payload = { title, targetAmount, notes, deadline };

  setLoading('save-goal-btn', true);
  try {
    if (editingGoalId) {
      await api.put(`/goals/${editingGoalId}`, payload);
      showPageAlert('goals-alert', 'Goal updated!', 'success');
    } else {
      await api.post('/goals', payload);
      showPageAlert('goals-alert', 'Goal added! Affordability analysis ready.', 'success');
    }
    closeGoalModal();
    await loadGoals();
  } catch (err) {
    showAlert('goal-modal-alert', err.message || 'Failed to save goal', 'error');
  } finally {
    setLoading('save-goal-btn', false);
  }
};

// ─────────────────────────────────────────────────────────
// MARK GOAL AS ACHIEVED
// ─────────────────────────────────────────────────────────
const markAchieved = async (id) => {
  try {
    await api.put(`/goals/${id}`, { status: 'achieved' });
    showPageAlert('goals-alert', '🎉 Goal marked as achieved! Congrats!', 'success');
    await loadGoals();
  } catch (err) {
    showPageAlert('goals-alert', err.message || 'Failed to update goal', 'error');
  }
};

// ─────────────────────────────────────────────────────────
// DELETE GOAL
// ─────────────────────────────────────────────────────────
const confirmDeleteGoal = (id) => {
  const goal = currentGoals.find(g => g._id === id);
  if (!goal) return;
  setText('delete-goal-name', `"${goal.title}"`);
  document.getElementById('delete-goal-modal')?.classList.remove('hidden');
  document.getElementById('confirm-delete-goal-btn').onclick = () => deleteGoal(id);
};

const closeDeleteGoalModal = () => {
  document.getElementById('delete-goal-modal')?.classList.add('hidden');
};

const deleteGoal = async (id) => {
  try {
    await api.delete(`/goals/${id}`);
    closeDeleteGoalModal();
    showPageAlert('goals-alert', 'Goal deleted.', 'success');
    await loadGoals();
  } catch (err) {
    showPageAlert('goals-alert', err.message || 'Failed to delete goal', 'error');
  }
};

// ─────────────────────────────────────────────────────────
// BIND EVENTS
// ─────────────────────────────────────────────────────────
const bindGoalEvents = () => {
  document.getElementById('goal-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'goal-modal') closeGoalModal();
  });
  document.getElementById('delete-goal-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'delete-goal-modal') closeDeleteGoalModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeGoalModal(); closeDeleteGoalModal(); }
  });
};

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
const clearGoalForm = () => {
  ['goal-title', 'goal-amount', 'goal-notes', 'goal-deadline'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  hideAlert('goal-modal-alert');
};

const setGoalsLoading = (loading) => {
  document.getElementById('goals-loading')?.classList.toggle('hidden', !loading);
  document.getElementById('goals-content')?.classList.toggle('hidden',  loading);
};

const setText = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};