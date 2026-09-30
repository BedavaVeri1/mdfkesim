const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

// 1. Z Kaydırma (Offset)
// Around line 380, the section loop starts.
// We need to calculate secZOffset for each section, and use it for all interior components.
// Z=0 is the center of the global cabinet.
// Global back is at -d/2.
// Section back should also be at -d/2.
// So secCenterZ - secD/2 = -d/2 => secCenterZ = (secD - d) / 2.
// We'll define secCenterZ inside the section loop.

let searchSecLoop = `        const secD = parseFloat(sec.querySelector('.sec-custom-d')?.value) || d;`;
let replaceSecLoop = `        const secD = parseFloat(sec.querySelector('.sec-custom-d')?.value) || d;
        const secCenterZ = (secD - d) / 2;`;
code = code.replace(searchSecLoop, replaceSecLoop);

// 2. Akıllı Gruplama Çizimi
// We remove the old splitSides drawing inside the section loop.
let searchOldSplit = `        // Split Sides (Eğer açıksa bu katman için Sol ve Sağ yan dikmeleri çiz)
        if (splitSides) {
            let secSideH = index === 0 ? sec.h - (2 * thick) : sec.h - thick;
            let secSideY = currentOuterY + (secSideH / 2);
            if (noBottomBoard && index === 0) {
                secSideH = sec.h - thick;
                secSideY = currentOuterY + (secSideH / 2);
            }
            cabinetGroup.add(createPanel(thick, secSideH, secD, leftSideX, secSideY, -zOffset));
            cabinetGroup.add(createPanel(thick, secSideH, secD, rightSideX, secSideY, -zOffset));
        }`;
code = code.replace(searchOldSplit, "");

// Add smart grouping outside the loop (before loop)
let searchBeforeLoop = `    // --- 2. BÖLÜMLERİ VE İÇERİKLERİNİ DÖN ---`;
let replaceBeforeLoop = `    // --- DIŞ DİKMELER (AKILLI GRUPLAMA) ---
    if (splitSides) {
        let sideGroups = [];
        let tempOuterY = noBottomBoard ? 0 : thick;
        sections.forEach((secNode, i) => {
            let sD = parseFloat(secNode.querySelector('.sec-custom-d')?.value) || d;
            let sH = parseFloat(secNode.querySelector('.sec-h')?.value) || 0;
            let hVal = i === 0 ? sH - (2 * thick) : sH - thick;
            if (noBottomBoard && i === 0) hVal = sH - thick;
            
            if (sideGroups.length === 0) {
                sideGroups.push({ d: sD, h: hVal, y: tempOuterY + (hVal/2) });
            } else {
                let lastGrp = sideGroups[sideGroups.length - 1];
                if (lastGrp.d === sD) {
                    // Yükseklikleri topla ve Y merkezini güncelle
                    let oldTotalH = lastGrp.h;
                    lastGrp.h += sH;
                    lastGrp.y = tempOuterY - oldTotalH + (lastGrp.h / 2); // Bu hesap biraz karmaşık, daha basit:
                    // Y = önceki başlangıç noktası + yeni h/2
                    lastGrp.y = (lastGrp.y - oldTotalH/2) + lastGrp.h/2;
                } else {
                    sideGroups.push({ d: sD, h: hVal, y: tempOuterY + (hVal/2) });
                }
            }
            tempOuterY += sH; // sonraki katmanın başlangıcı
        });

        sideGroups.forEach(grp => {
            let grpCenterZ = (grp.d - d) / 2;
            cabinetGroup.add(createPanel(thick, grp.h, grp.d, leftSideX, grp.y, grpCenterZ));
            cabinetGroup.add(createPanel(thick, grp.h, grp.d, rightSideX, grp.y, grpCenterZ));
        });
    }

    // --- 2. BÖLÜMLERİ VE İÇERİKLERİNİ DÖN ---`;
code = code.replace(searchBeforeLoop, replaceBeforeLoop);


