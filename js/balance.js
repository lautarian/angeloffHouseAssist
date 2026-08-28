import { state, visibleTasks, cumulative, totals } from './state.js';

/**
 * Calcula la distribución óptima de tareas entre N personas.
 * Enumera todas las combinaciones posibles (N^T) y elige la que
 * minimiza la varianza del acumulado histórico + puntos de este finde.
 *
 * Complejidad: O(N^T) — para N=5, T=8: 390,625 → aceptable en runtime.
 *
 * @returns {{ assign: Object, totals: number[] } | null}
 */
export function computeProposal() {
  const tasks = visibleTasks();
  const n     = state.numPeople;
  const T     = tasks.length;
  if (T === 0) return null;

  const cum     = cumulative();
  const weights = tasks.map(t => Number(state.weights[t.id]) || 0);

  let best      = null;
  let bestScore = Infinity;

  const totalCombinations = Math.pow(n, T);

  for (let mask = 0; mask < totalCombinations; mask++) {
    const pts = new Array(n).fill(0);
    let m = mask;
    for (let i = 0; i < T; i++) {
      pts[m % n] += weights[i];
      m = Math.floor(m / n);
    }

    // Objetivo: minimizar varianza del acumulado + puntos de este finde
    const combined = pts.map((p, i) => p + cum[i]);
    const mean     = combined.reduce((a, b) => a + b, 0) / n;
    const score    = combined.reduce((s, v) => s + (v - mean) ** 2, 0);

    if (score < bestScore) {
      bestScore = score;
      best      = mask;
    }
  }

  // Construir mapa de asignación desde el mejor mask
  const assignMap = {};
  let m = best;
  tasks.forEach((t, i) => {
    assignMap[t.id] = m % n;
    m = Math.floor(m / n);
  });

  return {
    assign: assignMap,
    totals: totals(assignMap),
  };
}
