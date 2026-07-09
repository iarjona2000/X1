## INSTRUCCIÓN OBLIGATORIA

Vas a generar código UI (React + Tailwind CSS) que debe ser **visualmente idéntico** al sistema de diseño Geist de Vercel. No puedes inventar estilos ni usar valores aproximados. Cada regla que sigue es obligatoria.

---

## 1. TIPOGRAFÍA (OBLIGATORIO)

**1.1 FUENTES**
- Importa e instala `geist-sans` y `geist-mono` desde `@vercel/geist-font`
- Aplica `font-sans` a todo el cuerpo del documento
- Aplica `font-mono` exclusivamente a bloques de código, números tabulares y elementos que requieran ancho fijo

**1.2 CLASES TAILWIND OBLIGATORIAS (usa SOLO estas)**

Para Headings:
- `text-heading-72` — SOLO para héroes de marketing
- `text-heading-64`
- `text-heading-56`
- `text-heading-48`
- `text-heading-40`
- `text-heading-32` — para subtítulos de marketing, párrafos destacados y títulos de dashboard
- `text-heading-24`
- `text-heading-20`
- `text-heading-16`
- `text-heading-14`

Para Buttons (SOLO dentro de elementos `<button>`):
- `text-button-16` — para botón más grande
- `text-button-14` — para botón por defecto
- `text-button-12` — SOLO para botones diminutos dentro de inputs

Para Labels (texto de UNA línea):
- `text-label-20` — para texto de marketing
- `text-label-18`
- `text-label-16` — para títulos que necesitan diferenciarse de texto regular
- `text-label-14` — EL MÁS COMÚN. Úsalo en menús y texto estándar de una línea
- `text-label-14-mono` — versión monoespaciada para textos >14px
- `text-label-13` — para texto secundario junto a otros labels. Aplica `tabular-nums` si son números
- `text-label-13-mono` — para emparejar con Label 14
- `text-label-12` — para texto terciario (comentarios, "Show More"). Aplica `uppercase` si necesitas mayúsculas
- `text-label-12-mono`

Para Copy (texto de MÚLTIPLES líneas):
- `text-copy-24` — SOLO para áreas hero de marketing
- `text-copy-20` — SOLO para áreas hero de marketing
- `text-copy-18` — para marketing y citas grandes
- `text-copy-16` — para modales y vistas grandes
- `text-copy-14` — EL MÁS COMÚN. Úsalo para párrafos estándar
- `text-copy-13` — para texto secundario en espacios reducidos
- `text-copy-13-mono` — SOLO para menciones de código en línea

**1.3 MODIFICADORES OBLIGATORIOS**
- Para enfatizar texto dentro de cualquier clase anterior, anida un elemento `<strong>` dentro del texto. NO uses `font-bold` directamente.
- Para versiones "subtle", aplica `text-secondary` o `text-muted-foreground`.

---

## 2. COLORES (OBLIGATORIO)

**2.1 PALETA OBLIGATORIA**

Fondos:
- `bg-white` — para áreas de contenido principal
- `bg-neutral-50` — para fondos alternativos suaves
- `bg-neutral-900` — para barras laterales, footers y áreas oscuras
- `bg-black` — para fondos de héroe y secciones premium

Texto:
- `text-foreground` — para texto principal (se adapta automáticamente a modo claro/oscuro)
- `text-secondary` — para texto secundario
- `text-muted-foreground` — para texto muy sutil (placeholders, deshabilitados)
- `text-white` — SOLO sobre fondos oscuros (`bg-neutral-900` o `bg-black`)
- `text-black` — SOLO sobre fondos claros (`bg-white` o `bg-neutral-50`)

Acento (interactivo):
- `bg-blue-600` — para botones primarios y elementos de acción principal
- `hover:bg-blue-700` — para hover de botones primarios
- `text-blue-600` — para enlaces y elementos interactivos no-botón
- `hover:text-blue-700` — para hover de enlaces

