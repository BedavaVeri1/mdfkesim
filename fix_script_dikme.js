const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

let search = `            // Sütunlar Arası Orta Dikmeler
            if (sec.colsCount > 1) {
                const dikmeQty = sec.colsCount - 1;
                addPartRow({ name: \`\${index+1}. Bölüm Orta Dikme\`, h: netH, w: secD, q: dikmeQty, rot: true, b: [false, true, false, false] });
            }`;

let replace = `            // Sütunlar Arası Orta Dikmeler
            if (sec.colsCount > 1) {
                for (let d = 0; d < sec.colsCount - 1; d++) {
                    let dividerH = netH;
                    if (noBottomBoard && index === 0) {
                        let leftCol = sec.columns[d];
                        let rightCol = sec.columns[d + 1];
                        let leftGap = (leftCol && (leftCol.baseType === 'yere_basan_ayak' || leftCol.baseType === 'yere_basan_baza')) ? (parseFloat(leftCol.baseH) || 0) : 0;
                        let rightGap = (rightCol && (rightCol.baseType === 'yere_basan_ayak' || rightCol.baseType === 'yere_basan_baza')) ? (parseFloat(rightCol.baseH) || 0) : 0;
                        let minGap = Math.max(leftGap, rightGap);
                        // netH was already sec.h - thick if noBottomBoard is true
                        dividerH = sec.h - thick - minGap;
                    }
                    addPartRow({ name: \`\${index+1}. Bölüm \${d+1}. Orta Dikme\`, h: dividerH, w: secD, q: 1, rot: true, b: [false, true, false, false] });
                }
            }`;

code = code.replace(search, replace);
fs.writeFileSync('script.js', code);
