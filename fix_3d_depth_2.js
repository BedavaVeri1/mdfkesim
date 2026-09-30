const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

// 1. Z Kaydırma (Offset)
let searchSecLoop = `        let secD = parseFloat(sec.customD) || d;
        const zOffset = (d - secD) / 2; // Arka sıfır hizası için Z kayması`;
let replaceSecLoop = `        let secD = parseFloat(sec.customD) || d;
        const zOffset = (d - secD) / 2; // Arka sıfır hizası için Z kayması
        const secCenterZ = -zOffset; // YENİ: Parçaları geriye yaslamak için`;
code = code.replace(searchSecLoop, replaceSecLoop);

// 2. Akıllı Gruplama Çizimi
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

// Add smart grouping before the section loop
let searchBeforeLoop = `    // --- 2. BÖLÜMLERİ VE İÇERİKLERİNİ DÖN ---`;
let replaceBeforeLoop = `    // --- DIŞ DİKMELER (AKILLI GRUPLAMA) ---
    if (splitSides) {
        let sideGroups = [];
        let tempOuterY = noBottomBoard ? 0 : thick;
        sections.forEach((sec, i) => {
            let sD = parseFloat(sec.customD) || d;
            let sH = sec.h || 0;
            let hVal = i === 0 ? sH - (2 * thick) : sH - thick;
            if (noBottomBoard && i === 0) hVal = sH - thick;
            
            if (sideGroups.length === 0) {
                sideGroups.push({ d: sD, h: hVal, y: tempOuterY + (hVal/2) });
            } else {
                let lastGrp = sideGroups[sideGroups.length - 1];
                if (lastGrp.d === sD) {
                    let oldTotalH = lastGrp.h;
                    lastGrp.h += sH;
                    lastGrp.y = (lastGrp.y - oldTotalH/2) + lastGrp.h/2;
                } else {
                    sideGroups.push({ d: sD, h: hVal, y: tempOuterY + (hVal/2) });
                }
            }
            tempOuterY += sH;
        });

        sideGroups.forEach(grp => {
            let grpCenterZ = (grp.d - d) / -2;
            cabinetGroup.add(createPanel(thick, grp.h, grp.d, leftSideX, grp.y, grpCenterZ));
            cabinetGroup.add(createPanel(thick, grp.h, grp.d, rightSideX, grp.y, grpCenterZ));
        });
    }

    // --- 2. BÖLÜMLERİ VE İÇERİKLERİNİ DÖN ---`;
code = code.replace(searchBeforeLoop, replaceBeforeLoop);

// 3. İç organların Z ekseni (secCenterZ)
// Bölüm Üst Tablası (veya Sabit Ara Raf)
code = code.replace(/createPanel\(innerW, thick, secD, 0, topY, -zOffset\);/g, "createPanel(innerW, thick, secD, 0, topY, secCenterZ);");

// Orta dikmeler (Dividers)
code = code.replace(/createPanel\(thick, divH, secD, currentInnerX \+ \(thick \/ 2\), divY, -zOffset\)/g, "createPanel(thick, divH, secD, currentInnerX + (thick / 2), divY, secCenterZ)");

// Mini Alt Tabla
code = code.replace(/createPanel\(colW, thick, secD, cX, currentInnerY \+ \(thick \/ 2\), -zOffset\)/g, "createPanel(colW, thick, secD, cX, currentInnerY + (thick / 2), secCenterZ)");

// Sabit Raflar (Shelves)
code = code.replace(/createPanel\(colW, thick, secD - 15, cX, shelfCenters\[sIdx\], -zOffset \+ 7\.5\)/g, "createPanel(colW, thick, secD - 15, cX, shelfCenters[sIdx], secCenterZ + 7.5)");

// Çekmece Kutuları
let searchDrawerZ = `                            const klapaInnerZ = -zOffset + (d / 2) - thick; // Klapanın arka yüzeyi
                            const sideZ = klapaInnerZ - (boxDepth / 2);`;
let replaceDrawerZ = `                            const klapaInnerZ = secCenterZ + (secD / 2) - thick; // Klapanın arka yüzeyi
                            const sideZ = klapaInnerZ - (boxDepth / 2);`;
code = code.replace(searchDrawerZ, replaceDrawerZ);

// Kapaklar (Doors)
let searchDoorZ = `                    // Kapak Z ekseni (Önde)
                    const doorZ = (d / 2) + 2;`;
let replaceDoorZ = `                    // Kapak Z ekseni (Önde)
                    const doorZ = secCenterZ + (secD / 2) + 2;`;
code = code.replace(searchDoorZ, replaceDoorZ);

// 4. Taç ve Genel Üst Tabla
let searchCrown = `    // --- 3. ÜST TABLA (En üst kapatıcı) ---
    const topPanelY = h + baseH - (thick / 2);
    cabinetGroup.add(createPanel(w, thick, d, 0, topPanelY, 0));

    // --- 4. TAÇ (İsteğe bağlı) ---
    if (addCrown) {
        const crownH = 80;
        const crownY = topPanelY + (thick / 2) + (crownH / 2);
        const crownZ = (d / 2) + (thick / 2) + 25; // Önden 2.5 cm çıkıntı
        cabinetGroup.add(createPanel(w, crownH, thick, 0, crownY, crownZ));
    }`;

let replaceCrown = `    // --- 3. ÜST TABLA (En üst kapatıcı) ---
    let topSecD = d;
    if (splitSides && sections.length > 0) {
        topSecD = parseFloat(sections[sections.length - 1].customD) || d;
    }
    const topSecCenterZ = (topSecD - d) / -2;

    const topPanelY = h + baseH - (thick / 2);
    cabinetGroup.add(createPanel(w, thick, topSecD, 0, topPanelY, topSecCenterZ));

    // --- 4. TAÇ (İsteğe bağlı) ---
    if (addCrown) {
        const crownH = 80;
        const crownY = topPanelY + (thick / 2) + (crownH / 2);
        const crownZ = topSecCenterZ + (topSecD / 2) + (thick / 2) + 25; // Önden 2.5 cm çıkıntı
        cabinetGroup.add(createPanel(w, crownH, thick, 0, crownY, crownZ));
    }`;
code = code.replace(searchCrown, replaceCrown);

fs.writeFileSync('3d-viewer.js', code);
