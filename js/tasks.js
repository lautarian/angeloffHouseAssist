// ─── Definición de tareas ────────────────────────────────────────────────────
export const TASKS = [
  { id: 'adentro_orden', name: 'Adentro de la casa + orden', zone: 'adentro', kind: 'generica'  },
  { id: 'baño',          name: 'El baño',                    zone: 'adentro', kind: 'generica'  },
  { id: 'muebles',       name: 'Los muebles (sin piezas)',   zone: 'adentro', kind: 'completa'  },
  { id: 'galeria',       name: 'La galería',                 zone: 'afuera',  kind: 'generica'  },
  { id: 'patio',         name: 'El patio',                   zone: 'afuera',  kind: 'generica'  },
  { id: 'terraza',       name: 'La terraza',                 zone: 'afuera',  kind: 'completa'  },
  { id: 'cocina',        name: 'La cocina',                  zone: 'afuera',  kind: 'completa'  },
  { id: 'pasto',         name: 'Cortar el pasto',            zone: 'afuera',  kind: 'completa'  },
];

export const DEFAULT_WEIGHTS = {
  adentro_orden: 6,
  baño:          4,
  muebles:       2,
  galeria:       4,
  patio:         2,
  terraza:       3,
  cocina:        2,
  pasto:         2,
};

// ─── Paleta de colores para hasta 5 personas ─────────────────────────────────
export const MAX_PEOPLE = 5;

export const PERSON_COLORS = [
  '#2D5A40', // 0 · verde bosque
  '#8B3A1E', // 1 · terracota
  '#2E4B8B', // 2 · azul indigo
  '#7B3F8B', // 3 · violeta
  '#8B6B1E', // 4 · dorado
];

export const PERSON_COLORS_SOFT = [
  '#DFF0E6',
  '#F5DDD5',
  '#D5E0F5',
  '#EDD5F5',
  '#F5EDD5',
];