Bordes:
- `border border-neutral-200` — SOLO sobre fondos claros
- `border border-neutral-800` — SOLO sobre fondos oscuros
- `border border-neutral-300` — para inputs y campos de formulario
- `focus:ring-2 focus:ring-blue-600 focus:border-transparent` — para enfoque de inputs

Alertas/Estados:
- `bg-red-500/10 text-red-600` — para errores
- `bg-yellow-500/10 text-yellow-600` — para advertencias
- `bg-green-500/10 text-green-600` — para confirmaciones

---

## 3. GRID Y LAYOUT (OBLIGATORIO)

**3.1 ESTRUCTURA DE PÁGINA**
- Usa sistema de 12 columnas (`grid grid-cols-12`)
- Gap estándar: `gap-4` (16px) o `gap-8` (32px)
- Contenedor principal: `container mx-auto px-4` o `max-w-7xl mx-auto px-4`
- Padding vertical de secciones: `py-16` o `py-24`

**3.2 ESPACIADO OBLIGATORIO**
- Usa escala de espaciado de Tailwind: `p-1` (4px), `p-2` (8px), `p-4` (16px), `p-6` (24px), `p-8` (32px), `p-12` (48px)
- Entre elementos: usa `gap-2` (8px), `gap-4` (16px), `gap-6` (24px)
- Margen entre secciones: `my-8` (32px) o `my-16` (64px)

**3.3 RADIOS Y ESQUINAS**
- `rounded-md` — para inputs y elementos pequeños
- `rounded-lg` — para tarjetas, modales, contenedores
- `rounded-xl` — para elementos premium (héroes, banners)
- `rounded-full` — para avatares y badges circulares

**3.4 SOMBRAS**
- `shadow-sm` — para tarjetas y elementos elevados (sutil)
- `shadow-md` — para menús desplegables y modales
- `shadow-lg` — para elementos flotantes (tooltips, popovers)
- NO uses `shadow-xl` o sombras más pesadas a menos que sea estrictamente necesario

---

## 4. COMPONENTES (OBLIGATORIO)

**4.1 BOTÓN**
Estructura exacta:
```jsx
<button className="inline-flex items-center justify-center rounded-md px-4 py-2 text-button-14 font-medium transition-colors">
  {/* contenido */}
</button>
```

Variantes obligatorias:

Primario: `bg-blue-600 text-white hover:bg-blue-700`

Secundario: `bg-neutral-100 text-black hover:bg-neutral-200 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700`

Outline: `border border-neutral-300 bg-transparent hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800`

Ghost: `bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800`

Tamaños:

Grande: `px-6 py-3 text-button-16`

Mediano: `px-4 py-2 text-button-14` (por defecto)

Pequeño: `px-3 py-1.5 text-button-12`

**4.2 INPUT**
Estructura exacta:
```jsx
<input className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-copy-14 placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:border-neutral-700" />
```

**4.3 TEXTAREA**
```jsx
<textarea className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-copy-14 placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:border-neutral-700" rows={4} />
```

**4.4 SELECT**
```jsx
<select className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-copy-14 focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:border-neutral-700">
  <option>Opción 1</option>
</select>
```

**4.5 CARD**
```jsx
<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
  {/* contenido */}
</div>
```

**4.6 BADGE**
```jsx
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-label-12 font-medium bg-neutral-100 text-black dark:bg-neutral-800 dark:text-white">
  Badge
</span>
```

**4.7 DIALOG/MODAL**
```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
  <div className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
    {/* contenido */}
  </div>
</div>
```

**4.8 DROPDOWN MENU**
```jsx
<div className="w-48 rounded-md border border-neutral-200 bg-white shadow-md dark:border-neutral-800 dark:bg-neutral-900">
  <button className="flex w-full items-center px-4 py-2 text-label-14 hover:bg-neutral-100 dark:hover:bg-neutral-800">
    Item 1
  </button>
  <button className="flex w-full items-center px-4 py-2 text-label-14 hover:bg-neutral-100 dark:hover:bg-neutral-800">
    Item 2
  </button>
</div>
```

