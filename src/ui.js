import { computeTodayTotals } from './macroEngine.js';

export function updateStatusTime() {
  const now = new Date();
  const t = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  document.querySelectorAll('.status-time').forEach(el => el.textContent = t);
}

export function updateDashboard(profile, todayLog, waterL) {
  const goals = profile;
  const { totals, pct } = computeTodayTotals(todayLog, goals);

  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('home-date').textContent =
    `${days[now.getDay()]} · ${months[now.getMonth()]} ${now.getDate()}`;

  const nameEl = document.getElementById('home-name');
  if (nameEl) nameEl.textContent = profile.name || 'there';

  const ringEl = document.getElementById('cal-ring-fill');
  if (ringEl) {
    const circumference = 201;
    const offset = circumference - (circumference * pct.kcal / 100);
    ringEl.style.strokeDashoffset = offset;
  }
  setText('ring-kcal', totals.kcal);
  setText('ring-goal', `/ ${goals.calGoal || 2000}`);

  setText('macro-protein', `${totals.protein_g} / ${goals.proteinGoal || 120}g`);
  setText('macro-carbs',   `${totals.carbs_g} / ${goals.carbGoal || 220}g`);
  setText('macro-fat',     `${totals.fat_g} / ${goals.fatGoal || 70}g`);
  setText('macro-water',   `${waterL.toFixed(1)} / ${goals.waterGoal || 2}L`);

  setWidth('bar-protein', pct.protein);
  setWidth('bar-carbs',   pct.carbs);
  setWidth('bar-fat',     pct.fat);
  setWidth('bar-water',   Math.min(100, Math.round((waterL / (goals.waterGoal || 2)) * 100)));

  renderLogList(todayLog, waterL);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = pct + '%';
}

export function renderLogList(todayLog, waterL) {
  const list = document.getElementById('today-log-list');
  if (!list) return;

  const items = [...todayLog];
  if (waterL > 0) {
    items.push({ _water: true, time: '—', meal: `Water logged`, kcal: 0, waterL });
  }

  if (items.length === 0) {
    list.innerHTML = '<div class="empty-log">No meals logged yet. Tap Log to add your first meal.</div>';
    return;
  }

  const iconMap = {
    voice: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M19 10a7 7 0 0 1-14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>`,
    photo: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sky)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 9a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.66-.89l.82-1.22A2 2 0 0 1 10.07 4h3.86a2 2 0 0 1 1.66.89l.82 1.22A2 2 0 0 0 18.07 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
    manual: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
    water: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sky)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`
  };

  list.innerHTML = items.slice().reverse().map(entry => {
    if (entry._water) {
      return `<div class="log-item">
        <div class="log-icon">${iconMap.water}</div>
        <div class="log-info">
          <div class="log-name">Water intake today</div>
          <div class="log-meta">${entry.waterL.toFixed(2)}L total</div>
        </div>
        <span class="log-badge water">Water</span>
      </div>`;
    }
    const src = entry.source || 'manual';
    return `<div class="log-item">
      <div class="log-icon">${iconMap[src] || iconMap.manual}</div>
      <div class="log-info">
        <div class="log-name">${escapeHtml(entry.meal)}</div>
        <div class="log-meta">${entry.time || ''}</div>
      </div>
      <div class="log-cal">${entry.kcal} kcal</div>
      <span class="log-badge ${src}">${src}</span>
      <button class="log-delete" onclick="window.vitaApp.deleteMeal(${entry.id})" title="Remove">×</button>
    </div>`;
  }).join('');
}

export function showParsedCard(meal) {
  document.getElementById('parsed-food-name').textContent = meal.meal;
  document.getElementById('pm-cal').textContent  = meal.kcal;
  document.getElementById('pm-pro').textContent  = meal.protein_g + 'g';
  document.getElementById('pm-carb').textContent = meal.carbs_g + 'g';
  document.getElementById('pm-fat').textContent  = meal.fat_g + 'g';
  document.getElementById('parsed-note').textContent = meal.coaching_note || '';
  document.getElementById('parsed-card').classList.add('active');
  document.getElementById('processing-card').style.display = 'none';
}

export function showProcessing(text = 'Analyzing…') {
  document.getElementById('processing-card').style.display = 'flex';
  document.getElementById('processing-text').textContent = text;
  document.getElementById('parsed-card').classList.remove('active');
}

export function hideProcessing() {
  document.getElementById('processing-card').style.display = 'none';
}

