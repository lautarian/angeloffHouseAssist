import { TASKS, PERSON_COLORS, PERSON_COLORS_SOFT, MAX_PEOPLE } from './tasks.js';
import {
  state, DEFAULT_NAMES,
  visibleTasks, totals, totalPool, cumulative,
  resetAssignments, persist, load,
} from './state.js';
import { computeProposal } from './balance.js';

const app = document.getElementById('app');

// ─── Debounce util ─────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ─── Person color helpers ──────────────────────────────────────────────────────
function pColor(i)     { return PERSON_COLORS[i]      ?? PERSON_COLORS[0]; }
function pColorSoft(i) { return PERSON_COLORS_SOFT[i] ?? PERSON_COLORS_SOFT[0]; }

// ─── Balance angle for the SVG beam ───────────────────────────────────────────
function beamAngle() {
  const t    = totals();
  const pool = totalPool() || 1;
  // Físicamente: el lado con más puntos pesa más y debe bajar (+angle baja derecha, -angle baja izquierda)
  const diff = t[1] - t[0];
  return Math.max(-14, Math.min(14, (diff / pool) * 28));
}

// ─── Subrender: SVG beam (2 personas) ─────────────────────────────────────────
function renderBeam2(t) {
  const angle = beamAngle();
  const pool  = totalPool();
  return `
    <svg class="beam-svg" viewBox="0 0 340 130" aria-hidden="true">
      <line x1="170" y1="62" x2="170" y2="112" stroke="var(--ink-soft)" stroke-width="3"/>
      <circle cx="170" cy="112" r="4.5" fill="var(--ink-soft)"/>
      <g class="beam-pivot" style="transform:rotate(${angle}deg)">
        <line x1="30" y1="62" x2="310" y2="62" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>
        <line x1="55"  y1="62" x2="55"  y2="90" stroke="${pColor(0)}" stroke-width="3"/>
        <line x1="285" y1="62" x2="285" y2="90" stroke="${pColor(1)}" stroke-width="3"/>
        <path d="M 28 90 Q 55 106 82 90 Z"    fill="${pColorSoft(0)}" stroke="${pColor(0)}" stroke-width="2"/>
        <path d="M 258 90 Q 285 106 312 90 Z" fill="${pColorSoft(1)}" stroke="${pColor(1)}" stroke-width="2"/>
      </g>
      <circle cx="170" cy="62" r="7" fill="var(--ink)"/>
    </svg>
    <div class="beam-nums">
      <div class="side">
        <div class="n" style="color:${pColor(0)}">${t[0]}</div>
        <div class="lbl">${state.names[0]}</div>
      </div>
      <div class="side">
        <div class="n" style="color:${pColor(1)}">${t[1]}</div>
        <div class="lbl">${state.names[1]}</div>
      </div>
    </div>
  `;
}

