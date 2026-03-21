// ─────────────────────────────────────────────────────────
// insights.js — Smart Insight Engine display
// Used as a standalone page AND imported by dashboard
// ─────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  // Only run full page init if insights.html is loaded directly
  if (!document.getElementById('insights-page')) return;
  if (!requireAuth()) return;
  const user = getUser();
  if (!user?.isProfileComplete) { window.location.href = 'setup.html'; return; }
  initSidebar(user);
  await loadInsights();
});

// ─────────────────────────────────────────────────────────
// LOAD INSIGHTS
// ─────────────────────────────────────────────────────────
const loadInsights = async () => {
  setInsightsLoading(true);
  try {
    const res = await api.get('/insights');
    renderAllInsights(res.insights  || []);
    renderAllAlerts(res.alerts      || []);
    renderSpendingHealth(res.health || {});
  } catch (err) {
    showPageAlert('insights-alert', err.message || 'Failed to load insights', 'error');
  } finally {
    setInsightsLoading(false);
  }
};

// ─────────────────────────────────────────────────────────
// RENDER INSIGHTS — grouped by type
// ─────────────────────────────────────────────────────────
const renderAllInsights = (insights) => {
  const container = document.getElementById('all-insights-list');
  if (!container) return;

  if (!insights.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No insights yet.</p>
        <p>Add some expenses and set up your budget to get smart suggestions here.</p>
      </div>`;
    return;
  }

  // Group by severity
  const danger  = insights.filter(i => i.severity === 'danger');
  const warning = insights.filter(i => i.severity === 'warning');
  const info    = insights.filter(i => i.severity === 'info');
  const success = insights.filter(i => i.severity === 'success');

  const renderGroup = (items, label, icon) => {
    if (!items.length) return '';
    return `
      <div class="insight-group">
        <div class="insight-group-header">
          <span class="insight-group-icon">${icon}</span>
          <span class="insight-group-label">${label} (${items.length})</span>
        </div>
        ${items.map(i => `
          <div class="insight-card insight-card-${i.severity}">
            <div class="insight-card-body">
              <p class="insight-message">${i.message}</p>
              ${i.detail ? `<p class="insight-detail">${i.detail}</p>` : ''}
            </div>
            ${i.actionLabel && i.actionUrl ? `
              <a href="${i.actionUrl}" class="insight-action-link">${i.actionLabel} →</a>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  };

  container.innerHTML = [
    renderGroup(danger,  'Action needed',  '🚨'),
    renderGroup(warning, 'Heads up',       '⚠️'),
    renderGroup(success, 'Doing great',    '✅'),
    renderGroup(info,    'Just so you know','💡'),
  ].join('');
};

// ─────────────────────────────────────────────────────────
// RENDER ALERTS
// ─────────────────────────────────────────────────────────
const renderAllAlerts = (alerts) => {
  const container = document.getElementById('all-alerts-list');
  if (!container) return;

  if (!alerts.length) {
    container.innerHTML = '<div class="empty-state">No active alerts. You\'re doing great! 🎉</div>';
    return;
  }

  container.innerHTML = alerts.map(alert => `
    <div class="alert-card alert-card-${alert.severity}">
      <span class="alert-icon">${alert.severity === 'danger' ? '🚨' : '⚠️'}</span>
      <div class="alert-content">
        <p class="alert-message">${alert.message}</p>
        <span class="alert-category">${capitalize(alert.category)}</span>
      </div>
    </div>
  `).join('');
};

// ─────────────────────────────────────────────────────────
// SPENDING HEALTH SCORE
// ─────────────────────────────────────────────────────────
const renderSpendingHealth = (health) => {
  const scoreEl = document.getElementById('health-score');
  const labelEl = document.getElementById('health-label');
  const barEl   = document.getElementById('health-bar');
  const detailEl = document.getElementById('health-detail');

  if (!scoreEl) return;

  const score = health.score ?? 0;

  scoreEl.textContent = score;
  scoreEl.className   = `health-score health-score-${health.grade ?? 'c'}`;

  if (labelEl) {
    labelEl.textContent = health.label ?? 'Calculating...';
    labelEl.className   = `health-label health-label-${health.grade ?? 'c'}`;
  }

  if (barEl) {
    barEl.style.width  = `${score}%`;
    barEl.className    = `health-bar-fill ${
      score >= 80 ? 'health-excellent' :
      score >= 60 ? 'health-good'      :
      score >= 40 ? 'health-fair'      : 'health-poor'
    }`;
  }

  if (detailEl && health.breakdown) {
    detailEl.innerHTML = health.breakdown.map(item => `
      <div class="health-breakdown-item">
        <span class="breakdown-label">${item.label}</span>
        <span class="breakdown-value breakdown-${item.positive ? 'good' : 'bad'}">
          ${item.positive ? '+' : '-'}${item.points} pts — ${item.reason}
        </span>
      </div>
    `).join('');
  }
};

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
const setInsightsLoading = (loading) => {
  document.getElementById('insights-loading')?.classList.toggle('hidden', !loading);
  document.getElementById('insights-content')?.classList.toggle('hidden',  loading);
};