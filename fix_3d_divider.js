const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

// The Orta Dikme is drawn here:
// cabinetGroup.add(createPanel(thick, netH, secD, cX, currentInnerY + (netH / 2), -zOffset));
// We need to calculate dividerH and dividerY in 3d-viewer.js, just like we did in script.js

let search = "cabinetGroup.add(createPanel(thick, netH, secD, cX, currentInnerY + (netH / 2), -zOffset));";
let replace = `
                    // 3D için Dikme boyu ve Y pozisyonunu hesaplama
                    let dividerH = netH;
                    let dividerY = currentInnerY + (netH / 2);
                    
                    if (noBottomBoard && index === 0) {
                        let leftCol = sec.columns[cIdx];
                        let rightCol = sec.columns[cIdx + 1];
                        let leftGap = (leftCol && (leftCol.baseType === 'yere_basan_ayak' || leftCol.baseType === 'yere_basan_baza')) ? (parseFloat(leftCol.baseH) || 0) : 0;
                        let rightGap = (rightCol && (rightCol.baseType === 'yere_basan_ayak' || rightCol.baseType === 'yere_basan_baza')) ? (parseFloat(rightCol.baseH) || 0) : 0;
                        let minGap = Math.min(leftGap, rightGap);
                        
                        // netH zaten (secH - 2*thick) veya (secH - thick) olarak hesaplanmıştı.
                        // noBottomBoard durumunda 3D'de netH = sec.h - 2*thick olarak kaldı, bu yüzden aslında sec.h - thick olmalı.
                        dividerH = sec.h - thick - minGap;
                        // Y pozisyonu: minGap'tan başlar, kalınlık eklenmez çünkü zemin minGap.
                        dividerY = currentOuterY + minGap + (dividerH / 2);
                    }
                    
                    cabinetGroup.add(createPanel(thick, dividerH, secD, cX, dividerY, -zOffset));
`;

code = code.replace(search, replace);

// We should also fix netH for noBottomBoard in index === 0
// if (index === 0) { netH = sec.h - (2 * thick); currentInnerY = currentOuterY + thick; }
code = code.replace(
    "netH = sec.h - (2 * thick);\n            currentInnerY = currentOuterY + thick;",
    "netH = noBottomBoard ? sec.h - thick : sec.h - (2 * thick);\n            currentInnerY = noBottomBoard ? currentOuterY : currentOuterY + thick;"
);

fs.writeFileSync('3d-viewer.js', code);
