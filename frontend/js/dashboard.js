// ─────────────────────────────────────────────────────────
// dashboard.js — Main dashboard logic
// ─────────────────────────────────────────────────────────

let donutChart = null;

window.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const user = getUser();
  if (!user?.isProfileComplete) {
    window.location.href = 'setup.html';
    return;
  }

  initSidebar(user);
  setGreeting(user);
  initVibeCheck();
  await loadDashboard();
});

// ─────────────────────────────────────────────────────────
// GREETING + DATE
// ─────────────────────────────────────────────────────────
const setGreeting = (user) => {
  const greetEl = document.getElementById('greeting');
  const dateEl  = document.getElementById('current-date');
  if (greetEl) greetEl.textContent = getGreeting(user.name);
  if (dateEl)  dateEl.textContent  = `Today is ${getTodayString()}`;
};

// ─────────────────────────────────────────────────────────
// MAIN LOAD
// ─────────────────────────────────────────────────────────
const loadDashboard = async () => {
  try {
    const [summaryRes, budgetRes, insightRes, expensesRes] = await Promise.all([
      api.get('/expenses/summary/current'),
      api.get('/budget/current'),
      api.get('/insights'),
      api.get('/expenses?limit=5&sort=-date'),
    ]);

    renderSummaryCards(summaryRes.summary, budgetRes.budget);
    renderAlerts(insightRes.alerts || []);
    renderInsights(insightRes.insights || []);
    renderDonutChart(summaryRes.summary.categoryTotals);
    renderCategoryProgress(budgetRes.budget);
    renderRecentExpenses(expensesRes.expenses || []);
    renderWeeklyComparison(summaryRes.summary.weeklyComparison);

  } catch (err) {
    console.error('Dashboard load error:', err);
  }
};

const refreshDashboard = () => loadDashboard();

// ─────────────────────────────────────────────────────────
// SUMMARY CARDS
// ─────────────────────────────────────────────────────────
const renderSummaryCards = (summary, budget) => {
  const income    = budget?.totalIncome    || summary.income || 0;
  const spent     = summary.totalSpent     || 0;
  const remaining = summary.remaining      || 0;
  const pct       = income > 0 ? Math.round((spent / income) * 100) : 0;
  const daysLeft  = summary.daysLeft       || 0;
  const daily     = summary.avgDailySpend  || 0;
  const safeDaily = daysLeft > 0 ? Math.floor(remaining / daysLeft) : 0;

  setText('card-income',         formatINR(income));
  setText('card-spent',          formatINR(spent));
  setText('card-spent-pct',      `${pct}% of income`);
  setText('card-remaining',      formatINR(remaining));
  setText('card-remaining-days', `${daysLeft} day(s) left this month`);
  setText('card-daily',          formatINR(daily));
  setText('card-daily-limit',    `Safe limit: ${formatINR(safeDaily)}/day`);

  // Color remaining card based on how much is left
  const remainingCard = document.querySelector('.card-remaining');
  if (remainingCard) {
    remainingCard.classList.toggle('card-danger',  pct >= 90);
    remainingCard.classList.toggle('card-warning', pct >= 70 && pct < 90);
  }
};

// ─────────────────────────────────────────────────────────
// ALERTS PANEL
// ─────────────────────────────────────────────────────────
const renderAlerts = (alerts) => {
  const panel = document.getElementById('alerts-panel');
  if (!panel) return;

  if (!alerts.length) {
    panel.innerHTML = '';
    return;
  }

  panel.innerHTML = alerts.map(alert => `
    <div class="alert-item alert-${alert.severity}">
      <span class="alert-icon">${alert.severity === 'danger' ? '🚨' : '⚠️'}</span>
      <span class="alert-msg">${alert.message}</span>
    </div>
  `).join('');
};

// ─────────────────────────────────────────────────────────
// INSIGHTS LIST
// ─────────────────────────────────────────────────────────
const renderInsights = (insights) => {
  const list      = document.getElementById('insights-list');
  const countBadge = document.getElementById('insights-count');
  if (!list) return;

  if (countBadge) countBadge.textContent = insights.length;

  if (!insights.length) {
    list.innerHTML = '<div class="empty-state">No insights yet. Add some expenses to get started!</div>';
    return;
  }

  // Show top 6 insights
  list.innerHTML = insights.slice(0, 6).map(insight => `
    <div class="insight-item insight-${insight.severity || 'info'}">
      <span class="insight-msg">${insight.message}</span>
    </div>
  `).join('');
};

