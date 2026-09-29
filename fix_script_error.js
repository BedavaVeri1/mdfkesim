const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

// Define splitSides inside generateSingleModuleParts
let search = `    function generateSingleModuleParts(moduleName = "Modül") {`;
let replace = `    function generateSingleModuleParts(moduleName = "Modül") {
        const splitSides = document.getElementById('mod-split-sides') ? document.getElementById('mod-split-sides').checked : false;`;

code = code.replace(search, replace);

// Also remove global sides if splitSides is true
let search2 = `        // Sol ve Sağ Yan Dikmeler (En dıştakiler)
        addPartRow({ name: "Sol Yan Dikme", h: totalOuterSideH, w: global_d, q: 1, rot: true, b: [false, true, true, true] });
        addPartRow({ name: "Sağ Yan Dikme", h: totalOuterSideH, w: global_d, q: 1, rot: true, b: [false, true, true, true] });`;
let replace2 = `        // Sol ve Sağ Yan Dikmeler (En dıştakiler)
        if (!splitSides) {
            addPartRow({ name: "Sol Yan Dikme", h: totalOuterSideH, w: global_d, q: 1, rot: true, b: [false, true, true, true] });
            addPartRow({ name: "Sağ Yan Dikme", h: totalOuterSideH, w: global_d, q: 1, rot: true, b: [false, true, true, true] });
        }`;
code = code.replace(search2, replace2);

fs.writeFileSync('script.js', code);
