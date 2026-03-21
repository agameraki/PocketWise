// ─────────────────────────────────────────────────────────
// VIBE CHECK — Rotating Gen Z / Millennial financial lines
// Shown on dashboard. Rotates every 10s. New random line on each visit.
// Add more lines to the array below — that's all you need to do.
// ─────────────────────────────────────────────────────────

const VIBE_LINES = [
  // ── Broke era ─────────────────────────────────────────
  { emoji: '💸', text: "Your wallet said 'no cap, I'm running on fumes rn' 💀" },
  { emoji: '😭', text: "POV: you check your balance after the weekend. it's giving tragedy." },
  { emoji: '🪦', text: "RIP to your savings. they died doing what they loved — being spent." },
  { emoji: '💔', text: "Your bank account and your ambitions are NOT in the same era." },
  { emoji: '😮‍💨', text: "Bestie said YOLO. your budget said absolutely not bestie." },
  { emoji: '🫠', text: "That Zomato order really said lemme speedrun your savings real quick." },
  { emoji: '😤', text: "Me: I'll save money this month. Also me: *adds to cart*" },
  { emoji: '💀', text: "Your credit card is in its villain arc and honestly? relatable." },

  // ── Glow up / doing well ──────────────────────────────
  { emoji: '🤑', text: "Budget on track? That's main character behaviour right there. 👑" },
  { emoji: '💅', text: "Slay now AND save later? Bestie you really said both. Respect." },
  { emoji: '🧠', text: "Big brain move: checking PocketWise before splurging. You ate." },
  { emoji: '✨', text: "Your savings account is in its glow up era and we're here for it." },
  { emoji: '🎯', text: "Staying within budget? That's not boring, that's literally a flex." },
  { emoji: '🚀', text: "Financial stability unlocked. Side effects include: sleeping well." },

  // ── Reality checks ────────────────────────────────────
  { emoji: '📊', text: "That coffee habit is giving ₹3,000/month. Just saying. No judgment. Okay some judgment." },
  { emoji: '🍕', text: "Food delivery budget said 'I'm the main character this month' and won." },
  { emoji: '🛍️', text: "You said 'just window shopping' and somehow ₹2,000 disappeared. How." },
  { emoji: '📱', text: "Your screen time and your spending have the same energy. Unhinged." },
  { emoji: '☕', text: "Chai at home hits different when you realise café chai costs ₹200. Do the math bestie." },

  // ── Motivational (but make it Gen Z) ─────────────────
  { emoji: '💪', text: "Rich people budget. Mid people budget. You should too. No cap." },
  { emoji: '🧘', text: "Budget = peace of mind. Or as Gen Z says, it's giving serotonin." },
  { emoji: '📈', text: "Investing in yourself slaps. Also invest in an index fund. Both. Do both." },
  { emoji: '🎓', text: "Financial literacy is the side quest that changes your whole playthrough." },
  { emoji: '🔥', text: "Your future self is literally rooting for you rn. Don't let them down." },
  { emoji: '⚡', text: "Saving ₹100/day = ₹36,500/year. That's a trip. That's a phone. That's power." },

  // ── Relatable millennial hits ─────────────────────────
  { emoji: '😅', text: "Adulting is just paying bills until you die but at least PocketWise makes it fun." },
  { emoji: '🏠', text: "The rent is too damn high. The vibe is too damn low. Budget anyway." },
  { emoji: '😩', text: "Month start: I'll be so responsible. Month end: where did it all go." },
  { emoji: '🎪', text: "The economy is a circus and we're all just budgeting in the stands." },
  { emoji: '🧾', text: "Adulting speedrun: pay bills, question choices, open PocketWise, repeat." },
];

// ─────────────────────────────────────────────────────────
// INIT — call this from dashboard.js
// ─────────────────────────────────────────────────────────
function initVibeCheck() {
  const textEl  = document.getElementById('vibe-text');
  const emojiEl = document.getElementById('vibe-emoji');
  const dotsEl  = document.getElementById('vibe-dots');

  if (!textEl || !emojiEl || !dotsEl) return;

  const DOT_COUNT    = 5;
  const ROTATE_MS    = 10000; // rotate every 10 seconds

  // Start at a random index so every page load feels fresh
  let currentIndex = Math.floor(Math.random() * VIBE_LINES.length);

  // Build dot indicators
  dotsEl.innerHTML = '';
  for (let i = 0; i < DOT_COUNT; i++) {
    const dot = document.createElement('span');
    dot.className = 'vibe-dot';
    dotsEl.appendChild(dot);
  }

  const dots = dotsEl.querySelectorAll('.vibe-dot');

  function updateActiveDot() {
    dots.forEach((d, i) => {
      d.classList.toggle('vibe-dot-active', i === currentIndex % DOT_COUNT);
    });
  }

  function showLine(index) {
    const line = VIBE_LINES[index];

    // Fade out
    textEl.style.opacity  = '0';
    textEl.style.transform = 'translateY(6px)';

    setTimeout(() => {
      emojiEl.textContent = line.emoji;
      textEl.textContent  = line.text;

      // Fade in
      textEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      textEl.style.opacity    = '1';
      textEl.style.transform  = 'translateY(0)';

      updateActiveDot();
    }, 300);
  }

  // Show first line immediately
  showLine(currentIndex);

  // Rotate automatically
  setInterval(() => {
    currentIndex = (currentIndex + 1) % VIBE_LINES.length;
    showLine(currentIndex);
  }, ROTATE_MS);
}