// ─────────────────────────────────────────────────────────
// DONUT CHART
// ─────────────────────────────────────────────────────────
const renderDonutChart = (categoryTotals) => {
  const canvas = document.getElementById('donut-chart');
  const legend = document.getElementById('donut-legend');
  if (!canvas || !categoryTotals?.length) return;

  const labels = categoryTotals.map(c => capitalize(c._id));
  const values = categoryTotals.map(c => c.total);
  const colors = categoryTotals.map((_, i) => getChartColor(i));

  if (donutChart) donutChart.destroy();

  donutChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatINR(ctx.raw)}`,
          },
        },
      },
    },
  });

  // Custom legend
  if (legend) {
    legend.innerHTML = categoryTotals.map((c, i) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${colors[i]}"></span>
        <span class="legend-label">${capitalize(c._id)}</span>
        <span class="legend-value">${formatINR(c.total)}</span>
      </div>
    `).join('');
  }
};

// ─────────────────────────────────────────────────────────
// CATEGORY PROGRESS BARS
// ─────────────────────────────────────────────────────────
const renderCategoryProgress = (budget) => {
  const container = document.getElementById('category-progress-list');
  if (!container || !budget?.categories?.length) {
    if (container) container.innerHTML = '<div class="empty-state">No categories set up yet.</div>';
    return;
  }

  container.innerHTML = budget.categories.map(cat => {
    const pct    = cat.allocatedAmount > 0
      ? Math.min(100, Math.round((cat.spentAmount / cat.allocatedAmount) * 100))
      : 0;
    const status = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'success';

    return `
      <div class="progress-item">
        <div class="progress-header">
          <span class="progress-name">${capitalize(cat.name)}</span>
          <span class="progress-amounts">
            ${formatINR(cat.spentAmount)} / ${formatINR(cat.allocatedAmount)}
          </span>
        </div>
        <div class="progress-bar-track">
          <div
            class="progress-bar-fill progress-${status}"
            style="width: ${pct}%"
          ></div>
        </div>
        <div class="progress-footer">
          <span class="progress-pct progress-${status}">${pct}% used</span>
          <span class="progress-remaining">${formatINR(Math.max(0, cat.allocatedAmount - cat.spentAmount))} left</span>
        </div>
      </div>
    `;
  }).join('');
};

// ─────────────────────────────────────────────────────────
// RECENT EXPENSES
// ─────────────────────────────────────────────────────────
const renderRecentExpenses = (expenses) => {
  const list = document.getElementById('recent-expenses-list');
  if (!list) return;

  if (!expenses.length) {
    list.innerHTML = '<div class="empty-state">No expenses yet. <a href="expenses.html">Add one →</a></div>';
    return;
  }

  list.innerHTML = expenses.map(exp => `
    <div class="recent-item">
      <div class="recent-item-left">
        <span class="recent-category">${capitalize(exp.category)}</span>
        <span class="recent-desc">${exp.description || '—'}</span>
      </div>
      <div class="recent-item-right">
        <span class="recent-amount">${formatINR(exp.amount)}</span>
        <span class="recent-date">${formatDate(exp.date)}</span>
      </div>
    </div>
  `).join('');
};

// ─────────────────────────────────────────────────────────
// WEEKLY COMPARISON
// ─────────────────────────────────────────────────────────
const renderWeeklyComparison = (weekly) => {
  const container = document.getElementById('weekly-comparison');
  if (!container || !weekly) return;

  const { thisWeek, lastWeek, percentChange } = weekly;
  const isUp   = percentChange > 0;
  const isDown = percentChange < 0;
  const arrow  = isUp ? '↑' : isDown ? '↓' : '→';
  const status = isUp ? 'danger' : isDown ? 'success' : 'info';
  const abs    = Math.abs(percentChange || 0);

  container.innerHTML = `
    <div class="weekly-grid">
      <div class="weekly-item">
        <div class="weekly-label">This Week</div>
        <div class="weekly-value">${formatINR(thisWeek)}</div>
      </div>
      <div class="weekly-arrow weekly-${status}">${arrow} ${abs}%</div>
      <div class="weekly-item">
        <div class="weekly-label">Last Week</div>
        <div class="weekly-value">${formatINR(lastWeek)}</div>
      </div>
    </div>
    <p class="weekly-summary">
      ${percentChange === null
        ? 'Not enough data for comparison yet.'
        : isUp
          ? `Spending increased by ${abs}% compared to last week.`
          : isDown
            ? `Great job! Spending reduced by ${abs}% compared to last week.`
            : 'Spending is the same as last week.'}
    </p>
  `;
};

// ─────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────
const setText = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};