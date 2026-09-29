const fs = require('fs');
let code2 = fs.readFileSync('script.js', 'utf8');

code2 = code2.replace(
    "let minGap = Math.max(leftGap, rightGap); // Asma (0) olan tarafı yoksay, ayağı olan tarafa (100) uydur.",
    `if ((leftCol && leftCol.baseType === 'yere_basan_baza') || (rightCol && rightCol.baseType === 'yere_basan_baza')) {
                            leftGap = 0;
                            rightGap = 0;
                        }
                        let minGap = Math.max(leftGap, rightGap);`
);
fs.writeFileSync('script.js', code2);
