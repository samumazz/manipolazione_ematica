if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker Registrato!', reg))
      .catch(err => console.error('Errore Service Worker:', err));
  });
}

const CHOSO_QUOTES = [
  "Come tuo fratello maggiore, il mio unico dovere è proteggerti. Riposati oggi.",
  "La tecnica della Manipolazione Ematica percepisce la tua stanchezza. Non sforzarti.",
  "Se qualcuno ose infastidirti in questo periodo, se la vedrà con me.",
  "Sekketsu Shōten: Convergenza. Raccolgo ogni goccia della tua energia per farti stare meglio.",
  "Ho preparato acqua calda e riposo per te. Fidati del tuo fratello maggiore.",
  "La tua salute vale più di qualsiasi battaglia. Riposa bene."
];

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDateToInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDaysDiff(d1, d2) {
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

let cycleData = JSON.parse(localStorage.getItem('chosoData')) || {
  cycleLength: 28,
  history: []
};

let currentCalDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
  initBloodCanvas();
  
  const todayStr = formatDateToInput(new Date());
  document.getElementById('startDate').value = todayStr;

  updateUI();

  document.getElementById('cycleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const selectedDate = document.getElementById('startDate').value;
    const flow = document.querySelector('input[name="flow"]:checked').value;
    const isPeriodEnd = document.getElementById('isPeriodEnd').checked;
    
    const sex = Array.from(document.querySelectorAll('input[name="sex"]:checked')).map(c => c.value);
    const symptoms = Array.from(document.querySelectorAll('input[name="symptoms"]:checked')).map(c => c.value);
    const moods = Array.from(document.querySelectorAll('input[name="moods"]:checked')).map(c => c.value);
    
    const pillToday = document.getElementById('pillToday').checked;
    const pillYesterday = document.getElementById('pillYesterday').checked;
    const medicine = document.getElementById('medicineInput').value;
    
    const temp = document.getElementById('tempInput').value;
    const weight = document.getElementById('weightInput').value;
    const notes = document.getElementById('notesInput').value;

    const newEntry = {
      date: selectedDate,
      flow,
      isPeriodEnd,
      sex,
      symptoms,
      moods,
      pillToday,
      pillYesterday,
      medicine,
      temp,
      weight,
      notes
    };

    cycleData.history = cycleData.history.filter(item => item.date !== selectedDate);
    cycleData.history.push(newEntry);
    cycleData.history.sort((a, b) => b.date.localeCompare(a.date));

    localStorage.setItem('chosoData', JSON.stringify(cycleData));

    e.target.reset();
    document.getElementById('startDate').value = todayStr;

    updateUI();
    switchTab('home');
  });
});

function switchTab(tabId) {
  document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(`tab-${tabId}`).classList.add('active');
  
  const indexMap = { 'home': 0, 'calendar': 1, 'log': 2, 'history': 3 };
  if (indexMap[tabId] !== undefined) {
    document.querySelectorAll('.nav-btn')[indexMap[tabId]].classList.add('active');
  }

  if (tabId === 'calendar') {
    renderCalendar();
  }
}

function getLatestPeriodStartDate() {
  const entry = cycleData.history.find(item => item.flow && item.flow !== 'Nessuno');
  return entry ? entry.date : null;
}

function getLatestPeriodEndDate(startDateStr) {
  if (!startDateStr) return null;
  const endEntry = cycleData.history.find(item => item.isPeriodEnd && item.date >= startDateStr);
  return endEntry ? endEntry.date : null;
}

