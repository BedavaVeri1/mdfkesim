const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

// 1. Üst Tabla Depth
// Find Üst Tabla block (around line 2038)
let searchTopPanel = `        // 2. ÜST TABLA (Gövde Genişliğinden Yanlar Çıkartılır)
        const innerW = w - (2 * thick);
        if (addCrown) {
            addPartRow({ name: "Üst Tabla", h: innerW, w: global_d, q: 1, rot: true, b: [false, true, true, true] });
        } else {
            addPartRow({ name: "Üst Tabla", h: innerW, w: global_d, q: 1, rot: true, b: [false, true, true, true] });
        }`;

let replaceTopPanel = `        // 2. ÜST TABLA (Gövde Genişliğinden Yanlar Çıkartılır)
        const innerW = w - (2 * thick);
        let topSecD = global_d;
        if (splitSides && sections.length > 0) {
            const lastSec = sections[sections.length - 1];
            topSecD = parseFloat(lastSec.querySelector('.sec-custom-d').value) || global_d;
        }
        
        if (addCrown) {
            addPartRow({ name: "Üst Tabla", h: innerW, w: topSecD, q: 1, rot: true, b: [false, true, true, true] });
        } else {
            addPartRow({ name: "Üst Tabla", h: innerW, w: topSecD, q: 1, rot: true, b: [false, true, true, true] });
        }`;
code = code.replace(searchTopPanel, replaceTopPanel);

// 2. Orta Dikmeler Depth
// It currently uses global_d. Around line 2215.
let searchMiddleDivider = `addPartRow({ name: \`\${index + 1}. Bölüm Orta Dikme\`, h: sec.h, w: global_d, q: sec.colsCount - 1, rot: true, b: [false, true, true, true] });`;
let replaceMiddleDivider = `addPartRow({ name: \`\${index + 1}. Bölüm Orta Dikme\`, h: sec.h, w: secD, q: sec.colsCount - 1, rot: true, b: [false, true, true, true] });`;
code = code.replace(searchMiddleDivider, replaceMiddleDivider);

let searchMiddleDivider2 = `addPartRow({ name: \`\${index + 1}. Bölüm Orta Dikme\`, h: netH, w: global_d, q: sec.colsCount - 1, rot: true, b: [false, true, true, true] });`;
let replaceMiddleDivider2 = `addPartRow({ name: \`\${index + 1}. Bölüm Orta Dikme\`, h: netH, w: secD, q: sec.colsCount - 1, rot: true, b: [false, true, true, true] });`;
code = code.replace(searchMiddleDivider2, replaceMiddleDivider2);

// 3. Sabit and Hareketli Raflar Depth
// They already use `secD - 15` in script.js! Let's check!
// Actually let's not touch shelves if they use secD - 15.

// 4. Side Groups (Akıllı Birleştirme)
// Remove the old splitSides logic from inside the section loop
let searchSplitSidesOld = `            // Eğer splitSides açıksa, bu bölümün KENDİ dış yanlarını (Sol/Sağ) ekle
            if (splitSides) {
                let sideH = index === 0 ? sec.h - (2 * thick) : sec.h - thick;
                if (noBottomBoard && index === 0) sideH = sec.h - thick;
                addPartRow({ name: \`\${index+1}. Bölüm Sol Yan Dikme\`, h: sideH, w: secD, q: 1, rot: true, b: [false, true, true, true] });
                addPartRow({ name: \`\${index+1}. Bölüm Sağ Yan Dikme\`, h: sideH, w: secD, q: 1, rot: true, b: [false, true, true, true] });
            }`;
code = code.replace(searchSplitSidesOld, "");

// Add the smart grouping before the section loop
let searchSmartGroups = `        // 3. BÖLÜMLERİ VE İÇERİKLERİNİ DÖN`;
let replaceSmartGroups = `        // 2.5 DIŞ YAN DİKMELERİ AKILLI GRUPLAMA (Sadece splitSides açıksa)
        if (splitSides) {
            let sideGroups = [];
            sections.forEach((secNode, i) => {
                let sD = parseFloat(secNode.querySelector('.sec-custom-d').value) || global_d;
                let sH = parseFloat(secNode.querySelector('.sec-h').value) || 0;
                let hVal = i === 0 ? sH - (2 * thick) : sH - thick;
                if (noBottomBoard && i === 0) hVal = sH - thick;
                
                if (sideGroups.length === 0) {
                    sideGroups.push({ d: sD, h: hVal, startIdx: i, endIdx: i });
                } else {
                    let lastGrp = sideGroups[sideGroups.length - 1];
                    if (lastGrp.d === sD) {
                        lastGrp.h += sH;
                        lastGrp.endIdx = i;
                    } else {
                        sideGroups.push({ d: sD, h: hVal, startIdx: i, endIdx: i });
                    }
                }
            });
            sideGroups.forEach(grp => {
                let label = grp.startIdx === grp.endIdx ? \`\${grp.startIdx+1}. Bölüm\` : \`\${grp.startIdx+1}-\${grp.endIdx+1}. Bölümler\`;
                addPartRow({ name: \`\${label} Sol Yan Dikme\`, h: grp.h, w: grp.d, q: 1, rot: true, b: [false, true, true, true] });
                addPartRow({ name: \`\${label} Sağ Yan Dikme\`, h: grp.h, w: grp.d, q: 1, rot: true, b: [false, true, true, true] });
            });
        }

        // 3. BÖLÜMLERİ VE İÇERİKLERİNİ DÖN`;
code = code.replace(searchSmartGroups, replaceSmartGroups);

fs.writeFileSync('script.js', code);
