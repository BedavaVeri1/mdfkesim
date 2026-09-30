const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

let searchTopPanel = `    // HER ZAMAN EN ÜST TABLAYI ÇİZ (Kutu her zaman kapalı olmalı)
    let sidePanelBottom = (baseType === "closed") ? 7 : baseH;
    const topY = sidePanelBottom + sideH - (thick / 2);
    cabinetGroup.add(createPanel(innerW, thick, d, 0, topY, 0));`;

let replaceTopPanel = `    // HER ZAMAN EN ÜST TABLAYI ÇİZ (Kutu her zaman kapalı olmalı)
    let sidePanelBottom = (baseType === "closed") ? 7 : baseH;
    const topY = sidePanelBottom + sideH - (thick / 2);
    
    let topSecD = d;
    if (splitSides && sections && sections.length > 0) {
        topSecD = parseFloat(sections[sections.length - 1].customD) || d;
    }
    const topSecCenterZ = (topSecD - d) / -2;
    cabinetGroup.add(createPanel(innerW, thick, topSecD, 0, topY, topSecCenterZ));`;

code = code.replace(searchTopPanel, replaceTopPanel);
fs.writeFileSync('3d-viewer.js', code);