---

## 5. ICONOS (OBLIGATORIO)

**5.1 LIBRERÍA OBLIGATORIA**

Instala y usa `@vercel/geist-icons`

Importa así: `import { IconName } from '@vercel/geist-icons'`

**5.2 TAMAÑOS OBLIGATORIOS**

Pequeño: `size={16}` — junto a Label 12 o 13

Mediano: `size={20}` — junto a Label 14 o Copy 14 (MÁS COMÚN)

Grande: `size={24}` — junto a Heading 16 o Label 16

**5.3 ALINEACIÓN CON TEXTO**

Usa `flex items-center gap-2` para alinear icono + texto

El icono debe estar centrado verticalmente con el texto

**5.4 COLORES**

`stroke-foreground` — para iconos en texto principal

`stroke-secondary` — para iconos secundarios

`stroke-muted-foreground` — para iconos sutiles

`stroke-white` — sobre fondos oscuros

`stroke-blue-600` — para iconos de acento

---

## 6. BRAND ASSETS (OBLIGATORIO)

**6.1 LOGO**

Usa texto "Vektor" con `font-sans font-bold tracking-tight`

Tamaño: `text-2xl` o `text-3xl`

Color: `text-white` sobre fondo oscuro, `text-black` sobre fondo claro

**6.2 FAVICON**

Usa un SVG simple con un triángulo

**6.3 NOMBRE DE LA PLATAFORMA**

Si es "Vektor", usa `font-mono font-medium`

---

## 7. ESTILOS GLOBALES (OBLIGATORIO)

**7.1 CSS GLOBAL**
Crea un archivo globals.css con:
```css
@import 'geist-sans';
@import 'geist-mono';

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-white text-foreground;
  }
}
```

**7.2 MODO OSCURO**

Usa `dark:` para todas las clases

Activa modo oscuro con `dark` en elemento `<html>`

Transición: `transition-colors duration-200`

---

## 8. RESPONSIVE (OBLIGATORIO)

**8.1 BREAKPOINTS OFICIALES**

- `sm:` — 640px (móvil horizontal)
- `md:` — 768px (tablet)
- `lg:` — 1024px (escritorio pequeño)
- `xl:` — 1280px (escritorio)
- `2xl:` — 1536px (escritorio grande)

**8.2 REGLAS DE TIPOGRAFÍA RESPONSIVE**

Headings grandes (`text-heading-72`, `64`, `56`): reduce a `text-heading-40` o `text-heading-32` en `lg:`

Copy: mantén tamaño base pero ajusta padding en móvil

Layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

**8.3 REGLAS DE ESPACIADO RESPONSIVE**

Padding: `px-4 md:px-6 lg:px-8`

Gap: `gap-4 md:gap-6 lg:gap-8`

Margen vertical: `py-12 md:py-16 lg:py-24`

---

## 9. ANIMACIONES (OBLIGATORIO)

**9.1 TRANSICIONES**

Hover: `transition-colors duration-200`

Apertura de modales: `animate-in fade-in-0 zoom-in-95 duration-200`

Cierre de modales: `animate-out fade-out-0 zoom-out-95 duration-200`

**9.2 HOVER**

Botones: `hover:bg-neutral-100 dark:hover:bg-neutral-800` (ghost/outline)

Enlaces: `hover:underline` o `hover:text-blue-600`

Tarjetas: `hover:border-neutral-400 dark:hover:border-neutral-600`

---

## INSTRUCCIÓN FINAL (OBLIGATORIA)

Usa TODAS las reglas anteriores sin excepción. Cada elemento de la UI debe cumplir con la especificación exacta. No uses valores no listados. No inventes clases. No uses estilos aproximados.
