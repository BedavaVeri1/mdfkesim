const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

// Add noBottomBoard reading
code = code.replace(
    "const addCrown = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;",
    "const addCrown = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;\n    const noBottomBoard = document.getElementById('mod-no-bottom') ? document.getElementById('mod-no-bottom').checked : false;"
);

// Disable bottom board and base in 3d if noBottomBoard is true
code = code.replace(
    "// --- 2. ALT TABLA ---",
    "// --- 2. ALT TABLA ---\n    if (!noBottomBoard) {"
);
code = code.replace(
    "cabinetGroup.add(createPanel(innerW, thick, d, 0, bottomY, 0));",
    "cabinetGroup.add(createPanel(innerW, thick, d, 0, bottomY, 0));\n    }"
);

code = code.replace(
    "if (baseType === \"closed\" && baseH > 7) {",
    "if (!noBottomBoard && baseType === \"closed\" && baseH > 7) {"
);

// We need to extract customD in the sections mapping at the top:
code = code.replace(
    "h: parseFloat(card.querySelector('.sec-h').value) || 0,",
    "h: parseFloat(card.querySelector('.sec-h').value) || 0,\n            customD: card.querySelector('.sec-custom-d') ? card.querySelector('.sec-custom-d').value : \"\","
);
code = code.replace(
    "drawerStart: col.querySelector('.col-drawer-start') ? col.querySelector('.col-drawer-start').value : \"1\",",
    "drawerStart: col.querySelector('.col-drawer-start') ? col.querySelector('.col-drawer-start').value : \"1\",\n                    baseType: col.querySelector('.col-base-type') ? col.querySelector('.col-base-type').value : \"standart\","
);


// Replace `d` with `secD` for elements inside horizontal section loop
// Horizontal loop is after `} else { \n sections.forEach((sec, index) => {`
// Let's just do a regex replace for the section loop.
let parts = code.split("} else {\n        sections.forEach((sec, index) => {");
if (parts.length > 1) {
    let loopPart = parts[1];
    
    // Add secD declaration
    loopPart = "\n            let secD = parseFloat(sec.customD) || d;\n            const zOffset = (d - secD) / 2; // Arka sıfır hizası için Z kayması\n" + loopPart;

    // Replace createPanel calls to use secD and apply zOffset for back alignment
    // createPanel(w, h, d, x, y, z)
    
    // Orta Dikme
    loopPart = loopPart.replace(/cabinetGroup.add\(createPanel\(thick, netH, d, (.*?), (.*?), 0\)\);/g, "cabinetGroup.add(createPanel(thick, netH, secD, $1, $2, -zOffset));");
    
    // Sabit Raf
    loopPart = loopPart.replace(/cabinetGroup.add\(createPanel\(innerW, thick, d, 0, (.*?), 0\)\);/g, "cabinetGroup.add(createPanel(innerW, thick, secD, 0, $1, -zOffset));");

    // İç Raf
    loopPart = loopPart.replace(/cabinetGroup.add\(createPanel\(colW, thick, d - 15, (.*?), (.*?), 7\.5\)\);/g, "cabinetGroup.add(createPanel(colW, thick, secD - 15, $1, $2, -zOffset + 7.5));");

    // Çekmece Kutusu
    loopPart = loopPart.replace(/cabinetGroup.add\(createPanel\((.*?), 150, d - 50, (.*?), (.*?), 25\)\);/g, "cabinetGroup.add(createPanel($1, 150, secD - 50, $2, $3, -zOffset + 25));");
    
    // Kapak Z hizası
    loopPart = loopPart.replace(/const dZ = \(d \/ 2\) \+ \(thick \/ 2\) \+ 1;/g, "const dZ = (d / 2) + (thick / 2) + 1; // Kapaklar her zaman dış hizada kalır");

    // Base type for columns (Yere basan vs Asma)
    let miniBase = `
                // Yere Basan Sütun (Mini Alt Tabla ve Dikme Uzantısı)
                if (noBottomBoard && col.baseType === 'yere_basan') {
                    if (index === 0) { // Sadece en alt katsa yere değer
                        // Zemin tablası
                        const mBaseY = baseH + (thick / 2);
                        cabinetGroup.add(createPanel(colW, thick, secD, cX, mBaseY, -zOffset));
                    }
                }
`;
    loopPart = loopPart.replace("let customShelves = [];", miniBase + "\n                let customShelves = [];");

    parts[1] = loopPart;
    code = parts.join("} else {\n        sections.forEach((sec, index) => {");
}

fs.writeFileSync('3d-viewer.js', code);
