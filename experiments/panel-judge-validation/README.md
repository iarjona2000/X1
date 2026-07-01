# Experimento de validación — Panel+Juez vs Cascada actual (Finanzas)

Implementa la sección 7.3 de `X1_Ensemble_Juicio_Automatico.txt`: antes de construir el sistema completo de Panel+Juez, comprobar con 20-30 consultas reales si de verdad da mejores resultados que la cascada actual de un modelo fijo. Esto NO forma parte de la extensión — es una herramienta de línea de comandos aparte, en Node.js, para correr el experimento y no se carga en `manifest.json`.

## 1. Configura las claves (nunca las pegues en el chat ni en ningún fichero de este repo)

Este script lee las claves de variables de entorno, no de un fichero. Dos formas:

**Opción A — variables de entorno en la sesión de terminal (se olvidan al cerrar la terminal):**

PowerShell:
```
$env:GROQ_KEY = "tu-clave"
$env:NVIDIA_KEY = "tu-clave-nueva-rotada"
$env:GEMINI_KEY = "tu-clave"
```

**Opción B — fichero `.env.local` en esta carpeta (asegúrate de que está en `.gitignore` antes de crearlo, para no subirlo nunca a git):**
```
GROQ_KEY=tu-clave
NVIDIA_KEY=tu-clave-nueva-rotada
GEMINI_KEY=tu-clave
CEREBRAS_KEY=tu-clave
MISTRAL_KEY=tu-clave
OPENROUTER_KEY=tu-clave
```
y cárgalo antes de correr el script (PowerShell): `Get-Content .env.local | ForEach-Object { if($_ -match '^([^=]+)=(.*)$'){ [Environment]::SetEnvironmentVariable($matches[1],$matches[2]) } }`

No hace falta tener las 6 claves — el experimento usa las que tengas configuradas y omite el resto.

## 2. Añade tus 20-30 consultas reales

Edita `queries.finanzas.json` y sustituye el placeholder de ejemplo por tus consultas reales de Finanzas, una por objeto:
```json
[
  { "id": "fin_001", "query": "..." },
  { "id": "fin_002", "query": "..." }
]
```

## 3. Corre el experimento

```
node run-experiment.js
```

Esto llama, para cada consulta, a los dos brazos:
- **Cascada actual**: el mismo orden que usa hoy `ROUTE_MATRIX.reasoning` en `service-worker.js` (groq → nvidia → gemini → openrouter), se queda con la primera respuesta válida.
- **Panel+Juez simplificado**: llama en paralelo a groq, nvidia, gemini y cerebras (los que tengas configurados), y un juez rotativo (mistral / openrouter, alternando, y nunca el mismo modelo que ya respondió como candidato) elige la mejor con el rubric de `rubric.finanzas.json`.

Genera en `results/`:
- `blind-eval-sheet.md` — las respuestas anonimizadas como "Respuesta A" / "Respuesta B" (el orden se aleatoriza por consulta, así que A no es siempre el mismo método)
- `grading.csv` — para que anotes tu preferencia
- `answer-key.json` — la clave de qué método era A/B — **no lo abras hasta terminar de evaluar**, o dejará de ser ciego

## 4. Evalúa a ciegas

Abre `results/blind-eval-sheet.md`, lee cada consulta y sus dos respuestas SIN mirar `answer-key.json`, y rellena `results/grading.csv` con `A`, `B`, o `empate` en la columna `preferido(A/B/empate)`.

## 5. Saca el resultado

```
node score-results.js
```

Te da el % de veces que preferiste el Panel+Juez sobre la cascada actual. Si gana de forma clara y consistente (documento, sección 7.3), hay evidencia para construir el sistema completo. Si la diferencia es marginal, no compensa la complejidad y el coste de cuota adicional.
