const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

// Get noBottomBoard in 3d viewer
code = code.replace(
    "const addCrown = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;",
    "const addCrown = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;\n    const noBottomBoard = document.getElementById('mod-no-bottom') ? document.getElementById('mod-no-bottom').checked : false;"
);

// Skip bottom board rendering
code = code.replace(
    "// Alt Tabla\n    const bottomBoard = createPanel(w, thick, d);",
    "// Alt Tabla\n    let bottomBoard = null;\n    if (!noBottomBoard) {\n        bottomBoard = createPanel(w, thick, d);\n    }"
);
code = code.replace(
    "bottomBoard.position.set(w / 2, baseH + thick / 2, -d / 2);\n    group.add(bottomBoard);",
    "if (bottomBoard) {\n        bottomBoard.position.set(w / 2, baseH + thick / 2, -d / 2);\n        group.add(bottomBoard);\n    }"
);

// Update section depth extraction in 3d-viewer
code = code.replace(
    "const colCount = parseInt(card.querySelector('.sec-cols-count').value) || 1;",
    "const colCount = parseInt(card.querySelector('.sec-cols-count').value) || 1;\n        const secD = parseFloat(card.querySelector('.sec-custom-d')?.value) || d;"
);

// Update Fixed Shelf Depth
code = code.replace(
    "const fixedShelf = createPanel(internalW, thick, d);",
    "const fixedShelf = createPanel(internalW, thick, secD);"
);
code = code.replace(
    "fixedShelf.position.set(w / 2, currentY + thick / 2, -d / 2);",
    "fixedShelf.position.set(w / 2, currentY + thick / 2, -secD / 2);"
);

// Update column inner components
code = code.replace(
    "// 2. Sütunlara göre iç düzeni oluştur",
    "// 2. Sütunlara göre iç düzeni oluştur\n        const innerNetH = index === 0 ? secH - (2 * thick) : secH - thick;"
);

code = code.replace(
    "const divider = createPanel(thick, innerNetH, d);",
    "const divider = createPanel(thick, innerNetH, secD);"
);
code = code.replace(
    "divider.position.set(dividerX + thick / 2, dividerY, -d / 2);",
    "divider.position.set(dividerX + thick / 2, dividerY, -secD / 2);"
);

// Update shelves
code = code.replace(
    "const shelfD = d - 15;",
    "const shelfD = secD - 15;"
);

// Update drawers
code = code.replace(
    "const drawerDepth = d - 50;",
    "const drawerDepth = secD - 50;"
);

// Handle column baseType
code = code.replace(
    "const colGap = colData.gap !== undefined ? colData.gap : 15;",
    "const colGap = colData.gap !== undefined ? colData.gap : 15;\n                const colBaseType = colData.baseType || 'standart';"
);

// Add mini base for floor standing columns
let miniBaseLogic = `
                if (noBottomBoard && colBaseType === 'yere_basan' && index === 0) {
                    const miniBase = createPanel(colW, thick, secD);
                    miniBase.position.set(currentX + colW / 2, baseH + thick / 2, -secD / 2);
                    // Ana grup eklentisi
                    group.add(miniBase);
                }
`;
code = code.replace(
    "let customShelves = [];",
    miniBaseLogic + "\n                let customShelves = [];"
);


fs.writeFileSync('3d-viewer.js', code);
