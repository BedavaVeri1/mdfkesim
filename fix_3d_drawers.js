const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

// Fix drawer/door heights in 3D
let search = "const usableH = doorTotalH - bottomGap - topGap - innerGapsH;";
let replace = `
            // Sütun ayağı (baseH) varsa kapak/çekmece alanını daralt
            let colDoorTotalH = doorTotalH;
            let colSectionDoorAreaStart = sectionDoorAreaStart;
            if (noBottomBoard && index === 0 && (col.baseType === 'yere_basan_ayak' || col.baseType === 'yere_basan_baza')) {
                let cbh = parseFloat(col.baseH) || 0;
                colDoorTotalH -= cbh;
                colSectionDoorAreaStart += cbh;
            }
            const usableH = colDoorTotalH - bottomGap - topGap - innerGapsH;
`;
code = code.replace(search, replace);

// Replace doorTotalH with colDoorTotalH and sectionDoorAreaStart with colSectionDoorAreaStart below it
// "const doorH = usableH / col.stackQty;"
// "let currentDoorY = sectionDoorAreaStart + bottomGap + (doorH / 2);"
code = code.replace(
    "let currentDoorY = sectionDoorAreaStart + bottomGap + (doorH / 2);",
    "let currentDoorY = colSectionDoorAreaStart + bottomGap + (doorH / 2);"
);

// We must also fix script.js so the cutting list for drawers is correct!
fs.writeFileSync('3d-viewer.js', code);
