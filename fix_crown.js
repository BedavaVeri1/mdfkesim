const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

// Just replace everything from "// --- 3. ÜST TABLA (En üst kapatıcı) ---" to the end of the update3DModel function!
const startIdx = code.indexOf('// --- 3. ÜST TABLA (En üst kapatıcı) ---');
if (startIdx !== -1) {
    const endIdx = code.indexOf('    if (wireframeMode) {', startIdx);
    
    const newBlock = `    // --- 3. ÜST TABLA (En üst kapatıcı) ---
    let topSecD = d;
    if (splitSides && sections.length > 0) {
        topSecD = parseFloat(sections[sections.length - 1].customD) || d;
    }
    const topSecCenterZ = (topSecD - d) / -2;

    const topPanelY = h + baseH - (thick / 2);
    cabinetGroup.add(createPanel(w, thick, topSecD, 0, topPanelY, topSecCenterZ));

    // --- 4. TAÇ (İsteğe bağlı) ---
    const addCrown = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;
    if (addCrown) {
        const crownH = 80;
        const crownY = topPanelY + (thick / 2) + (crownH / 2);
        const crownZ = topSecCenterZ + (topSecD / 2) + (thick / 2) + 25; // Önden 2.5 cm çıkıntı
        cabinetGroup.add(createPanel(w, crownH, thick, 0, crownY, crownZ));
    }

`;
    code = code.substring(0, startIdx) + newBlock + code.substring(endIdx);
    fs.writeFileSync('3d-viewer.js', code);
}
