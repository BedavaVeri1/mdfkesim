const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

code = code.replace(
    "h: parseFloat(card.querySelector('.sec-h').value) || 0,",
    "h: parseFloat(card.querySelector('.sec-h').value) || 0,\n            customD: card.querySelector('.sec-custom-d') ? card.querySelector('.sec-custom-d').value : \"\","
);

code = code.replace(
    "drawerStart: col.querySelector('.col-drawer-start') ? col.querySelector('.col-drawer-start').value : \"1\",",
    "drawerStart: col.querySelector('.col-drawer-start') ? col.querySelector('.col-drawer-start').value : \"1\",\n                    baseType: col.querySelector('.col-base-type') ? col.querySelector('.col-base-type').value : 'standart',"
);

// We also need to fix where secD is assigned inside the 3d loop. Let's find how sections are looped.
// In 3d-viewer.js: "sections.forEach((secData, index) => {"
code = code.replace(
    "sections.forEach((secData, index) => {",
    "sections.forEach((secData, index) => {\n        const secD = parseFloat(secData.customD) || d;"
);

// We need to change "d" to "secD" in the rendering for shelves and side panels inside the loop.
fs.writeFileSync('3d-viewer.js', code);
