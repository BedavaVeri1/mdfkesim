const fs = require('fs');
let code = fs.readFileSync('3d-viewer.js', 'utf8');

let searchCrown = `    // --- TAÇ (ÜST ÇIKINTI) ---
    const addCrown = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;
    if (addCrown) {
        // Taç karkasın tam üstüne binmeli. Karkasın en üst noktası: baseH + sideH (buradaki sideH yukarıda 18mm düşülmüş hali)
        let sidePanelBottomCrown = (baseType === "closed") ? 7 : baseH;
        const crownY = sidePanelBottomCrown + sideH + (thick / 2);
        // Taç ön tarafa doğru 25mm taşacak. 
        // Derinlik d+25. Arka yüzü dolap arkasıyla sıfır (z = -d/2). 
        // Dolayısıyla Z merkezi = -d/2 + (d+25)/2 = 12.5 olur.
        const crownZ = 12.5; 
        cabinetGroup.add(createPanel(w, thick, d + 25, 0, crownY, crownZ));
    }`;

let replaceCrown = `    // --- TAÇ (ÜST ÇIKINTI) ---
    const addCrown = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;
    if (addCrown) {
        let sidePanelBottomCrown = (baseType === "closed") ? 7 : baseH;
        const crownY = sidePanelBottomCrown + sideH + (thick / 2);
        
        let topSecD = d;
        if (splitSides && sections && sections.length > 0) {
            topSecD = parseFloat(sections[sections.length - 1].customD) || d;
        }
        
        // Z merkezi = -d/2 + (topSecD + 25)/2
        const crownZ = (-d / 2) + ((topSecD + 25) / 2);
        cabinetGroup.add(createPanel(w, thick, topSecD + 25, 0, crownY, crownZ));
    }`;

code = code.replace(searchCrown, replaceCrown);
fs.writeFileSync('3d-viewer.js', code);
