const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

// The original injection failed, so splitSides is not defined AT ALL in 3d-viewer right now.
// But wait, let's check if it exists first!
let hasSplit = code.includes('const splitSides = document.getElementById');

// Add it to the top
let searchTop = `    const noBottomBoard = document.getElementById("mod-no-bottom") ? document.getElementById("mod-no-bottom").checked : false;`;
let replaceTop = `    const noBottomBoard = document.getElementById("mod-no-bottom") ? document.getElementById("mod-no-bottom").checked : false;
    const splitSides = document.getElementById('mod-split-sides') ? document.getElementById('mod-split-sides').checked : false;`;

if (!hasSplit) {
    code = code.replace(searchTop, replaceTop);
} else {
    // If it exists, remove it from wherever it is and put it at the top
    code = code.replace(/    const splitSides = document.getElementById\('mod-split-sides'\) \? document.getElementById\('mod-split-sides'\).checked : false;\n/g, "");
    code = code.replace(searchTop, replaceTop);
}


// Fix the global sides removal
let searchGlobal = `    // --- 1. YAN DİKMELER ---
    const leftSideX = -(w / 2) + (thick / 2);
    const rightSideX = (w / 2) - (thick / 2);
    const sideZ = 0; 

    cabinetGroup.add(createPanel(thick, sideH, d, leftSideX, sideY, sideZ));
    cabinetGroup.add(createPanel(thick, sideH, d, rightSideX, sideY, sideZ));`;

let replaceGlobal = `    // --- 1. YAN DİKMELER ---
    const leftSideX = -(w / 2) + (thick / 2);
    const rightSideX = (w / 2) - (thick / 2);
    const sideZ = 0; 

    if (!splitSides) {
        cabinetGroup.add(createPanel(thick, sideH, d, leftSideX, sideY, sideZ));
        cabinetGroup.add(createPanel(thick, sideH, d, rightSideX, sideY, sideZ));
    }`;
code = code.replace(searchGlobal, replaceGlobal);

fs.writeFileSync('3d-viewer.js', code);