function updateUI() {
  const latestStartStr = getLatestPeriodStartDate();
  const today = new Date();
  
  if (!latestStartStr) {
    document.getElementById('countdownDays').innerText = "--";
    document.getElementById('currentCycleDay').innerText = "--";
    document.getElementById('periodDurationText').innerText = "--";
    document.getElementById('daysToOvulation').innerText = "--";
    document.getElementById('nextDateText').innerText = "In attesa dati";
    document.getElementById('phaseBadge').innerText = "Nessun ciclo registrato";
    renderHistory();
    renderCalendar();
    return;
  }

  const lastStart = parseLocalDate(latestStartStr);
  const diffDays = Math.max(0, getDaysDiff(lastStart, today));
  
  const cycleDay = (diffDays % cycleData.cycleLength) + 1;
  const daysRemaining = Math.max(0, cycleData.cycleLength - (diffDays % cycleData.cycleLength));

  document.getElementById('countdownDays').innerText = daysRemaining;
  document.getElementById('currentCycleDay').innerText = `${cycleDay}°`;

  const latestEndStr = getLatestPeriodEndDate(latestStartStr);
  let durationText = "--";
  if (latestEndStr) {
    const endDate = parseLocalDate(latestEndStr);
    const flowDays = getDaysDiff(lastStart, endDate) + 1;
    if (flowDays > 0) durationText = `${flowDays} gg`;
  }
  document.getElementById('periodDurationText').innerText = durationText;

  const daysToOv = Math.max(0, 14 - (cycleDay - 1));
  document.getElementById('daysToOvulation').innerText = daysToOv === 0 ? "Oggi" : `${daysToOv}g`;

  const nextDate = new Date(lastStart);
  nextDate.setDate(lastStart.getDate() + cycleData.cycleLength);
  document.getElementById('nextDateText').innerText = nextDate.toLocaleDateString('it-IT');

  const pct = (daysRemaining / cycleData.cycleLength);
  const offset = 515 * (1 - pct);
  const ringCircle = document.getElementById('progressCircle');
  if (ringCircle) ringCircle.style.strokeDashoffset = offset;

  let phase = "Fase Follicolare";
  if (cycleDay <= 5) phase = "🩸 Fase Mestruale";
  else if (cycleDay >= 12 && cycleDay <= 16) phase = "✨ Ovulazione / Fertile";
  else if (cycleDay > 16) phase = "🌙 Fase Luteale";
  
  document.getElementById('phaseBadge').innerText = phase;
  
  renderHistory();
  renderCalendar();
}

function changeMonth(delta) {
  currentCalDate.setMonth(currentCalDate.getMonth() + delta);
  renderCalendar();
}

function renderCalendar() {
  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();

  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  document.getElementById('calMonthTitle').innerText = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startDayIndex = firstDay.getDay() - 1;
  if (startDayIndex === -1) startDayIndex = 6;

  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  for (let i = 0; i < startDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'cal-day empty';
    grid.appendChild(emptyCell);
  }

  const latestStartStr = getLatestPeriodStartDate();
  const lastStart = latestStartStr ? parseLocalDate(latestStartStr) : null;
  const today = new Date();

  const historyMap = {};
  cycleData.history.forEach(item => {
    historyMap[item.date] = item;
  });

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const cellDate = new Date(year, month, day);
    const dateStr = formatDateToInput(cellDate);
    const dayCell = document.createElement('div');
    dayCell.className = 'cal-day';
    dayCell.innerText = day;

    if (cellDate.toDateString() === today.toDateString()) {
      dayCell.classList.add('today');
    }

    if (historyMap[dateStr] && historyMap[dateStr].flow && historyMap[dateStr].flow !== 'Nessuno') {
      dayCell.classList.add('phase-mensile');
    } else if (lastStart) {
      const diffDays = getDaysDiff(lastStart, cellDate);
      if (diffDays >= 0) {
        const cycleDay = diffDays % cycleData.cycleLength;
        if (cycleDay <= 5) dayCell.classList.add('phase-mensile');
        else if (cycleDay <= 12) dayCell.classList.add('phase-follicolare');
        else if (cycleDay <= 16) dayCell.classList.add('phase-ovulazione');
        else dayCell.classList.add('phase-luteale');
      }
    }

    grid.appendChild(dayCell);
  }
}