export function hideParsedCard() {
  document.getElementById('parsed-card').classList.remove('active');
}

export function addChatMessage(role, text, isTyping = false) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `msg ${role}${isTyping ? ' coach-typing' : ''}`;
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (isTyping) {
    div.id = 'typing-indicator';
    div.innerHTML = `<div class="msg-bubble"><div class="proc-dot"></div><div class="proc-dot"></div><div class="proc-dot"></div></div>`;
  } else {
    div.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div><div class="msg-time">${now}</div>`;
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

export function removeTypingIndicator() {
  document.getElementById('typing-indicator')?.remove();
}

export function showToast(msg, type = '') {
  const phone = document.querySelector('.phone');
  const existing = phone.querySelector('.toast');
  existing?.remove();
  const toast = document.createElement('div');
  toast.className = `toast${type ? ' ' + type : ''}`;
  toast.textContent = msg;
  phone.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

export function updateProfileScreen(profile) {
  const name = profile.name || 'You';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  setText('profile-initials', initials);
  setText('profile-name-display', name);
  setText('profile-goal-display', profile.primaryGoal || 'Goal not set');
  setText('stat-kcal', profile.calGoal || 2000);
  setText('stat-protein', (profile.proteinGoal || 120) + 'g');
  setText('stat-water', (profile.waterGoal || 2) + 'L');

  const key = localStorage.getItem('vita_api_key') || window._vitaConfig?.anthropicKey || '';
  const keyStatus = (key && key !== '__ANTHROPIC_KEY__')
    ? '••••' + key.slice(-4)
    : 'Not set';
  setText('api-key-status', keyStatus);
}

export function updateStreakBadge(days) {
  setText('streak-text', `${days}-day streak — keep going`);
}

export function setNavActive(screenName) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nsv').forEach(el => el.style.stroke = '');
  document.querySelectorAll('.nav-label').forEach(el => el.style.color = '');

  document.querySelectorAll('.bottom-nav').forEach(nav => {
    const items = nav.querySelectorAll('.nav-item');
    const labels = ['home', 'log', 'coach', 'profile'];
    items.forEach((item, i) => {
      if (labels[i] === screenName) {
        item.classList.add('active');
      }
    });
  });
}

export function renderOnboarding(step, totalSteps) {
  const wrap = document.getElementById('ob-wrap');
  if (!wrap) return;

  const dots = Array.from({ length: totalSteps }, (_, i) =>
    `<div class="ob-dot${i === step ? ' active' : ''}"></div>`
  ).join('');

  const screens = [
    // 0: Welcome + API Key
    `<div class="ob-screen">
      <div class="ob-progress">${dots}</div>
      <div class="ob-eyebrow">Welcome to Vita</div>
      <div class="ob-title">Meet <em>Aria</em>,<br>your health coach</div>
      <div class="ob-sub">Context-aware AI that knows your schedule, goals, and log — before giving advice.</div>
      <div class="ob-fields">
        <div>
          <div class="field-label">Your name</div>
          <input class="field-input" id="ob-name" type="text" placeholder="What should Aria call you?" autocomplete="off">
        </div>
        <div>
          <div class="field-label">Anthropic API Key</div>
          <div class="apikey-field">
            <input class="field-input" id="ob-apikey" type="password" placeholder="sk-ant-... (get yours free at console.anthropic.com)">
          </div>
          <div style="font-size:11px;color:var(--text3);margin-top:5px;">Your key is stored locally and never sent anywhere except Anthropic.</div>
        </div>
      </div>
      <div class="ob-actions">
        <button class="btn-primary" onclick="window.vitaApp.obNext()">Continue →</button>
      </div>
    </div>`,

    // 1: About you
    `<div class="ob-screen">
      <div class="ob-progress">${dots}</div>
      <div class="ob-eyebrow">About you</div>
      <div class="ob-title">A little about<br><em>you</em></div>
      <div class="ob-sub">Used to calculate your personalized calorie targets.</div>
      <div class="ob-fields">
        <div>
          <div class="field-label">Age</div>
          <input class="field-input" id="ob-age" type="number" placeholder="e.g. 28" min="14" max="100">
        </div>
        <div>
          <div class="field-label">Sex</div>
          <select class="field-input" id="ob-sex">
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="prefer not to say">Prefer not to say</option>
          </select>
        </div>
      </div>
      <div class="ob-actions">
        <button class="btn-primary" onclick="window.vitaApp.obNext()">Continue →</button>
        <button class="btn-ghost" onclick="window.vitaApp.obBack()">← Back</button>
      </div>
    </div>`,

    // 2: Goal
    `<div class="ob-screen">
      <div class="ob-progress">${dots}</div>
      <div class="ob-eyebrow">Your goal</div>
      <div class="ob-title">What are you<br><em>working toward?</em></div>
      <div class="ob-sub">Aria will coach you specifically toward this.</div>
      <div class="ob-fields">
        <div class="goal-options">
          <div class="goal-option" data-goal="Lose weight" onclick="window.vitaApp.selectGoal(this)">
            <div class="goal-option-icon">⚡</div>
            <div class="goal-option-label">Lose weight</div>
          </div>
          <div class="goal-option" data-goal="Build muscle" onclick="window.vitaApp.selectGoal(this)">
            <div class="goal-option-icon">💪</div>
            <div class="goal-option-label">Build muscle</div>
          </div>
          <div class="goal-option" data-goal="Maintain weight" onclick="window.vitaApp.selectGoal(this)">
            <div class="goal-option-icon">🎯</div>
            <div class="goal-option-label">Maintain weight</div>
          </div>
          <div class="goal-option" data-goal="Improve energy" onclick="window.vitaApp.selectGoal(this)">
            <div class="goal-option-icon">✨</div>
            <div class="goal-option-label">Improve energy</div>
          </div>
        </div>
      </div>
      <div class="ob-actions">
        <button class="btn-primary" onclick="window.vitaApp.obNext()">Continue →</button>
        <button class="btn-ghost" onclick="window.vitaApp.obBack()">← Back</button>
      </div>
    </div>`,

    // 3: Targets
    `<div class="ob-screen">
      <div class="ob-progress">${dots}</div>
      <div class="ob-eyebrow">Daily targets</div>
      <div class="ob-title">Your daily<br><em>nutrition goals</em></div>
      <div class="ob-sub">Auto-suggested based on your profile. Adjust as needed.</div>
      <div class="ob-fields">
        <div class="targets-grid">
          <div class="target-row">
            <div class="target-row-top">
              <span class="target-name">Calories</span>
              <span class="target-val" id="tgt-kcal-val">2000 kcal</span>
            </div>
            <input type="range" class="target-slider" id="tgt-kcal" min="1200" max="4000" step="50" value="2000"
              oninput="document.getElementById('tgt-kcal-val').textContent=this.value+' kcal'">
          </div>
          <div class="target-row">
            <div class="target-row-top">
              <span class="target-name">Protein</span>
              <span class="target-val" id="tgt-protein-val">120g</span>
            </div>
            <input type="range" class="target-slider" id="tgt-protein" min="40" max="300" step="5" value="120"
              oninput="document.getElementById('tgt-protein-val').textContent=this.value+'g'">
          </div>
          <div class="target-row">
            <div class="target-row-top">
              <span class="target-name">Water</span>
              <span class="target-val" id="tgt-water-val">2L</span>
            </div>
            <input type="range" class="target-slider" id="tgt-water" min="1" max="5" step="0.25" value="2"
              oninput="document.getElementById('tgt-water-val').textContent=this.value+'L'">
          </div>
        </div>
      </div>
      <div class="ob-actions">
        <button class="btn-primary" onclick="window.vitaApp.obNext()">Continue →</button>
        <button class="btn-ghost" onclick="window.vitaApp.obBack()">← Back</button>
      </div>
    </div>`,

    // 4: Done
    `<div class="ob-screen">
      <div class="ob-progress">${dots}</div>
      <div class="ob-eyebrow">You're all set</div>
      <div class="ob-title">Ready to start<br><em>coaching you</em></div>
      <div class="ob-sub">Aria knows your goals and is ready to help. Start by logging your first meal.</div>
      <div class="ob-fields">
        <div class="notif-card">
          <div class="notif-icon">🔔</div>
          <div class="notif-msg"><strong>Smart notifications</strong><br>Vita can remind you to eat before a flight, hit your water goal, or check in at end of day.</div>
          <button class="btn-primary" onclick="window.vitaApp.requestNotifications()" style="margin-bottom:0">Allow notifications</button>
        </div>
      </div>
      <div class="ob-actions">
        <button class="btn-primary" onclick="window.vitaApp.finishOnboarding()">Start logging →</button>
        <button class="btn-ghost" onclick="window.vitaApp.obBack()">← Back</button>
      </div>
    </div>`
  ];

  wrap.innerHTML = screens[Math.min(step, screens.length - 1)] || screens[0];
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
