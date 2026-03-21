// ─────────────────────────────────────────────────────────
// analytics.js — Charts, trends, monthly breakdowns
// ─────────────────────────────────────────────────────────

// Chart instances — stored so we can destroy before redraw
const charts = {
  pie:     null,
  bar:     null,
  line:    null,
  weekly:  null,
};

window.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  const user = getUser();
  if (!user?.isProfileComplete) { window.location.href = 'setup.html'; return; }
  initSidebar(user);
  await loadAnalytics();
  bindAnalyticsEvents();
});

// ─────────────────────────────────────────────────────────
// MAIN LOAD
// ─────────────────────────────────────────────────────────
const loadAnalytics = async () => {
  setAnalyticsLoading(true);
  try {
    const now   = new Date();
    const month = getSelectedMonth() || (now.getMonth() + 1);
    const year  = getSelectedYear()  || now.getFullYear();

    const [summaryRes, budgetRes, trendsRes] = await Promise.all([
      api.get(`/expenses/summary/${year}/${month}`),
      api.get('/budget/current'),
      api.get('/expenses/trends?months=6'),
    ]);

    const summary  = summaryRes.summary  || {};
    const budget   = budgetRes.budget    || {};
    const trends   = trendsRes.trends    || {};

    renderStatCards(summary, budget);
    renderCategoryPieChart(summary.categoryTotals    || []);
    renderMonthlyBarChart(trends.monthly             || []);
    renderDailyLineChart(trends.daily                || []);
    renderWeeklyBarChart(summary.weeklyComparison    || {});
    renderCategoryTable(summary.categoryTotals       || [], budget);
    renderTopExpenses(summaryRes.topExpenses         || []);

  } catch (err) {
    showPageAlert('analytics-alert', err.message || 'Failed to load analytics', 'error');
  } finally {
    setAnalyticsLoading(false);
  }
};

// ─────────────────────────────────────────────────────────
// STAT CARDS
// ─────────────────────────────────────────────────────────
const renderStatCards = (summary, budget) => {
  const income      = budget.totalIncome    || 0;
  const spent       = summary.totalSpent    || 0;
  const remaining   = income - spent;
  const savingsRate = income > 0 ? Math.round(((income - spent) / income) * 100) : 0;
  const avgDaily    = summary.avgDailySpend || 0;
  const projected   = summary.projectedMonthlySpend || 0;

  setText('stat-income',       formatINR(income));
  setText('stat-spent',        formatINR(spent));
  setText('stat-spent-pct',    `${income > 0 ? Math.round((spent/income)*100) : 0}% used`);
  setText('stat-remaining',    formatINR(remaining));
  setText('stat-savings-rate', `${savingsRate}%`);
  setText('stat-avg-daily',    formatINR(avgDaily));
  setText('stat-projected',    formatINR(projected));

  const projCard = document.getElementById('stat-projected-card');
  if (projCard) {
    projCard.classList.toggle('card-danger',  projected > income);
    projCard.classList.toggle('card-warning', projected > income * 0.9 && projected <= income);
  }
};

// ─────────────────────────────────────────────────────────
// CATEGORY PIE CHART
// ─────────────────────────────────────────────────────────
const renderCategoryPieChart = (categoryTotals) => {
  const canvas = document.getElementById('category-pie-chart');
  if (!canvas) return;

  if (!categoryTotals.length) {
    showChartEmpty('category-pie-chart', 'No expenses this month');
    return;
  }

  const labels = categoryTotals.map(c => capitalize(c._id));
  const values = categoryTotals.map(c => c.total);
  const colors = categoryTotals.map((_, i) => getChartColor(i));

  if (charts.pie) charts.pie.destroy();

  charts.pie = new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data:            values,
        backgroundColor: colors,
        borderWidth:     2,
        borderColor:     'transparent',
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total   = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const percent = Math.round((ctx.raw / total) * 100);
              return ` ${ctx.label}: ${formatINR(ctx.raw)} (${percent}%)`;
            },
          },
        },
      },
    },
  });
};

// ─────────────────────────────────────────────────────────
// MONTHLY BAR CHART (last 6 months)
// ─────────────────────────────────────────────────────────
const renderMonthlyBarChart = (monthlyData) => {
  const canvas = document.getElementById('monthly-bar-chart');
  if (!canvas) return;

  if (!monthlyData.length) {
    showChartEmpty('monthly-bar-chart', 'Not enough data yet');
    return;
  }

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const labels = monthlyData.map(m => `${monthNames[m._id.month - 1]} ${m._id.year}`);
  const values = monthlyData.map(m => m.total);

  if (charts.bar) charts.bar.destroy();

  charts.bar = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label:           'Monthly Spending',
        data:            values,
        backgroundColor: values.map((_, i) => getChartColor(i)),
        borderRadius:    6,
        borderWidth:     0,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => ` ${formatINR(ctx.raw)}` },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => '₹' + v.toLocaleString('en-IN') },
          grid:  { color: 'rgba(255,255,255,0.05)' },
        },
        x: { grid: { display: false } },
      },
    },
  });
};

