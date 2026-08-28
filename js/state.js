import { DEFAULT_TASKS, DEFAULT_WEIGHTS, MAX_PEOPLE } from './tasks.js';

// ─── Claves de localStorage ───────────────────────────────────────────────────
const KEY_CONFIG  = 'angeloff_config_v1';
const KEY_HISTORY = 'angeloff_history_v1';

// ─── Nombres por defecto para hasta 5 personas ────────────────────────────────
export const DEFAULT_NAMES = ['Integrante 1', 'Integrante 2', 'Integrante 3', 'Integrante 4', 'Integrante 5'];

// ─── Estado global ────────────────────────────────────────────────────────────
export const state = {
  tasks:        [...DEFAULT_TASKS],
  weights:      { ...DEFAULT_WEIGHTS },
  names:        ['Integrante 1', 'Integrante 2'],
  numPeople:    2,
  isCompleta:   false,
  assign:       {},                     // { taskId → personIdx (-1 = sin asignar) }
  silenced:     {},                     // { taskId → true (omitida para este finde) }
  proposal:     null,                   // null | { assign, totals[] } — modo propuesta
  history:      [],                     // [{ date, completa, totals[], names[] }]
  settingsOpen: false,
};

function _initDefaultAssign() {
  state.tasks.forEach(t => {
    if (state.assign[t.id] === undefined) {
      state.assign[t.id] = -1;
    }
  });
}
_initDefaultAssign();

// ─── Tareas visibles según toggle de completa ────────────────────────────────
export function visibleTasks() {
  return state.tasks.filter(t => t.kind === 'generica' || (state.isCompleta && t.kind === 'completa'));
}

// ─── Tareas activas este finde (visibles y no silenciadas/tachadas) ───────────
export function activeTasks() {
  return visibleTasks().filter(t => !state.silenced[t.id]);
}

// ─── Tareas silenciadas este finde ───────────────────────────────────────────
export function silencedTasks() {
  return visibleTasks().filter(t => Boolean(state.silenced[t.id]));
}

// ─── Alternar silenciar / tachar tarea como excepción de este finde ───────────
export function toggleSilenceTask(id) {
  if (state.silenced[id]) {
    delete state.silenced[id];
  } else {
    state.silenced[id] = true;
  }
  state.proposal = null;
  persist();
}

// ─── Agregar nueva tarea (personalizada) ──────────────────────────────────────
export function addTask({ name, zone, kind, weight }) {
  const cleanName = (name || '').trim();
  if (!cleanName) return null;

  const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const newTask = {
    id,
    name: cleanName,
    zone: zone === 'afuera' ? 'afuera' : 'adentro',
    kind: kind === 'completa' ? 'completa' : 'generica',
    isCustom: true,
  };

  state.tasks.push(newTask);
  state.weights[id] = Math.max(1, Number(weight) || 2);
  state.assign[id]  = -1;
  persist();
  return newTask;
}

// ─── Eliminar tarea ───────────────────────────────────────────────────────────
export function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  delete state.weights[id];
  delete state.assign[id];
  if (state.proposal && state.proposal.assign) {
    delete state.proposal.assign[id];
  }
  persist();
}

// ─── Totales de puntos para un mapa de asignación dado ───────────────────────
export function totals(assignMap) {
  const assign = assignMap ?? state.assign;
  const t = new Array(state.numPeople).fill(0);
  // Solo suman las tareas activas (no omitidas este finde)
  activeTasks().forEach(task => {
    const a = assign[task.id];
    if (a >= 0 && a < state.numPeople) t[a] += Number(state.weights[task.id]) || 0;
  });
  return t;
}

// ─── Pool total de puntos activos en juego ───────────────────────────────────
export function totalPool() {
  return activeTasks().reduce((s, t) => s + (Number(state.weights[t.id]) || 0), 0);
}

// ─── Puntos omitidos / silenciados este finde ─────────────────────────────────
export function silencedPool() {
  return silencedTasks().reduce((s, t) => s + (Number(state.weights[t.id]) || 0), 0);
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
  state.tasks.forEach(t => (state.assign[t.id] = -1));
}

// ─── Persistencia ─────────────────────────────────────────────────────────────
export function persist() {
  try {
    localStorage.setItem(KEY_CONFIG, JSON.stringify({
      weights:   state.weights,
      names:     state.names,
      numPeople: state.numPeople,
      tasks:     state.tasks,
      silenced:  state.silenced,
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
      if (p.tasks && Array.isArray(p.tasks) && p.tasks.length > 0) {
        state.tasks = p.tasks;
      }
      if (p.weights)   state.weights   = { ...DEFAULT_WEIGHTS, ...p.weights };
      if (p.names)     state.names     = p.names;
      if (p.numPeople) state.numPeople = Math.max(2, Math.min(MAX_PEOPLE, Number(p.numPeople)));
      if (p.silenced && typeof p.silenced === 'object') state.silenced = p.silenced;
    }
  } catch (e) { /* primera vez */ }

  // Asegurar que todas las tareas tengan peso y asignación válida
  state.tasks.forEach(t => {
    if (state.weights[t.id] === undefined) {
      state.weights[t.id] = DEFAULT_WEIGHTS[t.id] ?? 2;
    }
    if (state.assign[t.id] === undefined) {
      state.assign[t.id] = -1;
    }
  });

  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    if (raw) state.history = JSON.parse(raw);
  } catch (e) { /* primera vez */ }
}
