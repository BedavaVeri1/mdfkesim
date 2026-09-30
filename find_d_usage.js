const fs = require('fs');
const code = fs.readFileSync('3d-viewer.js', 'utf8');
const lines = code.split('\n');

const startIndex = lines.findIndex(l => l.includes('sections.forEach((sec, index) => {'));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.includes('}); // sections döngüsü bitişi')); // roughly

for (let i = startIndex; i < (endIndex === -1 ? lines.length : endIndex); i++) {
    if (lines[i].includes(', d') || lines[i].includes('(d / 2)') || lines[i].includes('d - 15')) {
        console.log(`${i+1}: ${lines[i].trim()}`);
    }
}