// 3. İç organların Z ekseni (secCenterZ)
// We need to replace `-zOffset` with `secCenterZ` for:
// - Bölüm Üst Tablası (veya Sabit Ara Raf) -> It's at -zOffset currently? Wait, let's check what Z is used for topY.
code = code.replace(/createPanel\(([^,]+),\s*([^,]+),\s*secD,\s*([^,]+),\s*topY,\s*-zOffset/g, "createPanel($1, $2, secD, $3, topY, secCenterZ");

// Orta dikmeler (Dividers) -> They are created with secD
// createPanel(thick, divH, secD, currentInnerX + (thick / 2), divY, -zOffset)
code = code.replace(/createPanel\(thick,\s*divH,\s*secD,\s*currentInnerX \+ \(thick \/ 2\),\s*divY,\s*-zOffset\)/g, "createPanel(thick, divH, secD, currentInnerX + (thick / 2), divY, secCenterZ)");

// Mini Alt Tabla
// createPanel(colW, thick, secD, cX, currentInnerY + (thick / 2), -zOffset)
code = code.replace(/createPanel\(colW,\s*thick,\s*secD,\s*cX,\s*currentInnerY \+ \(thick \/ 2\),\s*-zOffset\)/g, "createPanel(colW, thick, secD, cX, currentInnerY + (thick / 2), secCenterZ)");

// Sabit Raflar (Shelves)
// cabinetGroup.add(createPanel(colW, thick, secD - 15, cX, shelfCenters[sIdx], -zOffset + 7.5));
// Z offset should be: secCenterZ + 7.5
code = code.replace(/createPanel\(colW,\s*thick,\s*secD - 15,\s*cX,\s*shelfCenters\[sIdx\],\s*-zOffset \+ 7\.5\)/g, "createPanel(colW, thick, secD - 15, cX, shelfCenters[sIdx], secCenterZ + 7.5)");

// Çekmece Kutuları
// They use boxDepth and sideZ etc. Wait, look at drawer Z calculation.
let searchDrawerZ = `                            const klapaInnerZ = -zOffset + (d / 2) - thick; // Klapanın arka yüzeyi
                            const sideZ = klapaInnerZ - (boxDepth / 2);`;
let replaceDrawerZ = `                            const klapaInnerZ = secCenterZ + (secD / 2) - thick; // Klapanın arka yüzeyi
                            const sideZ = klapaInnerZ - (boxDepth / 2);`;
code = code.replace(searchDrawerZ, replaceDrawerZ);

// Kapaklar (Doors)
// const doorZ = (d / 2) + 2; (or similar)
// Let's see how door Z is calculated.
let searchDoorZ = `                    // Kapak Z ekseni (Önde)
                    const doorZ = (d / 2) + 2;`;
let replaceDoorZ = `                    // Kapak Z ekseni (Önde)
                    const doorZ = secCenterZ + (secD / 2) + 2;`;
code = code.replace(searchDoorZ, replaceDoorZ);

// 4. Taç ve Genel Üst Tabla (Global Top Panel and Crown)
// At the end of the script:
let searchCrown = `    // --- 3. ÜST TABLA (En üst kapatıcı) ---
    const topPanelY = h + baseH - (thick / 2);
    cabinetGroup.add(createPanel(w, thick, d, 0, topPanelY, 0));

    // --- 4. TAÇ (İsteğe bağlı) ---
    const addCrown = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;
    if (addCrown) {
        const crownH = 80;
        const crownY = topPanelY + (thick / 2) + (crownH / 2);
        const crownZ = (d / 2) + (thick / 2) + 25; // Önden 2.5 cm çıkıntı
        cabinetGroup.add(createPanel(w, crownH, thick, 0, crownY, crownZ));
    }`;

let replaceCrown = `    // --- 3. ÜST TABLA (En üst kapatıcı) ---
    let topSecD = d;
    if (splitSides && sections.length > 0) {
        topSecD = parseFloat(sections[sections.length - 1].querySelector('.sec-custom-d')?.value) || d;
    }
    const topSecCenterZ = (topSecD - d) / 2;

    const topPanelY = h + baseH - (thick / 2);
    cabinetGroup.add(createPanel(w, thick, topSecD, 0, topPanelY, topSecCenterZ));

    // --- 4. TAÇ (İsteğe bağlı) ---
    const addCrown = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;
    if (addCrown) {
        const crownH = 80;
        const crownY = topPanelY + (thick / 2) + (crownH / 2);
        const crownZ = topSecCenterZ + (topSecD / 2) + (thick / 2) + 25; // Önden 2.5 cm çıkıntı
        cabinetGroup.add(createPanel(w, crownH, thick, 0, crownY, crownZ));
    }`;
code = code.replace(searchCrown, replaceCrown);

fs.writeFileSync('3d-viewer.js', code);
