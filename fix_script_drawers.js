const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

let search = "const usableH = doorTotalH - bottomGap - topGap - innerGapsH;";
let replace = `
                // Masa Modu: Sütun ayağı (baseH) varsa kapak/çekmece alanını daralt
                let colDoorTotalH = doorTotalH;
                if (noBottomBoard && index === 0 && (col.baseType === 'yere_basan_ayak' || col.baseType === 'yere_basan_baza')) {
                    let cbh = parseFloat(col.baseH) || 0;
                    colDoorTotalH -= cbh;
                }
                const usableH = colDoorTotalH - bottomGap - topGap - innerGapsH;
`;
code = code.replace(search, replace);

fs.writeFileSync('script.js', code);