// ─────────────────────────────────────────────────────────
// DAILY SPENDING LINE CHART (last 30 days)
// ─────────────────────────────────────────────────────────
const renderDailyLineChart = (dailyData) => {
  const canvas = document.getElementById('daily-line-chart');
  if (!canvas) return;

  if (!dailyData.length) {
    showChartEmpty('daily-line-chart', 'No daily data yet');
    return;
  }

  const labels = dailyData.map(d => {
    const date = new Date(d._id);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  });
  const values = dailyData.map(d => d.total);

  // Running average
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const avgLine = new Array(values.length).fill(Math.round(avg));

  if (charts.line) charts.line.destroy();

  charts.line = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label:           'Daily Spend',
          data:            values,
          borderColor:     '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.1)',
          fill:            true,
          tension:         0.4,
          pointRadius:     3,
          pointHoverRadius: 6,
        },
        {
          label:       'Avg',
          data:        avgLine,
          borderColor: '#f59e0b',
          borderDash:  [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill:        false,
          tension:     0,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      interaction:         { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { font: { size: 12 } } },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatINR(ctx.raw)}` },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => '₹' + v.toLocaleString('en-IN') },
          grid:  { color: 'rgba(255,255,255,0.05)' },
        },
        x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
      },
    },
  });
};

// ─────────────────────────────────────────────────────────
// WEEKLY COMPARISON BAR
// ─────────────────────────────────────────────────────────
const renderWeeklyBarChart = (weekly) => {
  const canvas = document.getElementById('weekly-bar-chart');
  if (!canvas || !weekly) return;

  const { thisWeek = 0, lastWeek = 0, percentChange } = weekly;

  if (charts.weekly) charts.weekly.destroy();

  charts.weekly = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Last Week', 'This Week'],
      datasets: [{
        data:            [lastWeek, thisWeek],
        backgroundColor: [getChartColor(2), getChartColor(0)],
        borderRadius:    8,
        borderWidth:     0,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => ` ${formatINR(ctx.raw)}` },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => '₹' + v.toLocaleString('en-IN') },
          grid:  { color: 'rgba(255,255,255,0.05)' },
        },
        x: { grid: { display: false } },
      },
    },
  });

  // Weekly change label
  if (percentChange !== null && percentChange !== undefined) {
    const isUp  = percentChange > 0;
    const arrow = isUp ? '↑' : '↓';
    const cls   = isUp ? 'text-danger' : 'text-success';
    const el    = document.getElementById('weekly-change-label');
    if (el) {
      el.textContent = `${arrow} ${Math.abs(percentChange)}% vs last week`;
      el.className   = `weekly-change-label ${cls}`;
    }
  }
};

// ─────────────────────────────────────────────────────────
// CATEGORY BREAKDOWN TABLE
// ─────────────────────────────────────────────────────────
const renderCategoryTable = (categoryTotals, budget) => {
  const tbody = document.getElementById('category-table-body');
  if (!tbody) return;

  if (!categoryTotals.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-td">No data for this period.</td></tr>`;
    return;
  }

  const totalSpent = categoryTotals.reduce((s, c) => s + c.total, 0);

  tbody.innerHTML = categoryTotals.map(cat => {
    const budgetCat  = budget.categories?.find(c => c.name === cat._id);
    const allocated  = budgetCat?.allocatedAmount || 0;
    const pct        = allocated > 0 ? Math.round((cat.total / allocated) * 100) : null;
    const sharePct   = totalSpent > 0 ? Math.round((cat.total / totalSpent) * 100) : 0;
    const status     = pct === null ? 'info' : pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'success';

    return `
      <tr>
        <td><span class="category-pill">${capitalize(cat._id)}</span></td>
        <td class="amount-cell">${formatINR(cat.total)}</td>
        <td>${allocated ? formatINR(allocated) : '—'}</td>
        <td>
          ${pct !== null
            ? `<span class="pct-badge badge-${status}">${pct}%</span>`
            : '<span class="pct-badge badge-info">No budget</span>'}
        </td>
        <td>${sharePct}%</td>
      </tr>
    `;
  }).join('');
};

// ─────────────────────────────────────────────────────────
// TOP EXPENSES LIST
// ─────────────────────────────────────────────────────────
const renderTopExpenses = (expenses) => {
  const list = document.getElementById('top-expenses-list');
  if (!list) return;

  if (!expenses.length) {
    list.innerHTML = '<div class="empty-state">No expenses yet this month.</div>';
    return;
  }

  list.innerHTML = expenses.slice(0, 5).map((exp, i) => `
    <div class="top-expense-item">
      <span class="top-expense-rank">#${i + 1}</span>
      <div class="top-expense-info">
        <span class="top-expense-desc">${exp.description || capitalize(exp.category)}</span>
        <span class="top-expense-cat">${capitalize(exp.category)}</span>
      </div>
      <span class="top-expense-amount">${formatINR(exp.amount)}</span>
    </div>
  `).join('');
};

// ─────────────────────────────────────────────────────────
// MONTH PICKER
// ─────────────────────────────────────────────────────────
const getSelectedMonth = () => {
  const val = document.getElementById('month-picker')?.value;
  return val ? parseInt(val.split('-')[1]) : null;
};

const getSelectedYear = () => {
  const val = document.getElementById('month-picker')?.value;
  return val ? parseInt(val.split('-')[0]) : null;
};

const bindAnalyticsEvents = () => {
  // Set month picker to current month
  const picker = document.getElementById('month-picker');
  if (picker) {
    const now = new Date();
    picker.value  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    picker.max    = picker.value;
    picker.addEventListener('change', loadAnalytics);
  }
};

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
const showChartEmpty = (canvasId, message) => {
  const canvas  = document.getElementById(canvasId);
  if (!canvas) return;
  const wrapper = canvas.parentElement;
  canvas.classList.add('hidden');
  const msg     = document.createElement('div');
  msg.className = 'chart-empty';
  msg.textContent = message;
  wrapper.appendChild(msg);
};

const setAnalyticsLoading = (loading) => {
  document.getElementById('analytics-loading')?.classList.toggle('hidden', !loading);
  document.getElementById('analytics-content')?.classList.toggle('hidden',  loading);
};

const setText = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};