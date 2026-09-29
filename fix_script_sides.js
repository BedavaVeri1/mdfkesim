const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

// 1. Add splitSides to the global settings loaded from DOM
let searchLoad = `        baseH: document.getElementById('mod-base-h').value || 100,
        noBottomBoard: document.getElementById('mod-no-bottom') ? document.getElementById('mod-no-bottom').checked : false`;
let replaceLoad = `        baseH: document.getElementById('mod-base-h').value || 100,
        noBottomBoard: document.getElementById('mod-no-bottom') ? document.getElementById('mod-no-bottom').checked : false,
        splitSides: document.getElementById('mod-split-sides') ? document.getElementById('mod-split-sides').checked : false`;
code = code.replace(searchLoad, replaceLoad);

// 2. Add splitSides to state saving
let searchSave = `            if (document.getElementById('mod-no-bottom')) document.getElementById('mod-no-bottom').checked = state.noBottomBoard;`;
let replaceSave = `            if (document.getElementById('mod-no-bottom')) document.getElementById('mod-no-bottom').checked = state.noBottomBoard;
            if (document.getElementById('mod-split-sides')) document.getElementById('mod-split-sides').checked = state.splitSides || false;`;
code = code.replace(searchSave, replaceSave);

// 3. Update generateSingleModuleParts (Cut list logic)
let searchGen = `        // 1. GÖVDE (DIŞ ÇERÇEVE) - DİKEY EKSENDE BOY ÇIKARILMALI
        const totalOuterSideH = overallH;`;
let replaceGen = `        const splitSides = document.getElementById('mod-split-sides') ? document.getElementById('mod-split-sides').checked : false;
        
        // 1. GÖVDE (DIŞ ÇERÇEVE) - DİKEY EKSENDE BOY ÇIKARILMALI
        const totalOuterSideH = overallH;`;
code = code.replace(searchGen, replaceGen);

let searchGen2 = `        // Sol ve Sağ Yan Dikmeler (En dıştakiler)
        addPartRow({ name: "Sol Yan Dikme", h: totalOuterSideH, w: global_d, q: 1, rot: true, b: [false, true, true, true] });
        addPartRow({ name: "Sağ Yan Dikme", h: totalOuterSideH, w: global_d, q: 1, rot: true, b: [false, true, true, true] });`;
let replaceGen2 = `        // Sol ve Sağ Yan Dikmeler (En dıştakiler)
        if (!splitSides) {
            addPartRow({ name: "Sol Yan Dikme", h: totalOuterSideH, w: global_d, q: 1, rot: true, b: [false, true, true, true] });
            addPartRow({ name: "Sağ Yan Dikme", h: totalOuterSideH, w: global_d, q: 1, rot: true, b: [false, true, true, true] });
        }`;
code = code.replace(searchGen2, replaceGen2);

let searchGen3 = `            // Sütunlar Arası Orta Dikmeler
            if (sec.colsCount > 1) {`;
let replaceGen3 = `            // Eğer splitSides açıksa, bu bölümün KENDİ dış yanlarını (Sol/Sağ) ekle
            if (splitSides) {
                let sideH = index === 0 ? sec.h - (2 * thick) : sec.h - thick;
                if (noBottomBoard && index === 0) sideH = sec.h - thick;
                addPartRow({ name: \`\${index+1}. Bölüm Sol Yan Dikme\`, h: sideH, w: secD, q: 1, rot: true, b: [false, true, true, true] });
                addPartRow({ name: \`\${index+1}. Bölüm Sağ Yan Dikme\`, h: sideH, w: secD, q: 1, rot: true, b: [false, true, true, true] });
            }

            // Sütunlar Arası Orta Dikmeler
            if (sec.colsCount > 1) {`;
code = code.replace(searchGen3, replaceGen3);

fs.writeFileSync('script.js', code);
