const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

// 1. Add noBottomBoard to variables
code = code.replace(
    "const baseType = document.getElementById('mod-base-type') ? document.getElementById('mod-base-type').value : 'normal';",
    "const baseType = document.getElementById('mod-base-type') ? document.getElementById('mod-base-type').value : 'normal';\n        const noBottomBoard = document.getElementById('mod-no-bottom') ? document.getElementById('mod-no-bottom').checked : false;"
);

// 2. Conditionally add Alt Tabla and Baza in Horizontal mode
code = code.replace(
    "// 1.5. Kapalı Baza Parçası",
    "// 1.5. Kapalı Baza Parçası\n        if (!noBottomBoard) {"
);
code = code.replace(
    "addPartRow({ name: \"Alt Tabla\", h: internalW, w: d, q: 1, rot: true, b: [false, true, false, false] });",
    "addPartRow({ name: \"Alt Tabla\", h: internalW, w: d, q: 1, rot: true, b: [false, true, false, false] });\n        }"
);

// 3. Update section-specific depths in loop
code = code.replace(
    "sections.forEach(sec => {\n            cumulativeH += sec.h || 0;\n            if (cumulativeH < sideH - 0.1) {\n                sabitRafCount++;\n            }\n        });\n        if (sabitRafCount > 0) {\n            addPartRow({ name: \"Sabit Raf (Ara Bölücü)\", h: internalW, w: d, q: sabitRafCount, rot: true, b: [false, true, false, false] });\n        }",
    "let cumulativeH = 0;\n        sections.forEach((sec, idx) => {\n            cumulativeH += sec.h || 0;\n            if (cumulativeH < sideH - 0.1) {\n                let secD = parseFloat(sec.customD) || d;\n                addPartRow({ name: `${idx+1}. Sabit Raf (Ara Bölücü)`, h: internalW, w: secD, q: 1, rot: true, b: [false, true, false, false] });\n            }\n        });"
);

// 4. Update inner elements with secD
code = code.replace(
    "sections.forEach((sec, index) => {\n            // Bölüm Net İç Boşluğu",
    "sections.forEach((sec, index) => {\n            let secD = parseFloat(sec.customD) || d;\n            // Bölüm Net İç Boşluğu"
);
code = code.replace(
    "addPartRow({ name: `${index+1}. Bölüm Orta Dikme`, h: netH, w: d, q: dikmeQty, rot: true, b: [false, true, false, false] });",
    "addPartRow({ name: `${index+1}. Bölüm Orta Dikme`, h: netH, w: secD, q: dikmeQty, rot: true, b: [false, true, false, false] });"
);

// Update shelf depth
code = code.replace(
    "addPartRow({ name: `${index+1}. Bölüm İç Raf`, h: colW, w: d - 15, q: col.shelfQty, rot: true, b: [false, true, false, false] });",
    "addPartRow({ name: `${index+1}. Bölüm İç Raf`, h: colW, w: secD - 15, q: col.shelfQty, rot: true, b: [false, true, false, false] });"
);

// Update drawer depths
code = code.replace(
    "const drawerD = d - 50;",
    "const drawerD = secD - 50;"
);

// Handle specific baseType for columns when noBottomBoard is true
let colBaseLogic = `
                // Yere Basan Sütun Mantığı (Masa Modu)
                if (noBottomBoard && col.baseType === 'yere_basan') {
                    // Bu sütun yere basıyorsa, kendi yanlarına ekstra boy eklememiz gerekebilir veya mini alt tabla
                    // Ancak halihazırda orta dikme "netH" olarak kesildi.
                    // Yere basan orta dikme hesaplamak için, eğer bu en alt katman (index === 0) ise:
                    if (index === 0) {
                         // Aslında en alt katmansa ve yere basan seçiliyse, o sütunun altına bir mini tabla koyalım:
                         addPartRow({ name: \`\${index+1}. Bölüm \${cIdx+1}. Sütun Mini Alt Tabla\`, h: colW, w: secD, q: 1, rot: true, b: [false, true, false, false] });
                         // Ve eğer ortadaysa (cIdx > 0), onun sol orta dikmesini yere kadar uzatabiliriz.
                         // Ancak şimdilik sadece mini alt tabla koyalım, "Asma" durumunda ise mini alt tabla + çekmece olur, yere basmaz.
                    }
                }
`;
code = code.replace(
    "let customShelves = [];",
    colBaseLogic + "\n                let customShelves = [];"
);

fs.writeFileSync('script.js', code);
