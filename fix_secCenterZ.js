const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

code = code.replace(/const zOffset = \(d - secD\) \/ 2; \/\/ Arka sıfır hizası için Z kayması/g, "const zOffset = (d - secD) / 2; // Arka sıfır hizası için Z kayması\n            const secCenterZ = -zOffset; // Parçaları geriye yaslamak için");

fs.writeFileSync('3d-viewer.js', code);
