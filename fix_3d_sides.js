const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

let search3d = `    const addCrown = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;`;
let replace3d = `    const addCrown = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;
    const splitSides = document.getElementById('mod-split-sides') ? document.getElementById('mod-split-sides').checked : false;`;
code = code.replace(search3d, replace3d);

let search3d2 = `    // --- 1. SOL VE SAĞ DİKMELER (En dış çerçeve) ---
    const sideH = h; 
    const sideY = baseH + (sideH / 2);
    const leftSideX = -(w / 2) + (thick / 2);
    const rightSideX = (w / 2) - (thick / 2);
    const sideZ = 0; 

    cabinetGroup.add(createPanel(thick, sideH, d, leftSideX, sideY, sideZ));
    cabinetGroup.add(createPanel(thick, sideH, d, rightSideX, sideY, sideZ));`;
let replace3d2 = `    // --- 1. SOL VE SAĞ DİKMELER (En dış çerçeve) ---
    const sideH = h; 
    const sideY = baseH + (sideH / 2);
    const leftSideX = -(w / 2) + (thick / 2);
    const rightSideX = (w / 2) - (thick / 2);
    const sideZ = 0; 

    if (!splitSides) {
        cabinetGroup.add(createPanel(thick, sideH, d, leftSideX, sideY, sideZ));
        cabinetGroup.add(createPanel(thick, sideH, d, rightSideX, sideY, sideZ));
    }`;
code = code.replace(search3d2, replace3d2);

let search3d3 = `        // --- Bölüm Üst Tablası (veya Sabit Ara Raf) ---
        const topY = currentOuterY + sec.h - (thick / 2);`;
let replace3d3 = `        // Split Sides (Eğer açıksa bu katman için Sol ve Sağ yan dikmeleri çiz)
        if (splitSides) {
            let secSideH = index === 0 ? sec.h - (2 * thick) : sec.h - thick;
            let secSideY = currentOuterY + (secSideH / 2);
            if (noBottomBoard && index === 0) {
                secSideH = sec.h - thick;
                secSideY = currentOuterY + (secSideH / 2);
            }
            cabinetGroup.add(createPanel(thick, secSideH, secD, leftSideX, secSideY, -zOffset));
            cabinetGroup.add(createPanel(thick, secSideH, secD, rightSideX, secSideY, -zOffset));
        }

        // --- Bölüm Üst Tablası (veya Sabit Ara Raf) ---
        const topY = currentOuterY + sec.h - (thick / 2);`;
code = code.replace(search3d3, replace3d3);

fs.writeFileSync('3d-viewer.js', code);
