const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

// Replace the old yere_basan check
let search1 = `                // Yere Basan Sütun Mantığı (Masa Modu)
                if (noBottomBoard && col.baseType === 'yere_basan') {
                    // Bu sütun yere basıyorsa, kendi yanlarına ekstra boy eklememiz gerekebilir veya mini alt tabla
                    // Ancak halihazırda orta dikme "netH" olarak kesildi.
                    // Yere basan orta dikme hesaplamak için, eğer bu en alt katman (index === 0) ise:
                    if (index === 0) {
                         // Aslında en alt katmansa ve yere basan seçiliyse, o sütunun altına bir mini tabla koyalım:
                         addPartRow({ name: \`\${index+1}. Bölüm \${cIdx+1}. Sütun Mini Alt Tabla\`, h: colW, w: secD, q: 1, rot: true, b: [false, true, false, false] });
                         // Ve eğer ortadaysa (cIdx > 0), onun sol orta dikmesini yere kadar uzatabiliriz.
                         // Ancak şimdilik sadece mini alt tabla koyalım, "Asma" durumunda ise mini alt tabla + çekmece olur, yere basmaz.
                    }
                }`;

let replace1 = `                // Yere Basan Sütun Mantığı (Masa Modu)
                if (noBottomBoard && (col.baseType === 'yere_basan_ayak' || col.baseType === 'yere_basan_baza')) {
                    if (index === 0) {
                         addPartRow({ name: \`\${index+1}. Bölüm \${cIdx+1}. Sütun Mini Alt Tabla\`, h: colW, w: secD, q: 1, rot: true, b: [false, true, false, false] });
                         if (col.baseType === 'yere_basan_baza') {
                             const colBaseH = parseFloat(col.baseH) || 0;
                             if (colBaseH > 0) {
                                 addPartRow({ name: \`\${index+1}. Bölüm \${cIdx+1}. Sütun Ön Baza\`, h: colW, w: colBaseH - 7, q: 1, rot: true, b: [false, false, false, false] });
                             }
                         }
                    }
                }`;
if(code.includes(search1)) {
    code = code.replace(search1, replace1);
    console.log("Replaced search1");
}

let search2 = `            sec.columns.forEach((col, cIdx) => {
                if (cIdx < sec.colsCount - 1) {
                    addPartRow({ name: \`\${index+1}. Bölüm Orta Dikme\`, h: index === 0 ? sec.h - (2 * thick) : sec.h - thick, w: secD, q: 1, rot: true, b: [false, true, true, true] });
                }
            });`;

let replace2 = `            sec.columns.forEach((col, cIdx) => {
                if (cIdx < sec.colsCount - 1) {
                    let dividerH = index === 0 ? sec.h - (2 * thick) : sec.h - thick;
                    if (noBottomBoard && index === 0) {
                        let leftCol = sec.columns[cIdx];
                        let rightCol = sec.columns[cIdx + 1];
                        let leftGap = (leftCol && (leftCol.baseType === 'yere_basan_ayak' || leftCol.baseType === 'yere_basan_baza')) ? (parseFloat(leftCol.baseH) || 0) : 0;
                        let rightGap = (rightCol && (rightCol.baseType === 'yere_basan_ayak' || rightCol.baseType === 'yere_basan_baza')) ? (parseFloat(rightCol.baseH) || 0) : 0;
                        let minGap = Math.max(leftGap, rightGap);
                        dividerH = sec.h - thick - minGap;
                    }
                    addPartRow({ name: \`\${index+1}. Bölüm Orta Dikme\`, h: dividerH, w: secD, q: 1, rot: true, b: [false, true, true, true] });
                }
            });`;

if(code.includes(search2)) {
    code = code.replace(search2, replace2);
    console.log("Replaced search2");
}

fs.writeFileSync('script.js', code);
