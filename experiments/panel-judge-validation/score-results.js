// Lee results/grading.csv (tu evaluación ciega) + results/answer-key.json (revelado)
// y calcula si el Panel+Juez gana de forma clara sobre la cascada actual (sección 7.3 del documento).

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'results');

function parseCsv(text) {
  const lines = text.trim().split('\n').slice(1); // salta cabecera
  return lines.filter(Boolean).map(line => {
    const [id, pref, ...rest] = line.split(',');
    return { id: id.trim(), pref: (pref || '').trim().toLowerCase() };
  });
}

function main() {
  const gradingPath = path.join(OUT_DIR, 'grading.csv');
  const keyPath = path.join(OUT_DIR, 'answer-key.json');
  if (!fs.existsSync(gradingPath) || !fs.existsSync(keyPath)) {
    console.error('Faltan results/grading.csv o results/answer-key.json. Corre primero run-experiment.js y rellena la evaluación.');
    process.exit(1);
  }

  const grading = parseCsv(fs.readFileSync(gradingPath, 'utf8'));
  const answerKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  const keyById = {};
  answerKey.forEach(k => { keyById[k.id] = k; });

  let panelWins = 0, cascadeWins = 0, ties = 0, graded = 0;
  let judgeAgreements = 0, judgeComparable = 0;

  for (const row of grading) {
    if (!row.pref) continue; // fila sin rellenar todavía
    const key = keyById[row.id];
    if (!key) continue;
    graded++;

    let userMethod;
    if (row.pref === 'a') userMethod = key.A;
    else if (row.pref === 'b') userMethod = key.B;
    else { ties++; continue; }

    if (userMethod === 'panel_juez') panelWins++;
    else if (userMethod === 'cascada') cascadeWins++;

    // Calibración: ¿el usuario coincidió con el ganador que el Juez interno del panel eligió?
    if (key.panelWinnerProvider) {
      judgeComparable++;
      if (userMethod === 'panel_juez') judgeAgreements++;
    }
  }

  console.log('=== Resultado del experimento (sección 7.3) ===');
  console.log('Consultas evaluadas: ' + graded + ' de ' + grading.length);
  console.log('Panel+Juez preferido: ' + panelWins);
  console.log('Cascada actual preferida: ' + cascadeWins);
  console.log('Empates: ' + ties);
  if (graded > 0) {
    console.log('Panel+Juez gana en el ' + ((panelWins / graded) * 100).toFixed(1) + '% de las consultas evaluadas.');
  }
  console.log('');
  console.log('Criterio de la sección 7.3: si el Panel+Juez gana de forma clara y consistente, hay evidencia');
  console.log('para invertir en construirlo a fondo. Si la diferencia es marginal, no compensa.');
}

main();
