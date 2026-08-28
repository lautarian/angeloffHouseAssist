# La Balanza — Angeloff House

Sistema de reparto equitativo de tareas del hogar. Asigná tareas a cada persona, calculá el balance de puntos, y guardá el historial para compensar automáticamente en los próximos findes.

## 🏠 Features

- **Asignación visual**: asigná cada tarea a una persona con un click
- **La Balanza**: visualización SVG (2 personas) o barras (3+) que muestra el balance en tiempo real
- **Modo propuesta**: el sistema calcula la distribución óptima y te la muestra antes de aplicarla
- **Historial acumulado**: recuerda todos los findes y compensa automáticamente las asimetrías pasadas
- **Limpieza completa**: toggle para agregar las tareas extra (muebles, terraza, cocina, pasto)
- **N personas**: configurable de 2 a 5 personas desde el panel de ajustes
- **Pesos editables**: ajustá el peso de cada tarea desde ⚙
- **Persistencia**: todo se guarda en `localStorage` del browser

## 📂 Estructura

```
├── index.html       ← entrada principal
├── css/
│   └── main.css     ← todos los estilos
├── js/
│   ├── tasks.js     ← definición de tareas y pesos default
│   ├── state.js     ← estado global + localStorage
│   ├── balance.js   ← algoritmo de balance óptimo
│   └── app.js       ← render + event listeners
└── README.md
```

## 🚀 Deploy en GitHub Pages

1. Asegurate de que el repo tenga el archivo `index.html` en la raíz (o en `/docs`)
2. En el repo en GitHub: **Settings → Pages → Source: Deploy from branch → main / root**
3. GitHub Pages servirá el sitio en `https://<tu-usuario>.github.io/<nombre-repo>/`

> [!NOTE]
> No requiere ningún paso de build. Es HTML/CSS/JS puro con ES modules nativos.

## 🔧 Desarrollo local

Abrí directamente `index.html` en Chrome/Firefox/Edge. Los ES modules requieren un servidor HTTP para funcionar (no `file://`). Opción rápida:

```bash
# con Python
python -m http.server 8080

# con Node
npx serve .
```

Luego abrí `http://localhost:8080`.

## 📊 Algoritmo de balance

El botón **"Repartir equilibrado"** usa fuerza bruta (O(N^T)) para encontrar la distribución que minimiza la varianza del **acumulado histórico + puntos de este finde**. Esto garantiza que a lo largo del tiempo todos los hermanos terminen con sumas similares, incluso cuando el pool de puntos de un finde no divide exactamente.

Para N=2 personas y T=8 tareas: 2⁸ = 256 combinaciones.  
Para N=5 personas y T=8 tareas: 5⁸ = 390,625 combinaciones (sub-milisegundo).
