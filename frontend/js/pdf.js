// ─────────────────────────────────────────────────────────
// pdf.js — Monthly Expense Report with Overspend Analysis
// ─────────────────────────────────────────────────────────

const generatePDFReport = async () => {
  const btns = document.querySelectorAll('[onclick="generatePDFReport()"]');
  btns.forEach(b => { b.disabled = true; b.textContent = '⏳ Generating...'; });

  try {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const [summaryRes, budgetRes, insightRes, expensesRes] = await Promise.all([
      api.get(`/expenses/summary/${year}/${month}`),
      api.get('/budget/current'),
      api.get('/insights'),
      api.get(`/expenses?month=${month}&year=${year}&limit=200`),
    ]);

    const summary  = summaryRes.summary  || {};
    const budget   = budgetRes.budget    || {};
    const insights = insightRes.insights || [];
    const alerts   = insightRes.alerts   || [];
    const expenses = expensesRes.expenses || [];
    const user     = getUser();

    const { jsPDF } = window.jspdf;
    if (!jsPDF) { alert('PDF library not loaded. Please refresh.'); return; }

    const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW     = 210, PH = 297, M = 16, CW = PW - M * 2;
    let y        = M;

    const MONTHS = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

    // ── Palette ─────────────────────────────────────────
    const G1 = [25,26,25],  G2 = [30,81,40],   G3 = [78,159,61];
    const G4 = [216,233,168], OK = [46,160,67], WN = [230,160,20];
    const ER = [210,60,60],  DK = [28,28,28],   GR = [100,100,100];
    const LB = [244,249,240];

    // ── Helpers ──────────────────────────────────────────
    const fc  = (r,g,b) => doc.setFillColor(r,g,b);
    const tc  = (r,g,b) => doc.setTextColor(r,g,b);
    const dc  = (r,g,b) => doc.setDrawColor(r,g,b);
    const fn  = s       => doc.setFont('helvetica', s);
    const fs  = s       => doc.setFontSize(s);
    const nl  = (n=5)   => { y += n; };
    const inr = v       => '\u20B9' + Number(v||0).toLocaleString('en-IN');
    const cap = s       => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

    const pb = (need=18) => {
      if (y + need > PH - 16) { doc.addPage(); y = M + 8; }
    };

    const hr = (c=[190,220,180]) => {
      dc(...c); doc.setLineWidth(0.25);
      doc.line(M, y, PW-M, y); nl(5);
    };

    const section = (title, icon='') => {
      pb(18);
      fc(...LB); doc.roundedRect(M, y-4, CW, 12, 2, 2, 'F');
      fc(...G3); doc.rect(M, y-4, 4, 12, 'F');
      fn('bold'); fs(11); tc(...G2);
      doc.text(`${icon}  ${title}`, M+8, y+3.5);
      nl(13);
    };

    const badge = (x, yy, w, h, text, bg, textColor) => {
      fc(...bg); doc.roundedRect(x, yy, w, h, 1.5, 1.5, 'F');
      tc(...textColor); fn('bold'); fs(7.5);
      doc.text(text, x + w/2, yy + h/2 + 2.5, { align:'center' });
    };

    // ── PAGE 1 HEADER ────────────────────────────────────
    fc(...G1); doc.rect(0, 0, PW, 44, 'F');
    fc(...G3); doc.rect(0, 0, 6, 44, 'F');
    // Diagonal accent
    fc(...G2);
    doc.triangle(PW-60, 0, PW, 0, PW, 44, 'F');

    fn('bold'); fs(24); tc(...G4); y = 17;
    doc.text('PocketWise', M+5, y);
    fn('normal'); fs(8.5); tc(190,215,160); y=25;
    doc.text('Monthly Expense Report  ·  Smart Financial Analysis', M+5, y);
    fs(8); y=32;
    doc.text(`${MONTHS[month-1]} ${year}`, M+5, y);

    fn('bold'); fs(11); tc(...G4); y=18;
    doc.text(user?.name || 'User', PW-M-2, y, { align:'right' });
    fn('normal'); fs(8); tc(160,195,140); y=26;
    doc.text(`Generated ${now.toLocaleDateString('en-IN')}`, PW-M-2, y, { align:'right' });
    y = 54;

    // ── SUMMARY ROW ──────────────────────────────────────
    section('Financial Summary', '📊');

    const income    = budget.totalIncome || 0;
    const spent     = summary.totalSpent || 0;
    const remaining = income - spent;
    const savePct   = income > 0 ? Math.round(((income-spent)/income)*100) : 0;
    const usedPct   = income > 0 ? Math.min(100, Math.round((spent/income)*100)) : 0;
    const daysLeft  = summary.daysLeft || 0;
    const avgDaily  = summary.avgDailySpend || 0;
    const projected = summary.projectedMonthlySpend || 0;

    const cards = [
      { label:'Monthly Income',  val:inr(income),    col:G3  },
      { label:'Total Spent',     val:inr(spent),     col:spent>income?ER:DK },
      { label:'Remaining',       val:inr(remaining), col:remaining<0?ER:OK  },
      { label:'Savings Rate',    val:`${savePct}%`,  col:savePct>=20?OK:WN  },
    ];
    const CRD = (CW-9)/4;
    cards.forEach((c,i) => {
      const cx = M + i*(CRD+3);
      fc(...LB); doc.roundedRect(cx, y, CRD, 22, 2, 2, 'F');
      fc(...c.col); doc.rect(cx, y, CRD, 2.5, 'F');
      fn('normal'); fs(7); tc(...GR);
      doc.text(c.label, cx+CRD/2, y+10, {align:'center'});
      fn('bold'); fs(11); tc(...c.col);
      doc.text(c.val, cx+CRD/2, y+18.5, {align:'center'});
    });
    nl(30);

    // Mini stats row
    fn('normal'); fs(8); tc(...GR);
    doc.text(`Avg daily spend: ${inr(avgDaily)}`, M, y);
    doc.text(`Days left this month: ${daysLeft}`, M+60, y);
    doc.text(`Projected month-end: ${inr(projected)}`, M+115, y);
    nl(8);

    // Progress bar
    const bColor = usedPct>=100 ? ER : usedPct>=80 ? WN : G3;
    fc(210,230,200); doc.roundedRect(M, y, CW, 7, 2, 2, 'F');
    if (usedPct>0) { fc(...bColor); doc.roundedRect(M, y, CW*(usedPct/100), 7, 2, 2, 'F'); }
    fn('bold'); fs(7.5); tc(...bColor);
    doc.text(`${usedPct}% of income spent`, M+CW-1, y+4.5, {align:'right'});
    if (projected > income) {
      fn('bold'); fs(7.5); tc(...ER);
      doc.text(`⚠ On track to overspend by ${inr(projected-income)}`, M+2, y+4.5);
    }
    nl(14);

    // ── OVERSPEND ANALYSIS ───────────────────────────────
    section('Overspend Analysis', '🚨');

    const overspentCats  = (budget.categories||[]).filter(c => c.spentAmount > c.allocatedAmount);
    const nearLimitCats  = (budget.categories||[]).filter(c => {
      const p = c.allocatedAmount > 0 ? (c.spentAmount/c.allocatedAmount)*100 : 0;
      return p >= 80 && p < 100;
    });
    const healthyCats    = (budget.categories||[]).filter(c => {
      const p = c.allocatedAmount > 0 ? (c.spentAmount/c.allocatedAmount)*100 : 0;
      return p < 80;
    });

    if (!overspentCats.length && !nearLimitCats.length) {
      fc(230,245,225); doc.roundedRect(M, y-2, CW, 14, 2, 2, 'F');
      fn('bold'); fs(9.5); tc(...OK);
      doc.text('✅  Great job! No overspending this month.', M+6, y+6);
      nl(18);
    } else {
      // Overspent categories
      if (overspentCats.length) {
        fn('bold'); fs(9); tc(...ER); doc.text('Overspent Categories', M, y); nl(7);
        overspentCats.forEach(cat => {
          pb(18);
          const over    = cat.spentAmount - cat.allocatedAmount;
          const overPct = Math.round((cat.spentAmount/cat.allocatedAmount)*100);

          // Red row background
          fc(255,242,242); doc.roundedRect(M, y-2, CW, 16, 2, 2, 'F');
          dc(...ER); doc.setLineWidth(0.4);
          doc.roundedRect(M, y-2, CW, 16, 2, 2, 'S');
          dc(...ER); doc.setLineWidth(2);
          doc.line(M, y-2, M, y+14);

          fn('bold'); fs(9.5); tc(...DK);
          doc.text(cap(cat.name), M+6, y+4.5);

          fn('normal'); fs(8); tc(...GR);
          doc.text(`Budget: ${inr(cat.allocatedAmount)}`, M+6, y+10.5);
          doc.text(`Spent: ${inr(cat.spentAmount)}`, M+45, y+10.5);

          // Overspent badge
          badge(M+CW-44, y+1, 42, 12,
            `OVER by ${inr(over)} (${overPct}%)`, ER, [255,255,255]);

          // Mini expense bar
          fc(255,200,200); doc.roundedRect(M+6, y+13, CW-12, 3, 1, 1, 'F');
          fc(...ER); doc.roundedRect(M+6, y+13, Math.min(CW-12, (CW-12)*(cat.allocatedAmount/cat.spentAmount)), 3, 1, 1, 'F');

          nl(20);
        });
        nl(4);
      }

      // Near-limit categories
      if (nearLimitCats.length) {
        pb(12);
        fn('bold'); fs(9); tc(...WN); doc.text('Near Limit (80%+)', M, y); nl(7);
        nearLimitCats.forEach(cat => {
          pb(14);
          const pct = Math.round((cat.spentAmount/cat.allocatedAmount)*100);
          const rem = cat.allocatedAmount - cat.spentAmount;

          fc(255,250,235); doc.roundedRect(M, y-2, CW, 13, 2, 2, 'F');
          dc(...WN); doc.setLineWidth(1.5);
          doc.line(M, y-2, M, y+11);

          fn('bold'); fs(9); tc(...DK);
          doc.text(cap(cat.name), M+5, y+4);
          fn('normal'); fs(8); tc(...GR);
          doc.text(`${inr(cat.spentAmount)} of ${inr(cat.allocatedAmount)}  ·  ${inr(rem)} left`, M+5, y+9.5);
          badge(M+CW-34, y+1.5, 32, 9, `${pct}% used`, WN, [60,40,0]);
          nl(16);
        });
        nl(4);
      }
    }

    // ── CATEGORY FULL BREAKDOWN ──────────────────────────
    pb(20);
    section('Category Breakdown', '📋');

    // Table header
    fc(215,235,205); doc.rect(M, y-3, CW, 9, 'F');
    fn('bold'); fs(8); tc(...G2);
    const CT = { n:M+3, a:M+68, s:M+102, r:M+136, p:M+162, bar:M+172 };
    doc.text('Category', CT.n, y+2.5);
    doc.text('Budgeted', CT.a, y+2.5);
    doc.text('Spent',    CT.s, y+2.5);
    doc.text('Left',     CT.r, y+2.5);
    doc.text('Used',     CT.p, y+2.5);
    nl(11);

    ;(budget.categories||[]).forEach((cat, idx) => {
      pb(10);
      if (idx%2===0) { fc(248,252,245); doc.rect(M, y-3, CW, 8, 'F'); }

      const p   = cat.allocatedAmount>0
        ? Math.round((cat.spentAmount/cat.allocatedAmount)*100) : 0;
      const rem = cat.allocatedAmount - cat.spentAmount;
      const pc  = p>=100 ? ER : p>=80 ? WN : G3;

      fn('normal'); fs(8.5); tc(...DK);
      doc.text(cap(cat.name),             CT.n, y);
      doc.text(inr(cat.allocatedAmount),  CT.a, y);
      doc.text(inr(cat.spentAmount),      CT.s, y);
      tc(...(rem<0?ER:DK));
      doc.text(inr(rem),                  CT.r, y);
      fn('bold'); tc(...pc);
      doc.text(`${p}%`,                   CT.p, y);

      // Mini bar
      const barMaxW = CW - (CT.bar - M) - 4;
      fc(220,235,210); doc.roundedRect(CT.bar, y-2.5, barMaxW, 4, 1, 1, 'F');
      if (p>0) {
        fc(...pc);
        doc.roundedRect(CT.bar, y-2.5, Math.min(barMaxW, barMaxW*(p/100)), 4, 1, 1, 'F');
      }
      nl(9);
    });

    // Totals row
    hr([170,205,160]);
    fn('bold'); fs(8.5); tc(...DK);
    doc.text('TOTAL', CT.n, y);
    doc.text(inr(income), CT.a, y);
    tc(...(spent>income?ER:DK)); doc.text(inr(spent), CT.s, y);
    tc(...(remaining<0?ER:OK)); doc.text(inr(remaining), CT.r, y);
    nl(12);

    // ── ALL EXPENSES LIST ────────────────────────────────
    pb(20);
    section('All Expenses This Month', '💸');

    fn('bold'); fs(7.5); tc(...GR);
    doc.text(`Total transactions: ${expenses.length}`, M, y); nl(8);

    // Group by category
    const byCategory = {};
    expenses.forEach(e => {
      const k = e.category.toLowerCase();
      if (!byCategory[k]) byCategory[k] = [];
      byCategory[k].push(e);
    });

    Object.entries(byCategory).sort((a,b) => {
      const ta = a[1].reduce((s,e) => s+e.amount, 0);
      const tb = b[1].reduce((s,e) => s+e.amount, 0);
      return tb - ta; // highest spending category first
    }).forEach(([catName, catExps]) => {
      pb(16);
      const catTotal = catExps.reduce((s,e) => s+e.amount, 0);
      const budCat   = (budget.categories||[]).find(c => c.name===catName);
      const catPct   = budCat?.allocatedAmount > 0
        ? Math.round((catTotal/budCat.allocatedAmount)*100) : null;
      const catColor = catPct===null ? GR : catPct>=100 ? ER : catPct>=80 ? WN : G3;

      // Category subheader
      fc(235,245,230); doc.rect(M, y-2, CW, 9, 'F');
      fc(...catColor); doc.rect(M, y-2, 3, 9, 'F');
      fn('bold'); fs(9); tc(...DK);
      doc.text(cap(catName), M+6, y+4);
      fn('normal'); fs(8); tc(...GR);
      if (budCat) doc.text(`${inr(catTotal)} of ${inr(budCat.allocatedAmount)} budgeted`, M+55, y+4);
      if (catPct !== null) {
        tc(...catColor); fn('bold'); fs(8);
        doc.text(`${catPct}%`, PW-M-2, y+4, {align:'right'});
      }
      nl(12);

      // Expense rows
      catExps.sort((a,b) => b.amount-a.amount).forEach(exp => {
        pb(7);
        fn('normal'); fs(8); tc(...GR);
        doc.text(formatDate(exp.date), M+4, y);
        tc(...DK);
        const desc = (exp.description || '—').slice(0, 42);
        doc.text(desc, M+28, y);
        fn('bold'); tc(...G2);
        doc.text(inr(exp.amount), PW-M-2, y, {align:'right'});
        nl(7);
      });
      nl(3);
    });

    // ── WHERE YOU OVERSPENT — ACTIONABLE SECTION ─────────
    if (overspentCats.length > 0 || alerts.length > 0) {
      pb(20);
      section('Where You Overspent — Action Plan', '🎯');

      overspentCats.forEach(cat => {
        pb(32);
        const over    = cat.spentAmount - cat.allocatedAmount;
        const overPct = Math.round((cat.spentAmount/cat.allocatedAmount)*100);

        // Red highlight box
        fc(255,240,240); doc.roundedRect(M, y-2, CW, 28, 2, 2, 'F');
        dc(...ER); doc.setLineWidth(0.4); doc.roundedRect(M, y-2, CW, 28, 2, 2, 'S');

        fn('bold'); fs(11); tc(...ER);
        doc.text(`${cap(cat.name)} — ${overPct}% of budget used`, M+5, y+5);

        fn('normal'); fs(8.5); tc(...DK);
        doc.text(`You budgeted ${inr(cat.allocatedAmount)} but spent ${inr(cat.spentAmount)}`, M+5, y+12);

        tc(...ER); fn('bold');
        doc.text(`Overspent by ${inr(over)}`, M+5, y+19);

        // How to fix
        const daysInMonth = new Date(year, month, 0).getDate();
        const reducePerDay = Math.ceil(over / daysInMonth);
        fn('normal'); fs(8); tc(...G2);
        doc.text(`💡 To avoid this next month: reduce daily ${cat.name} spend by ${inr(reducePerDay)}/day`, M+5, y+25);
        nl(34);
      });

      // Smart alerts
      if (alerts.length) {
        alerts.forEach(alert => {
          pb(14);
          const ac = alert.severity==='danger' ? ER : WN;
          fc(alert.severity==='danger'?[255,242,242]:[255,251,235]);
          doc.roundedRect(M, y-2, CW, 12, 2, 2, 'F');
          fc(...ac); doc.rect(M, y-2, 3, 12, 'F');
          fn('normal'); fs(8.5); tc(...DK);
          const lines = doc.splitTextToSize(alert.message, CW-10);
          doc.text(lines, M+6, y+4);
          nl(15);
        });
      }
    }

    // ── SMART INSIGHTS ───────────────────────────────────
    if (insights.length) {
      pb(20);
      section('Smart Insights', '🧠');
      insights.slice(0,10).forEach(ins => {
        pb(14);
        const ic = ins.severity==='danger'?ER : ins.severity==='warning'?WN :
                   ins.severity==='success'?OK : G3;
        fc(...ic); doc.circle(M+3.5, y-0.5, 2, 'F');
        fn('normal'); fs(8.5); tc(...DK);
        const lines = doc.splitTextToSize(ins.message, CW-12);
        doc.text(lines, M+8, y);
        nl(lines.length*5+4);
      });
    }

    // ── FOOTER ──────────────────────────────────────────
    const pages = doc.internal.getNumberOfPages();
    for (let p=1; p<=pages; p++) {
      doc.setPage(p);
      fc(...G1); doc.rect(0, PH-11, PW, 11, 'F');
      fc(...G3); doc.rect(0, PH-11, 5, 11, 'F');
      fn('normal'); fs(7.5); tc(...G4);
      doc.text('PocketWise — Smart Financial Decision Assistant', M+3, PH-4.5);
      doc.text(`Page ${p} of ${pages}`, PW-M, PH-4.5, {align:'right'});
    }

    // ── SAVE ────────────────────────────────────────────
    const fname = `PocketWise_Report_${MONTHS[month-1]}_${year}.pdf`;
    doc.save(fname);

    ['expense-alert','analytics-alert','budget-alert','goals-alert'].forEach(id => {
      if (document.getElementById(id))
        showPageAlert(id, `✅ Report downloaded: ${fname}`, 'success');
    });

  } catch(err) {
    console.error('PDF error:', err);
    alert(`PDF failed: ${err.message}. Make sure you have expenses added this month.`);
  } finally {
    btns.forEach(b => { b.disabled=false; b.innerHTML='📄 Export PDF'; });
  }
};