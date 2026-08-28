import { TASKS, DEFAULT_WEIGHTS, MAX_PEOPLE } from './tasks.js';

// ─── Claves de localStorage ───────────────────────────────────────────────────
const KEY_CONFIG  = 'angeloff_config_v1';
const KEY_HISTORY = 'angeloff_history_v1';

// ─── Nombres por defecto para hasta 5 personas ────────────────────────────────
export const DEFAULT_NAMES = ['Integrante 1', 'Integrante 2', 'Integrante 3', 'Integrante 4', 'Integrante 5'];

// ─── Estado global ────────────────────────────────────────────────────────────
export const state = {
  weights:      { ...DEFAULT_WEIGHTS },
  names:        ['Integrante 1', 'Integrante 2'],
  numPeople:    2,
  isCompleta:   false,
  assign:       _makeDefaultAssign(),   // { taskId → personIdx (-1 = sin asignar) }
  proposal:     null,                   // null | { assign, totals[] } — modo propuesta
  history:      [],                     // [{ date, completa, totals[], names[] }]
  settingsOpen: false,
};

function _makeDefaultAssign() {
  const a = {};
  TASKS.forEach(t => (a[t.id] = -1));
  return a;
}

// ─── Tareas visibles según toggle de completa ────────────────────────────────
export function visibleTasks() {
  return TASKS.filter(t => t.kind === 'generica' || (state.isCompleta && t.kind === 'completa'));
}

// ─── Totales de puntos para un mapa de asignación dado ───────────────────────
export function totals(assignMap) {
  const assign = assignMap ?? state.assign;
  const t = new Array(state.numPeople).fill(0);
  visibleTasks().forEach(task => {
    const a = assign[task.id];
    if (a >= 0 && a < state.numPeople) t[a] += Number(state.weights[task.id]) || 0;
  });
  return t;
}

// ─── Pool total de puntos en juego ────────────────────────────────────────────
export function totalPool() {
  return visibleTasks().reduce((s, t) => s + (Number(state.weights[t.id]) || 0), 0);
}

// ─── Acumulado histórico por persona ─────────────────────────────────────────
export function cumulative() {
  const n = state.numPeople;
  const c = new Array(n).fill(0);
  state.history.forEach(h => {
    (h.totals || []).forEach((v, i) => { if (i < n) c[i] += v; });
  });
  return c;
}

// ─── Resetear asignaciones ────────────────────────────────────────────────────
export function resetAssignments() {
  TASKS.forEach(t => (state.assign[t.id] = -1));
}

// ─── Persistencia ─────────────────────────────────────────────────────────────
export function persist() {
  try {
    localStorage.setItem(KEY_CONFIG, JSON.stringify({
      weights:   state.weights,
      names:     state.names,
      numPeople: state.numPeople,
    }));
    localStorage.setItem(KEY_HISTORY, JSON.stringify(state.history));
  } catch (e) {
    console.error('[Angeloff] Error al guardar en localStorage:', e);
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY_CONFIG);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.weights)   state.weights   = { ...DEFAULT_WEIGHTS, ...p.weights };
      if (p.names)     state.names     = p.names;
      if (p.numPeople) state.numPeople = Math.max(2, Math.min(MAX_PEOPLE, Number(p.numPeople)));
    }
  } catch (e) { /* primera vez */ }
  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    if (raw) state.history = JSON.parse(raw);
  } catch (e) { /* primera vez */ }
}