function summonChoso() {
  const quoteEl = document.getElementById('chosoQuote');
  const avatar = document.getElementById('avatarContainer');
  
  if (avatar) {
    avatar.style.transform = "scale(1.15)";
    setTimeout(() => avatar.style.transform = "scale(1)", 300);
  }

  const randQuote = CHOSO_QUOTES[Math.floor(Math.random() * CHOSO_QUOTES.length)];
  if (quoteEl) quoteEl.innerText = `"${randQuote}"`;
}

function renderHistory() {
  const container = document.getElementById('historyList');
  if (!container) return;

  if (cycleData.history.length === 0) {
    container.innerHTML = "<p style='color:var(--text-dim); text-align:center;'>Nessuna registrazione salvata.</p>";
    return;
  }

  container.innerHTML = cycleData.history.map((item, index) => {
    const formattedDate = parseLocalDate(item.date).toLocaleDateString('it-IT');
    return `
      <div style="border-bottom: 1px solid rgba(255,255,255,0.08); padding: 12px 0; display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="max-width:85%;">
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-bottom:4px;">
            <strong style="color:#fff;">${formattedDate}</strong>
            <span style="color:var(--crimson-blood); font-size:0.75rem; font-weight:bold; background:rgba(255,0,60,0.15); padding:2px 6px; border-radius:6px;">${item.flow || 'Nessuno'}</span>
            ${item.isPeriodEnd ? '<span style="color:#ff809b; font-size:0.72rem; background:rgba(255,0,60,0.3); padding:2px 6px; border-radius:6px; font-weight:bold;">🏁 Fine Flusso</span>' : ''}
            ${item.pillToday ? '<span style="font-size:0.75rem;">💊 Pillola</span>' : ''}
          </div>
          
          ${item.sex && item.sex.length > 0 ? `<div style="font-size:0.75rem; color:#ff809b;"><strong>Sesso/Libido:</strong> ${item.sex.join(', ')}</div>` : ''}
          ${item.symptoms && item.symptoms.length > 0 ? `<div style="font-size:0.75rem; color:var(--text-dim);"><strong>Sintomi:</strong> ${item.symptoms.join(', ')}</div>` : ''}
          ${item.moods && item.moods.length > 0 ? `<div style="font-size:0.75rem; color:var(--text-dim);"><strong>Umore:</strong> ${item.moods.join(', ')}</div>` : ''}
          ${item.medicine ? `<div style="font-size:0.72rem; color:#ffd166;">💊 <strong>Farmaci:</strong> ${item.medicine}</div>` : ''}
          
          ${(item.temp || item.weight) ? `
            <div style="font-size:0.72rem; color:#ff809b; margin-top:2px;">
              ${item.temp ? `Temp: ${item.temp}°C ` : ''} ${item.weight ? `Peso: ${item.weight}kg` : ''}
            </div>
          ` : ''}

          ${item.notes ? `<div style="font-size:0.72rem; color:#ddd; font-style:italic; margin-top:3px;">"${item.notes}"</div>` : ''}
        </div>

        <button onclick="deleteHistoryItem(${index})" title="Elimina voce" style="background:none; border:none; color:var(--text-dim); font-size:1.1rem; cursor:pointer; padding:2px 6px;">
          ✕
        </button>
      </div>
    `;
  }).join('');
}

function deleteHistoryItem(index) {
  cycleData.history.splice(index, 1);
  localStorage.setItem('chosoData', JSON.stringify(cycleData));
  updateUI();
}

function clearAllHistory() {
  if (confirm("Sei sicuro di voler eliminare tutte le registrazioni salvate?")) {
    cycleData.history = [];
    localStorage.setItem('chosoData', JSON.stringify(cycleData));
    updateUI();
  }
}

function initBloodCanvas() {
  const canvas = document.getElementById('bloodCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let angle = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.32;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 120 + i * 25, 40 + i * 10, (i * Math.PI) / 3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 0, 60, ${0.15 + i * 0.08})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();

    angle += 0.008;
    requestAnimationFrame(animate);
  }
  animate();
}