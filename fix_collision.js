const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

// In 3d-viewer.js
code = code.replace(
    "colDoorTotalH -= cbh;\n                colSectionDoorAreaStart += cbh;",
    "colDoorTotalH -= (cbh + thick);\n                colSectionDoorAreaStart += (cbh + thick);"
);
fs.writeFileSync('3d-viewer.js', code);

// In script.js
let code2 = fs.readFileSync('script.js', 'utf8');
code2 = code2.replace(
    "colDoorTotalH -= cbh;",
    "colDoorTotalH -= (cbh + thick);"
);
fs.writeFileSync('script.js', code2);
