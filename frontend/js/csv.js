// ─────────────────────────────────────────────────────────
// csv.js — CSV upload + import preview
// Works on the expenses page
// Expected CSV columns: date, category, amount, description
// ─────────────────────────────────────────────────────────

let parsedCSVRows = [];   // holds preview rows before final import

// ─────────────────────────────────────────────────────────
// OPEN CSV MODAL
// ─────────────────────────────────────────────────────────
const openCSVModal = () => {
  resetCSVModal();
  document.getElementById('csv-modal')?.classList.remove('hidden');
};

const closeCSVModal = () => {
  document.getElementById('csv-modal')?.classList.add('hidden');
  resetCSVModal();
};

const resetCSVModal = () => {
  parsedCSVRows = [];
  const fileInput = document.getElementById('csv-file-input');
  if (fileInput) fileInput.value = '';
  document.getElementById('csv-preview-section')?.classList.add('hidden');
  document.getElementById('csv-upload-section')?.classList.remove('hidden');
  document.getElementById('csv-import-btn')?.classList.add('hidden');
  hideAlert('csv-alert');
};

// ─────────────────────────────────────────────────────────
// FILE SELECTED — parse and preview
// ─────────────────────────────────────────────────────────
const handleCSVFile = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.csv')) {
    showAlert('csv-alert', 'Please upload a .csv file only', 'error');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showAlert('csv-alert', 'File too large. Max 2MB allowed.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      parseCSV(e.target.result);
    } catch (err) {
      showAlert('csv-alert', `Parse error: ${err.message}`, 'error');
    }
  };
  reader.readAsText(file);
};

