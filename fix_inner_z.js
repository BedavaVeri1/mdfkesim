const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

const startIdx = code.indexOf('sections.forEach((sec, index) => {');
if (startIdx !== -1) {
    const endIdx = code.indexOf('    // --- TAÇ (ÜST ÇIKINTI) ---', startIdx);
    
    let block = code.substring(startIdx, endIdx);
    
    // Sabit raflar ve diğer iç organlar için:
    block = block.replace(/, -zOffset\)/g, ", secCenterZ)");
    block = block.replace(/, -zOffset \+ 7.5\)/g, ", secCenterZ + 7.5)");
    
    block = block.replace(/d - 15/g, "secD - 15");
    
    // Kapaklar için:
    block = block.replace(/\(d \/ 2\) \+ \(doorThick \/ 2\)/g, "secCenterZ + (secD / 2) + (doorThick / 2)");
    block = block.replace(/\(d \/ 2\) \+ 2;/g, "secCenterZ + (secD / 2) + 2;");
    
    // Çekmece Kutuları için:
    block = block.replace(/-zOffset \+ \(d \/ 2\)/g, "secCenterZ + (secD / 2)");
    
    // Sabit/Hareketli raf Z:
    block = block.replace(/-\(d \/ 2\) \+ \(shelfD \/ 2\)/g, "secCenterZ - (secD / 2) + (shelfD / 2)");

    code = code.substring(0, startIdx) + block + code.substring(endIdx);
    fs.writeFileSync('3d-viewer.js', code);
}
