const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

// getModuleWizardState
let search1 = `            noBottomBoard: document.getElementById('mod-no-bottom') ? document.getElementById('mod-no-bottom').checked : false,`;
let replace1 = `            noBottomBoard: document.getElementById('mod-no-bottom') ? document.getElementById('mod-no-bottom').checked : false,
            splitSides: document.getElementById('mod-split-sides') ? document.getElementById('mod-split-sides').checked : false,`;
code = code.replace(search1, replace1);

// loadProjectToForm
let search2 = `            if (document.getElementById('mod-no-bottom')) document.getElementById('mod-no-bottom').checked = proj.data.noBottomBoard || false;`;
let replace2 = `            if (document.getElementById('mod-no-bottom')) document.getElementById('mod-no-bottom').checked = proj.data.noBottomBoard || false;
            if (document.getElementById('mod-split-sides')) document.getElementById('mod-split-sides').checked = proj.data.splitSides || false;`;
code = code.replace(search2, replace2);

fs.writeFileSync('script.js', code);
