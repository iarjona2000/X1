const fs = require('fs');
const path = 'C:\\Users\\tomas\\Desktop\\cbos-ext\\content\\voice-listener.js';

let code = fs.readFileSync(path, 'utf8');

// Fix broken .join('\n') that became multiline
code = code.replace(/\]\.join\('\r?\n'\);?/g, "].join('\\n');");

fs.writeFileSync(path, code);
console.log('Fixed join syntax');
