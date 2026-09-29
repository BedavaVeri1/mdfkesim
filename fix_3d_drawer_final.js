const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

// Replace doorTotalH in the remaining height calc
code = code.replace(
    "doorH = doorStartLocalY + doorTotalH - topGap - currentY;",
    "doorH = doorStartLocalY + colDoorTotalH - topGap - currentY;"
);

// Replace sectionDoorAreaStart for door drawing loop
code = code.replace(
    "let doorCurrentY = sectionDoorAreaStart + bottomGap;",
    "let doorCurrentY = colSectionDoorAreaStart + bottomGap;"
);

fs.writeFileSync('3d-viewer.js', code);
