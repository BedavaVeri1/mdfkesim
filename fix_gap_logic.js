const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

// Fix gap calculation in 3d-viewer.js
let search = `                    let leftGap = (leftCol && (leftCol.baseType === 'yere_basan_ayak' || leftCol.baseType === 'yere_basan_baza')) ? (parseFloat(leftCol.baseH) || 0) : 0;
                    let rightGap = (rightCol && (rightCol.baseType === 'yere_basan_ayak' || rightCol.baseType === 'yere_basan_baza')) ? (parseFloat(rightCol.baseH) || 0) : 0;
                    let minGap = Math.max(leftGap, rightGap); // Asma (0) olan tarafı yoksay, ayağı olan tarafa (100) uydur.`;

let replace = `                    let leftGap = (leftCol && leftCol.baseType === 'yere_basan_ayak') ? (parseFloat(leftCol.baseH) || 0) : 0;
                    let rightGap = (rightCol && rightCol.baseType === 'yere_basan_ayak') ? (parseFloat(rightCol.baseH) || 0) : 0;
                    // Eğer sağ veya sol sütundan biri kapalı baza ise, dikme kesinlikle yere inmelidir (gap = 0)!
                    if ((leftCol && leftCol.baseType === 'yere_basan_baza') || (rightCol && rightCol.baseType === 'yere_basan_baza')) {
                        leftGap = 0;
                        rightGap = 0;
                    }
                    let minGap = Math.max(leftGap, rightGap); // Asma veya Baza durumunda dikme yere iner.`;

code = code.replace(search, replace);
fs.writeFileSync('3d-viewer.js', code);

// Fix gap calculation in script.js
let code2 = fs.readFileSync('script.js', 'utf8');
let search2 = `                        let leftGap = (leftCol && (leftCol.baseType === 'yere_basan_ayak' || leftCol.baseType === 'yere_basan_baza')) ? (parseFloat(leftCol.baseH) || 0) : 0;
                        let rightGap = (rightCol && (rightCol.baseType === 'yere_basan_ayak' || rightCol.baseType === 'yere_basan_baza')) ? (parseFloat(rightCol.baseH) || 0) : 0;
                        let minGap = Math.max(leftGap, rightGap); // Asma (0) olan tarafı yoksay, ayağı olan tarafa (100) uydur.`;

let replace2 = `                        let leftGap = (leftCol && leftCol.baseType === 'yere_basan_ayak') ? (parseFloat(leftCol.baseH) || 0) : 0;
                        let rightGap = (rightCol && rightCol.baseType === 'yere_basan_ayak') ? (parseFloat(rightCol.baseH) || 0) : 0;
                        if ((leftCol && leftCol.baseType === 'yere_basan_baza') || (rightCol && rightCol.baseType === 'yere_basan_baza')) {
                            leftGap = 0;
                            rightGap = 0;
                        }
                        let minGap = Math.max(leftGap, rightGap);`;

code2 = code2.replace(search2, replace2);
fs.writeFileSync('script.js', code2);
