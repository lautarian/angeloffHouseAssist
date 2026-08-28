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

// ─── Paleta de colores sutil estilo boquense (azul y oro refinados) ──────────
export const MAX_PEOPLE = 5;

export const PERSON_COLORS = [
  '#133863', // 0 · Azul Xeneize profundo
  '#B88008', // 1 · Oro cálido refinado
  '#1E4C7C', // 2 · Azul marino acero
  '#9E6E0C', // 3 · Ámbar dorado
  '#2C5D88', // 4 · Azul noche intermedio
];

export const PERSON_COLORS_SOFT = [
  '#E3EDF8', // 0 · azul suave
  '#FBF2DC', // 1 · oro suave
  '#E5EFF9', // 2 · azul acero suave
  '#F8EED8', // 3 · ámbar suave
  '#E7F0FA', // 4 · azul noche suave
];