// ─── Subrender: bar chart (3+ personas) ───────────────────────────────────────
function renderBars(t) {
  const pool   = totalPool() || 1;
  const target = pool / state.numPeople;
  const rows   = Array.from({ length: state.numPeople }, (_, i) => {
    const pct = Math.round((t[i] / pool) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label" style="color:${pColor(i)}">${state.names[i]}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${pColor(i)}"></div>
        </div>
        <div class="bar-pts" style="color:${pColor(i)}">${t[i]}</div>
      </div>`;
  }).join('');
  return `<div class="bars-wrap">${rows}</div>`;
}

// ─── Subrender: balance visualisation ─────────────────────────────────────────
function renderBalance() {
  const t    = totals();
  const pool = totalPool();
  const vis  = t.reduce((a, b) => a + b, 0);

  const inner = state.numPeople === 2 ? renderBeam2(t) : renderBars(t);

  const missing = pool - vis;
  let statusLine = pool
    ? `pool de este finde: <b>${pool} pts</b> · objetivo ${(pool / state.numPeople).toFixed(1)} c/u`
    : 'sin tareas visibles';
  if (missing > 0 && pool > 0) statusLine += ` · faltan ${missing} pts por asignar`;

  return `
    <div class="balance-wrap">
      ${inner}
      <div class="balance-status">${statusLine}</div>
    </div>`;
}

// ─── Subrender: proposal card ──────────────────────────────────────────────────
function renderProposal() {
  if (!state.proposal) return '';
  const { assign, totals: propTotals } = state.proposal;
  const vt = visibleTasks();

  const persons = Array.from({ length: state.numPeople }, (_, i) => {
    const myTasks = vt.filter(t => assign[t.id] === i).map(t => t.name);
    return `
      <div class="proposal-person">
        <span class="pp-dot" style="background:${pColor(i)}"></span>
        <span class="pp-name">${state.names[i]}</span>
        <span class="pp-tasks">${myTasks.length ? myTasks.join(', ') : '—'}</span>
        <span class="pp-pts" style="color:${pColor(i)}">${propTotals[i]} pts</span>
      </div>`;
  }).join('');

  return `
    <div class="proposal-card">
      <div class="proposal-header">
        <div class="proposal-title">
          Propuesta del sistema
          <small>Revisá el reparto antes de aplicarlo.</small>
        </div>
      </div>
      <div class="proposal-persons">${persons}</div>
      <div class="proposal-actions">
        <button class="proposal-actions button btn-accept" id="acceptProposalBtn">✓ Aceptar propuesta</button>
        <button class="proposal-actions button btn-discard" id="discardProposalBtn">✗ Descartar</button>
      </div>
    </div>`;
}

// ─── Subrender: a single task card ────────────────────────────────────────────
function renderTaskCard(task) {
  const w = state.weights[task.id] ?? 0;
  // When a proposal is active, show proposal assignment; else current
  const sourceAssign = state.proposal ? state.proposal.assign : state.assign;
  const a = sourceAssign[task.id] ?? -1;

  const assignBtns = Array.from({ length: state.numPeople }, (_, i) => `
    <button
      class="assign-btn ${a === i ? `active-${i}` : ''}"
      data-task="${task.id}"
      data-val="${i}"
      ${state.proposal ? 'disabled' : ''}
    >${state.names[i]}</button>`).join('');

  return `
    <div class="task-card ${task.kind === 'completa' ? 'is-completa' : ''} ${state.proposal && a >= 0 ? 'proposed' : ''}">
      <div class="task-name">${task.name}</div>
      <div class="task-weight">${w} pt${w === 1 ? '' : 's'}</div>
      <div class="assign-group">${assignBtns}</div>
    </div>`;
}

// ─── Subrender: task zones ─────────────────────────────────────────────────────
function renderZones() {
  const vt         = visibleTasks();
  const adentro    = vt.filter(t => t.zone === 'adentro');
  const afuera     = vt.filter(t => t.zone === 'afuera');
  const sumAdentro = adentro.reduce((s, t) => s + (Number(state.weights[t.id]) || 0), 0);
  const sumAfuera  = afuera.reduce((s,  t) => s + (Number(state.weights[t.id]) || 0), 0);

  return `
    <div class="zone">
      <div class="zone-head">
        <span class="zone-tag adentro">Adentro</span>
        <span class="zone-sum">${sumAdentro} pts en juego</span>
      </div>
      ${adentro.map(renderTaskCard).join('')}
    </div>
    <div class="zone">
      <div class="zone-head">
        <span class="zone-tag afuera">Afuera</span>
        <span class="zone-sum">${sumAfuera} pts en juego</span>
      </div>
      ${afuera.map(renderTaskCard).join('')}
    </div>`;
}

// ─── Subrender: history ────────────────────────────────────────────────────────
function renderHistory() {
  const cum = cumulative();
  if (!state.history.length) {
    return `<div class="history">
      <div class="history-title">Historial</div>
      <p class="empty-hist">Todavía no guardaron ningún finde.</p>
    </div>`;
  }

  const cumItems = Array.from({ length: state.numPeople }, (_, i) => `
    <div class="cum-item">
      <span class="cum-name">${(state.history[0]?.names?.[i]) ?? state.names[i]}</span>
      <span class="cum-val" style="color:${pColor(i)}">${cum[i]}</span>
    </div>`).join('');

  const rows = state.history.map((h, idx) => {
    const scores = (h.totals || []).map((v, i) => `
      <div class="hist-score" style="color:${pColor(i)}">
        ${v}
        <span class="score-name">${(h.names?.[i]) ?? state.names[i]}</span>
      </div>`).join('');
    return `
      <div class="hist-row">
        <span class="hist-date">${h.date}</span>
        ${h.completa ? '<span class="hist-badge">completa</span>' : ''}
        <div class="hist-scores">${scores}</div>
        <button class="hist-delete" data-del="${idx}" title="Borrar entrada" aria-label="Borrar entrada del ${h.date}">✕</button>
      </div>`;
  }).join('');

  return `
    <div class="history">
      <div class="history-title">Historial</div>
      <div class="cumulative">${cumItems}</div>
      ${rows}
    </div>`;
}

// ─── Subrender: settings panel ────────────────────────────────────────────────
function renderSettings() {
  const namesRows = Array.from({ length: state.numPeople }, (_, i) => `
    <div class="name-setting-row">
      <span class="dot" style="background:${pColor(i)}"></span>
      <input type="text" class="settings-name-input" data-person-idx="${i}" value="${state.names[i]}" placeholder="${DEFAULT_NAMES[i]}" maxlength="16" aria-label="Nombre ${DEFAULT_NAMES[i]}">
    </div>`).join('');

  const weightRows = TASKS.map(t => `
    <div class="weight-row">
      <div class="wlabel">
        ${t.name}
        <small>${t.zone === 'adentro' ? 'adentro' : 'afuera'} · ${t.kind === 'completa' ? 'completa' : 'genérica'}</small>
      </div>
      <input type="number" min="0" step="1" data-weight="${t.id}" value="${state.weights[t.id] ?? 0}">
    </div>`).join('');

  return `
    <div class="settings-panel ${state.settingsOpen ? 'open' : ''}" id="settingsPanel">
      <h3>Configuración</h3>
      <div class="people-row">
        <div class="label">
          Cantidad de personas
          <small>Cómo se divide el trabajo (2–${MAX_PEOPLE})</small>
        </div>
        <div class="stepper">
          <button id="peopleDown" ${state.numPeople <= 2 ? 'disabled' : ''} aria-label="Reducir personas">−</button>
          <span class="count">${state.numPeople}</span>
          <button id="peopleUp"   ${state.numPeople >= MAX_PEOPLE ? 'disabled' : ''} aria-label="Aumentar personas">+</button>
        </div>
      </div>

      <span class="settings-section-subtitle">Nombres de los integrantes</span>
      <div class="names-settings-list">
        ${namesRows}
      </div>

      <span class="settings-section-subtitle">Pesos de tareas</span>
      ${weightRows}
    </div>`;
}

// ─── Main render ──────────────────────────────────────────────────────────────
function render() {
  const nameChips = Array.from({ length: state.numPeople }, (_, i) => `
    <div class="name-chip" data-chip-idx="${i}" title="Click para cambiar nombre">
      <span class="dot" style="background:${pColor(i)}"></span>
      <input id="name${i}" class="chip-name-input" data-idx="${i}" value="${state.names[i]}" maxlength="16" placeholder="${DEFAULT_NAMES[i]}" aria-label="Nombre integrante ${i + 1}">
      <svg class="chip-edit-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
      </svg>
    </div>`).join('');

  app.innerHTML = `
    <!-- ── Branding ── -->
    <header class="brand-header">
      <div class="brand-logo" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 2 L20 10 L20 20 L14 20 L14 14 L8 14 L8 20 L2 20 L2 10 Z"
            fill="none" stroke="white" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="brand-text">
        <div class="brand-name">Angeloff House</div>
        <div class="brand-sub">Reparto de tareas del hogar</div>
      </div>
    </header>

    <!-- ── Title ── -->
    <p class="page-eyebrow">Sistema de ponderación</p>
    <h1>La Balanza</h1>
    <p class="page-sub">Asignen las tareas del finde. El sistema calcula la distribución más pareja y recuerda el historial para compensar en las próximas veces.</p>

    <!-- ── Top bar ── -->
    <div class="topbar">
      <div class="names-wrap">${nameChips}</div>
      <button class="gear-btn ${state.settingsOpen ? 'active' : ''}" id="gearBtn" title="Ajustes" aria-label="Abrir ajustes" aria-expanded="${state.settingsOpen}">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" stroke-width="1.5"/>
          <path d="M13.5 8c0-.4-.04-.78-.1-1.15l1.44-1.12-1.5-2.6-1.7.7A5.96 5.96 0 0 0 9.6 3.1L9.3 1.3h-2.6l-.3 1.8a5.96 5.96 0 0 0-2.04.83l-1.7-.7-1.5 2.6 1.44 1.12A6.04 6.04 0 0 0 2.5 8c0 .4.04.78.1 1.15L1.16 10.27l1.5 2.6 1.7-.7c.62.35 1.3.61 2.04.83l.3 1.8h2.6l.3-1.8a5.96 5.96 0 0 0 2.04-.83l1.7.7 1.5-2.6-1.44-1.12c.06-.37.1-.75.1-1.15Z"
            stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- ── Settings panel ── -->
    ${renderSettings()}

    <!-- ── Completa toggle ── -->
    <div class="completa-toggle">
      <div class="ct-label">
        Finde de limpieza completa
        <small>Suma las tareas extra: muebles, terraza, cocina, pasto</small>
      </div>
      <label class="switch" aria-label="Activar limpieza completa">
        <input type="checkbox" id="completaSwitch" ${state.isCompleta ? 'checked' : ''}>
        <span class="track"></span>
        <span class="knob"></span>
      </label>
    </div>

    <!-- ── Balance visual ── -->
    ${renderBalance()}

    <!-- ── Proposal card ── -->
    ${renderProposal()}

    <!-- ── Task zones ── -->
    ${renderZones()}

    <!-- ── Actions ── -->
    <div class="actions">
      <button class="btn btn-primary" id="autoBtn" ${state.proposal ? 'disabled' : ''}>
        ✦ Repartir equilibrado
      </button>
      <button class="btn btn-ghost" id="saveBtn">
        Guardar finde
      </button>
    </div>
    <p class="status-hint">
      "Repartir equilibrado" tiene en cuenta el historial acumulado para compensar asimetrías previas.
      ${state.proposal ? '<br><em>Revisá la propuesta de arriba antes de continuar.</em>' : ''}
    </p>

    <!-- ── History ── -->
    ${renderHistory()}
  `;

  attachListeners();
}

// ─── Attach event listeners after each render ─────────────────────────────────
function attachListeners() {

  // Gear / settings toggle
  document.getElementById('gearBtn').onclick = () => {
    state.settingsOpen = !state.settingsOpen;
    render();
  };

  // Completa switch
  document.getElementById('completaSwitch').onchange = e => {
    state.isCompleta    = e.target.checked;
    state.proposal      = null;
    resetAssignments();
    render();
  };

  // Auto-balance → produce proposal
  const autoBtn = document.getElementById('autoBtn');
  if (autoBtn) autoBtn.onclick = () => {
    state.proposal = computeProposal();
    render();
  };

  // Accept proposal
  const acceptBtn = document.getElementById('acceptProposalBtn');
  if (acceptBtn) acceptBtn.onclick = () => {
    if (state.proposal) {
      Object.assign(state.assign, state.proposal.assign);
      state.proposal = null;
      render();
    }
  };

  // Discard proposal
  const discardBtn = document.getElementById('discardProposalBtn');
  if (discardBtn) discardBtn.onclick = () => {
    state.proposal = null;
    render();
  };

  // Save session
  document.getElementById('saveBtn').onclick = saveSession;

  // Synchronize name changes in real time across the entire UI
  const debouncedPersist = debounce(() => persist(), 400);

  function syncName(idx, newRawValue, isFinal = false) {
    const trimmed = newRawValue.trim();
    state.names[idx] = trimmed || (isFinal ? DEFAULT_NAMES[idx] : newRawValue);

    const displayName = trimmed || (isFinal ? DEFAULT_NAMES[idx] : DEFAULT_NAMES[idx]);

    // Keep top chip and settings inputs in sync
    const chipInp = document.getElementById(`name${idx}`);
    if (chipInp && chipInp !== document.activeElement) {
      chipInp.value = state.names[idx];
    }
    const setInp = document.querySelector(`.settings-name-input[data-person-idx="${idx}"]`);
    if (setInp && setInp !== document.activeElement) {
      setInp.value = state.names[idx];
    }

    if (isFinal) {
      if (chipInp && !chipInp.value.trim()) chipInp.value = DEFAULT_NAMES[idx];
      if (setInp && !setInp.value.trim()) setInp.value = DEFAULT_NAMES[idx];
    }

    // Immediately update all task assignment buttons in the page
    document.querySelectorAll(`.assign-btn[data-val="${idx}"]`).forEach(btn => {
      btn.textContent = displayName;
    });
    // Immediately update beam labels (2 people)
    const beamLabels = document.querySelectorAll('.beam-nums .side .lbl');
    if (beamLabels[idx]) beamLabels[idx].textContent = displayName;
    // Immediately update bar labels (3+ people)
    const barLabels = document.querySelectorAll('.bar-label');
    if (barLabels[idx]) barLabels[idx].textContent = displayName;
    // Immediately update proposal card names if open
    const propNames = document.querySelectorAll('.proposal-person .pp-name');
    if (propNames[idx]) propNames[idx].textContent = displayName;

    debouncedPersist();
    if (isFinal) {
      persist();
    }
  }

  // Click on chip pill focuses input
  app.querySelectorAll('.name-chip').forEach(chip => {
    chip.onclick = e => {
      const inp = chip.querySelector('input');
      if (inp && e.target !== inp) inp.focus();
    };
  });

  // Top chip name inputs
  Array.from({ length: state.numPeople }, (_, i) => {
    const inp = document.getElementById(`name${i}`);
    if (!inp) return;
    inp.oninput = e => syncName(i, e.target.value, false);
    inp.onkeydown = e => {
      if (e.key === 'Enter') inp.blur();
    };
    inp.onblur = () => syncName(i, inp.value, true);
  });

  // Settings panel name inputs
  app.querySelectorAll('.settings-name-input').forEach(inp => {
    const idx = Number(inp.getAttribute('data-person-idx'));
    inp.oninput = e => syncName(idx, e.target.value, false);
    inp.onkeydown = e => {
      if (e.key === 'Enter') inp.blur();
    };
    inp.onblur = () => syncName(idx, inp.value, true);
  });

  // People stepper
  const downBtn = document.getElementById('peopleDown');
  const upBtn   = document.getElementById('peopleUp');
  if (downBtn) downBtn.onclick = () => changePeople(-1);
  if (upBtn)   upBtn.onclick   = () => changePeople(+1);

  // Weight inputs
  app.querySelectorAll('[data-weight]').forEach(inp => {
    inp.onchange = e => {
      const id = e.target.getAttribute('data-weight');
      state.weights[id] = Math.max(0, Number(e.target.value) || 0);
      persist();
      render();
    };
  });

  // Assign buttons
  app.querySelectorAll('.assign-btn').forEach(btn => {
    btn.onclick = () => {
      const taskId = btn.getAttribute('data-task');
      const val    = Number(btn.getAttribute('data-val'));
      // Toggle off if already assigned to same person
      state.assign[taskId] = (state.assign[taskId] === val) ? -1 : val;
      render();
    };
  });

  // History delete buttons
  app.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.getAttribute('data-del'));
      state.history.splice(idx, 1);
      persist();
      render();
    };
  });
}

// ─── Change number of people ──────────────────────────────────────────────────
function changePeople(delta) {
  const next = Math.max(2, Math.min(MAX_PEOPLE, state.numPeople + delta));
  if (next === state.numPeople) return;

  state.numPeople = next;

  // Pad names array
  while (state.names.length < next) {
    state.names.push(DEFAULT_NAMES[state.names.length] ?? `Integrante ${state.names.length + 1}`);
  }

  // Invalidate assignments that point to now-removed persons
  Object.keys(state.assign).forEach(id => {
    if (state.assign[id] >= next) state.assign[id] = -1;
  });

  state.proposal = null;
  persist();
  render();
}

// ─── Save session to history ──────────────────────────────────────────────────
function saveSession() {
  const t = totals();
  const assigned = t.reduce((a, b) => a + b, 0);
  if (assigned === 0) return; // nothing assigned

  state.history.unshift({
    date:     new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }),
    completa: state.isCompleta,
    totals:   t,
    names:    [...state.names],
  });
  state.history = state.history.slice(0, 30);

  persist();
  resetAssignments();
  state.proposal = null;
  render();
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
load();
render();
