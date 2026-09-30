const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

// 1. Üst Tabla Depth
code = code.replace(/        if \(addCrown\) \{\n            addPartRow\(\{ name: "Üst Tabla", h: innerW, w: global_d, q: 1, rot: true, b: \[false, true, true, true\] \}\);\n        \} else \{\n            addPartRow\(\{ name: "Üst Tabla", h: innerW, w: global_d, q: 1, rot: true, b: \[false, true, true, true\] \}\);\n        \}/, 
`        let topSecD = global_d;
        if (splitSides && sections.length > 0) {
            const lastSec = sections[sections.length - 1];
            topSecD = parseFloat(lastSec.querySelector('.sec-custom-d').value) || global_d;
        }
        
        if (addCrown) {
            addPartRow({ name: "Üst Tabla", h: innerW, w: topSecD, q: 1, rot: true, b: [false, true, true, true] });
        } else {
            addPartRow({ name: "Üst Tabla", h: innerW, w: topSecD, q: 1, rot: true, b: [false, true, true, true] });
        }`);

// 2. Orta Dikmeler Depth
code = code.replace(/addPartRow\(\{ name: \`\$\{index \+ 1\}\. Bölüm Orta Dikme\`, h: sec.h, w: global_d, q: sec.colsCount - 1, rot: true, b: \[false, true, true, true\] \}\);/g, 
"addPartRow({ name: `${index + 1}. Bölüm Orta Dikme`, h: sec.h, w: secD, q: sec.colsCount - 1, rot: true, b: [false, true, true, true] });");

code = code.replace(/addPartRow\(\{ name: \`\$\{index \+ 1\}\. Bölüm Orta Dikme\`, h: netH, w: global_d, q: sec.colsCount - 1, rot: true, b: \[false, true, true, true\] \}\);/g, 
"addPartRow({ name: `${index + 1}. Bölüm Orta Dikme`, h: netH, w: secD, q: sec.colsCount - 1, rot: true, b: [false, true, true, true] });");

// 4. Akıllı Gruplama
let searchSplitSidesOld = `            if (splitSides) {
                let sideH = index === 0 ? sec.h - (2 * thick) : sec.h - thick;
                if (noBottomBoard && index === 0) sideH = sec.h - thick;
                addPartRow({ name: \`\${index+1}. Bölüm Sol Yan Dikme\`, h: sideH, w: secD, q: 1, rot: true, b: [false, true, true, true] });
                addPartRow({ name: \`\${index+1}. Bölüm Sağ Yan Dikme\`, h: sideH, w: secD, q: 1, rot: true, b: [false, true, true, true] });
            }`;
code = code.replace(searchSplitSidesOld, "");

let searchSmartGroups = `        // 3. BÖLÜMLERİ VE İÇERİKLERİNİ DÖN`;
let replaceSmartGroups = `        // 2.5 DIŞ YAN DİKMELERİ AKILLI GRUPLAMA
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