// ─────────────────────────────────────────────────────────
// PARSE CSV TEXT
// ─────────────────────────────────────────────────────────
const parseCSV = (text) => {
  hideAlert('csv-alert');

  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) {
    showAlert('csv-alert', 'CSV must have a header row and at least one data row', 'error');
    return;
  }

  // Parse header — case-insensitive, trim spaces
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  // Required columns
  const required = ['date', 'category', 'amount'];
  const missing  = required.filter(r => !headers.includes(r));
  if (missing.length) {
    showAlert('csv-alert',
      `Missing required columns: ${missing.join(', ')}. 
       Your CSV must have: date, category, amount (and optionally: description)`,
      'error'
    );
    return;
  }

  const idx = {
    date:        headers.indexOf('date'),
    category:    headers.indexOf('category'),
    amount:      headers.indexOf('amount'),
    description: headers.indexOf('description'),
  };

  const rows    = [];
  const errors  = [];

  lines.slice(1).forEach((line, i) => {
    // Handle quoted fields with commas inside
    const cols = parseCSVLine(line);
    const row  = {
      date:        cols[idx.date]?.trim().replace(/['"]/g, '')        || '',
      category:    cols[idx.category]?.trim().replace(/['"]/g, '').toLowerCase() || '',
      amount:      parseFloat(cols[idx.amount]?.trim().replace(/['"]/g, ''))     || 0,
      description: idx.description >= 0 ? (cols[idx.description]?.trim().replace(/['"]/g, '') || '') : '',
      _rowNum:     i + 2,
      _valid:      true,
      _error:      '',
    };

    // Validate
    if (!row.date || isNaN(new Date(row.date).getTime())) {
      row._valid = false; row._error = 'Invalid date';
    } else if (!row.category) {
      row._valid = false; row._error = 'Missing category';
    } else if (!row.amount || row.amount <= 0) {
      row._valid = false; row._error = 'Invalid amount';
    }

    // Normalize date to YYYY-MM-DD
    if (row._valid) {
      row.date = new Date(row.date).toISOString().split('T')[0];
    }

    rows.push(row);
    if (!row._valid) errors.push(`Row ${row._rowNum}: ${row._error}`);
  });

  parsedCSVRows = rows;

  const validCount   = rows.filter(r => r._valid).length;
  const invalidCount = rows.length - validCount;

  if (validCount === 0) {
    showAlert('csv-alert', `No valid rows found. Errors:\n${errors.slice(0, 5).join('\n')}`, 'error');
    return;
  }

  if (invalidCount > 0) {
    showAlert('csv-alert',
      `${validCount} valid rows, ${invalidCount} will be skipped (invalid data).`,
      'warning'
    );
  }

  renderCSVPreview(rows);
};

// ─────────────────────────────────────────────────────────
// PARSE A SINGLE CSV LINE (handles quoted commas)
// ─────────────────────────────────────────────────────────
const parseCSVLine = (line) => {
  const result = [];
  let   current = '';
  let   inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

// ─────────────────────────────────────────────────────────
// RENDER PREVIEW TABLE
// ─────────────────────────────────────────────────────────
const renderCSVPreview = (rows) => {
  const section = document.getElementById('csv-preview-section');
  const tbody   = document.getElementById('csv-preview-tbody');
  const counter = document.getElementById('csv-row-count');
  const importBtn = document.getElementById('csv-import-btn');

  if (!section || !tbody) return;

  const validCount = rows.filter(r => r._valid).length;
  if (counter) counter.textContent = `${validCount} valid rows ready to import`;

  tbody.innerHTML = rows.map(row => `
    <tr class="${row._valid ? '' : 'row-invalid'}">
      <td>${row._rowNum}</td>
      <td>${row.date}</td>
      <td>${capitalize(row.category)}</td>
      <td>${row.description || '—'}</td>
      <td>${row._valid ? formatINR(row.amount) : row.amount}</td>
      <td>
        ${row._valid
          ? '<span class="csv-status-valid">✅ Valid</span>'
          : `<span class="csv-status-invalid" title="${row._error}">❌ ${row._error}</span>`
        }
      </td>
    </tr>
  `).join('');

  section.classList.remove('hidden');
  document.getElementById('csv-upload-section')?.classList.add('hidden');
  if (importBtn) importBtn.classList.toggle('hidden', validCount === 0);
};

// ─────────────────────────────────────────────────────────
// CONFIRM IMPORT — send to backend
// ─────────────────────────────────────────────────────────
const confirmCSVImport = async () => {
  const validRows = parsedCSVRows.filter(r => r._valid).map(r => ({
    date:        r.date,
    category:    r.category,
    amount:      r.amount,
    description: r.description,
  }));

  if (!validRows.length) {
    showAlert('csv-alert', 'No valid rows to import', 'error');
    return;
  }

  setLoading('csv-import-btn', true);
  try {
    const res = await api.post('/csv/import', { expenses: validRows });
    closeCSVModal();
    showPageAlert('expense-alert',
      `✅ ${res.imported} expense${res.imported !== 1 ? 's' : ''} imported successfully!`,
      'success'
    );
    // Reload the expenses table
    if (typeof loadExpenses === 'function') await loadExpenses();
  } catch (err) {
    showAlert('csv-alert', err.message || 'Import failed. Please try again.', 'error');
  } finally {
    setLoading('csv-import-btn', false);
  }
};

// ─────────────────────────────────────────────────────────
// DOWNLOAD SAMPLE CSV
// ─────────────────────────────────────────────────────────
const downloadSampleCSV = () => {
  const sample = [
    'date,category,amount,description',
    '2024-01-15,food,450,Grocery shopping',
    '2024-01-16,travel,120,Auto rickshaw',
    '2024-01-17,entertainment,499,Netflix subscription',
    '2024-01-18,health,800,Gym membership',
    '2024-01-20,utilities,1200,Electricity bill',
  ].join('\n');

  const blob = new Blob([sample], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'pocketwise_sample.csv';
  a.click();
  URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────────────────
// BIND CSV MODAL EVENTS
// ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('csv-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'csv-modal') closeCSVModal();
  });
  document.getElementById('csv-file-input')?.addEventListener('change', handleCSVFile);
});