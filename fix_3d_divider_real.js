const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

let search = `            // ORTA DİKME (Eğer son sütun değilse)
            if (cIdx < sec.colsCount - 1) {
                const dikmeX = currentColX + (thick / 2);
                const dikmeY = currentInnerY + (netH / 2);
                cabinetGroup.add(createPanel(thick, netH, secD, dikmeX, dikmeY, -zOffset));
                
                currentColX += thick; 
            }`;

let replace = `            // ORTA DİKME (Eğer son sütun değilse)
            if (cIdx < sec.colsCount - 1) {
                const dikmeX = currentColX + (thick / 2);
                let dividerH = netH;
                let dividerY = currentInnerY + (netH / 2);
                
                if (noBottomBoard && index === 0) {
                    let leftCol = sec.columns[cIdx];
                    let rightCol = sec.columns[cIdx + 1];
                    let leftGap = (leftCol && (leftCol.baseType === 'yere_basan_ayak' || leftCol.baseType === 'yere_basan_baza')) ? (parseFloat(leftCol.baseH) || 0) : 0;
                    let rightGap = (rightCol && (rightCol.baseType === 'yere_basan_ayak' || rightCol.baseType === 'yere_basan_baza')) ? (parseFloat(rightCol.baseH) || 0) : 0;
                    let minGap = Math.min(leftGap, rightGap);
                    
                    dividerH = sec.h - thick - minGap;
                    dividerY = currentOuterY + minGap + (dividerH / 2);
                }
                
                cabinetGroup.add(createPanel(thick, dividerH, secD, dikmeX, dividerY, -zOffset));
                
                currentColX += thick; 
            }`;

code = code.replace(search, replace);
fs.writeFileSync('3d-viewer.js', code);
