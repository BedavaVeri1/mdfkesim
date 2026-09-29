const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

// In 3d-viewer.js
code = code.replace(
    "let minGap = Math.min(leftGap, rightGap);",
    "let minGap = Math.max(leftGap, rightGap); // Asma (0) olan tarafı yoksay, ayağı olan tarafa (100) uydur."
);

fs.writeFileSync('3d-viewer.js', code);

// In script.js
let code2 = fs.readFileSync('script.js', 'utf8');
code2 = code2.replace(
    "let minGap = Math.min(leftGap, rightGap);",
    "let minGap = Math.max(leftGap, rightGap); // Asma (0) olan tarafı yoksay, ayağı olan tarafa (100) uydur."
);
fs.writeFileSync('script.js', code2);
