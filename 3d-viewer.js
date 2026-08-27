let scene, camera, renderer, controls;
let cabinetGroup;

const MATERIAL_PANEL = new THREE.MeshStandardMaterial({ 
    color: 0xdeb887, // Ahşap rengi
    roughness: 0.8,
    metalness: 0.1
});

const MATERIAL_DOOR = new THREE.MeshStandardMaterial({
    color: 0xe6cdab,
    roughness: 0.9,
    metalness: 0.05,
    transparent: true,
    opacity: 0.5
});

function init3DViewer() {
    const container = document.getElementById('module-3d-container');
    if (!container) return;
    
    // Eğer zaten kurulmuşsa temizle (çift yüklenmeyi önlemek için)
    if (renderer) {
        container.innerHTML = '';
    }

    // Sahne
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f5); // Açık gri stüdyo arka planı

    // Kamera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 10000);
    camera.position.set(1000, 1000, 1500);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // OrbitControls (Fare ile çevirme)
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.target.set(0, 350, 0);

    // Işıklar
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(1000, 2000, 1000);
    scene.add(dirLight);
    
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-1000, 1000, -1000);
    scene.add(dirLight2);

    cabinetGroup = new THREE.Group();
    scene.add(cabinetGroup);

    window.addEventListener('resize', onWindowResize, false);

    // Canlı önizleme için input eventlerini dinle
    const inputs = ['mod-type', 'mod-w', 'mod-h', 'mod-d', 'mod-thick', 'mod-shelf-qty', 'mod-shelf-gap', 'mod-door-qty', 'mod-door-gap', 'mod-base-type', 'mod-base-h'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', update3DModel);
            el.addEventListener('change', update3DModel);
        }
    });

    update3DModel();
    animate();
    
    // Kapak Şeffaflık Aç/Kapat Butonu
    const btnToggle = document.getElementById('btn-toggle-door-transparency');
    let isDoorTransparent = true;
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            isDoorTransparent = !isDoorTransparent;
            MATERIAL_DOOR.transparent = isDoorTransparent;
            MATERIAL_DOOR.opacity = isDoorTransparent ? 0.5 : 1.0;
            MATERIAL_DOOR.needsUpdate = true;
            
            if (isDoorTransparent) {
                btnToggle.innerHTML = '<i class="fas fa-eye"></i> Kapakları Katı Yap';
            } else {
                btnToggle.innerHTML = '<i class="fas fa-eye-slash"></i> Kapakları Şeffaf Yap';
            }
        });
    }

    // Fotoğraf İndirme Butonu
    const btnImg = document.getElementById('btn-download-img');
    if (btnImg) {
        btnImg.addEventListener('click', () => {
            // İndirirken zorla mat (katı) yap
            const previousTransparent = MATERIAL_DOOR.transparent;
            const previousOpacity = MATERIAL_DOOR.opacity;
            
            MATERIAL_DOOR.transparent = false;
            MATERIAL_DOOR.opacity = 1.0;
            MATERIAL_DOOR.needsUpdate = true;
            
            renderer.render(scene, camera);
            
            const link = document.createElement('a');
            link.download = 'MDF_Tasarim.png';
            link.href = renderer.domElement.toDataURL('image/png');
            link.click();
            
            // İndirme bittikten sonra eski haline getir
            MATERIAL_DOOR.transparent = previousTransparent;
            MATERIAL_DOOR.opacity = previousOpacity;
            MATERIAL_DOOR.needsUpdate = true;
        });
    }

    // 3D Model (GLB) İndirme Butonu
    const btn3D = document.getElementById('btn-download-3d');
    if (btn3D) {
        btn3D.addEventListener('click', () => {
            if (typeof THREE.GLTFExporter === 'undefined') {
                alert('GLTFExporter yüklenemedi. Lütfen internet bağlantınızı kontrol edin.');
                return;
            }
            const exporter = new THREE.GLTFExporter();
            exporter.parse(cabinetGroup, function (gltf) {
                // Sadece modeli aktar
                const output = JSON.stringify(gltf, null, 2);
                const blob = new Blob([output], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'MDF_Model.gltf';
                link.click();
            }, { binary: false });
        });
    }
}

function onWindowResize() {
    const container = document.getElementById('module-3d-container');
    if (!container || !camera || !renderer) return;
    
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

function createPanel(w, h, d, x, y, z, isDoor = false) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, isDoor ? MATERIAL_DOOR : MATERIAL_PANEL);
    mesh.position.set(x, y, z);
    
    // Kenar çizgileri (Bant yerleri veya hatları belli etmek için)
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x333333 })); // Koyu belirgin hatlar
    mesh.add(line);
    
    return mesh;
}

function update3DModel() {
    if (!cabinetGroup) return;
    
    // YÜKSEKLİK KONTROLÜ
    const tempOverallH = parseFloat(document.getElementById('mod-h').value) || 0;
    const tempBaseH = parseFloat(document.getElementById('mod-base-h')?.value) || 0;
    const tempThick = 18;
    const addCrownTemp = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;
    const tempSideH = addCrownTemp ? (tempOverallH - tempBaseH - tempThick) : (tempOverallH - tempBaseH);
    const tempInnerH = tempSideH - (2 * tempThick);
    
    let totalSecH = 0;
    document.querySelectorAll('.section-card').forEach(card => {
        totalSecH += parseFloat(card.querySelector('.sec-h').value) || 0;
    });
    
    if (window.moduleWizardMode !== 'vertical' && totalSecH > tempSideH + 5) {
        const fark = totalSecH - tempSideH;
        if (typeof showToast === 'function') {
            showToast('DİKKAT: Bölüm yükseklikleri toplamı, dolabın gövde yüksekliğini tam <b>' + fark.toFixed(0) + ' mm aşıyor!</b>', 'error');
        }
    }

    // Mevcut çizimi temizle
    while(cabinetGroup.children.length > 0){ 
        cabinetGroup.remove(cabinetGroup.children[0]); 
    }

    const w = parseFloat(document.getElementById('mod-w')?.value) || 0;
    const overallH = parseFloat(document.getElementById('mod-h')?.value) || 0;
    const d = parseFloat(document.getElementById('mod-d')?.value) || 0;
    const thick = parseFloat(document.getElementById('mod-thick')?.value) || 18;
    const baseH = parseFloat(document.getElementById('mod-base-h')?.value) || 0;
    
    const sections = Array.from(document.querySelectorAll('.section-card')).map(card => {
        const rawCols = parseInt(card.querySelector('.sec-cols-count').value);
        return {
            h: parseFloat(card.querySelector('.sec-h').value) || 0,
            colsCount: isNaN(rawCols) || rawCols < 1 ? 1 : rawCols,
            columns: Array.from(card.querySelectorAll('.column-card')).map(col => {
                const rawShelf = parseInt(col.querySelector('.col-shelf-qty').value);
                const rawDoor = parseInt(col.querySelector('.col-door-qty').value);
                const rawStack = parseInt(col.querySelector('.col-stack-qty').value);
                return {
                    shelfQty: isNaN(rawShelf) ? 0 : rawShelf,
                    doorQty: isNaN(rawDoor) ? 0 : rawDoor,
                    stackQty: isNaN(rawStack) ? 0 : rawStack,
                    drawerQty: col.querySelector('.col-drawer-qty') ? (parseInt(col.querySelector('.col-drawer-qty').value) || 0) : 0,
                    drawerStart: col.querySelector('.col-drawer-start') ? col.querySelector('.col-drawer-start').value : "1",
                    gap: col.querySelector('.col-gap') ? parseFloat(col.querySelector('.col-gap').value) || 15 : 15,
                    customW: col.querySelector('.col-custom-w') ? col.querySelector('.col-custom-w').value : "",
                    customDrawers: col.querySelector('.col-custom-drawers') ? col.querySelector('.col-custom-drawers').value : "",
                    customShelves: col.querySelector('.col-custom-shelves') ? col.querySelector('.col-custom-shelves').value : "",
                    doorShelfDist: col.querySelector('.col-door-shelf-dist') ? col.querySelector('.col-door-shelf-dist').value : "",
                    doorWDist: col.querySelector('.col-door-w-dist') ? col.querySelector('.col-door-w-dist').value : ""
                };
            })
        };
    });

    if (w <= 0 || overallH <= 0 || d <= 0 || sections.length === 0) return;

    const baseType = document.getElementById('mod-base-type') ? document.getElementById('mod-base-type').value : 'normal';
    const isCrownAdded = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;
    
    let sideH = overallH - baseH;
    if (isCrownAdded) sideH -= thick;
    let sideY = baseH + (sideH / 2);
    
    if (baseType === 'closed') {
        sideH = overallH - 7;
        if (isCrownAdded) sideH -= thick;
        sideY = 7 + (sideH / 2);
    }

    const innerW = w - (2 * thick);
    
    // --- 0. AYAKLAR VEYA BAZA ---
    if (baseH > 0) {
        if (baseType === 'normal') {
            const legMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
            const legW = 50; const legD = 50;
            const legY = baseH / 2;
            const legMarginX = (w / 2) - 40;
            const legMarginZ = (d / 2) - 40;
            
            const positions = [
                [-legMarginX, legY, -legMarginZ],
                [legMarginX, legY, -legMarginZ],
                [-legMarginX, legY, legMarginZ],
                [legMarginX, legY, legMarginZ]
            ];
            
            positions.forEach(pos => {
                const legMesh = new THREE.Mesh(new THREE.BoxGeometry(legW, baseH, legD), legMaterial);
                legMesh.position.set(...pos);
                cabinetGroup.add(legMesh);
            });
        } else if (baseType === 'closed') {
            // Kapalı Baza (Ön Kapama MDF)
            const plinthH = baseH - 7;
            const plinthY = 7 + (plinthH / 2);
            // Standart 20mm içeride görünüm
            const plinthZ = (d / 2) - 20 - (thick / 2);
            cabinetGroup.add(createPanel(innerW, plinthH, thick, 0, plinthY, plinthZ));

            // 7mm Takoz Ayak Görselleri
            const legMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
            const legW = thick; const legD = 40; const legH = 7;
            const legY = legH / 2;
            const legMarginX = (w / 2) - (thick / 2); // Yan dikmelerin tam altı
            const legMarginZ = (d / 2) - 40; // Ön/Arka payı

            const positions = [
                [-legMarginX, legY, -legMarginZ], // Sol Arka
                [-legMarginX, legY, legMarginZ - 20],  // Sol Ön
                [legMarginX, legY, -legMarginZ],  // Sağ Arka
                [legMarginX, legY, legMarginZ - 20]    // Sağ Ön
            ];

            positions.forEach(pos => {
                const legMesh = new THREE.Mesh(new THREE.BoxGeometry(legW, legH, legD), legMaterial);
                legMesh.position.set(...pos);
                cabinetGroup.add(legMesh);
            });
        }
    }

    // --- 1. YAN DİKMELER ---
    const leftSideX = -(w / 2) + (thick / 2);
    const rightSideX = (w / 2) - (thick / 2);
    const sideZ = 0; 

    cabinetGroup.add(createPanel(thick, sideH, d, leftSideX, sideY, sideZ));
    cabinetGroup.add(createPanel(thick, sideH, d, rightSideX, sideY, sideZ));

    // --- 2. ALT TABLA ---
    const bottomY = baseH + (thick / 2);
    cabinetGroup.add(createPanel(innerW, thick, d, 0, bottomY, 0));

    // --- 3. BÖLÜMLERİ İNŞA ET ---
    let currentOuterY = baseH; 
    
    // HER ZAMAN EN ÜST TABLAYI ÇİZ (Kutu her zaman kapalı olmalı)
    const topY = baseH + sideH - (thick / 2);
    cabinetGroup.add(createPanel(innerW, thick, d, 0, topY, 0));
    
    if (window.moduleWizardMode === 'vertical') {
        const innerH = sideH - (2 * thick);
        const moduleCount = sections.length;
        currentOuterY = baseH + sideH; 
        
        const availableModW = innerW - ((moduleCount - 1) * thick);
        let customModWTotal = 0;
        let customModCols = 0;
        sections.forEach(sec => {
            if (sec.h && sec.h > 0) {
                customModWTotal += sec.h;
                customModCols++;
            }
        });
        const remainingModW = availableModW - customModWTotal;
        const defaultModW = remainingModW / (moduleCount - customModCols);
        
        let currentModX = -(innerW / 2); 
        
        sections.forEach((sec, index) => {
            const modW = (sec.h && sec.h > 0) ? sec.h : defaultModW;
            const col = sec.columns[0];
            
            if (index < moduleCount - 1) {
                const dikmeX = currentModX + modW + (thick / 2);
                const dikmeY = baseH + (sideH / 2);
                cabinetGroup.add(createPanel(thick, innerH, d, dikmeX, dikmeY, 0));
            }
            
            if (col.shelfQty > 0) {
                let customShelves = [];
                if (col.customShelves && col.customShelves.trim() !== "") {
                    customShelves = col.customShelves.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
                }
                const totalShelfThick = col.shelfQty * thick;
                const netEmptySpace = innerH - totalShelfThick;
                const defaultShelfGap = netEmptySpace / (col.shelfQty + 1);
                
                let shelfCurrentY = baseH + thick; 
                for (let i = 0; i < col.shelfQty; i++) {
                    let thisGap = customShelves[i] ? customShelves[i] : defaultShelfGap;
                    shelfCurrentY += thisGap;
                    const sY = shelfCurrentY + (thick / 2);
                    const sX = currentModX + (modW / 2);
                    const sZ = -7.5; 
                    cabinetGroup.add(createPanel(modW, thick, d - 15, sX, sY, sZ));
                    shelfCurrentY += thick;
                }
            }
            
            let drawerTotalH = 0;
            if (col.drawerQty > 0) {
                let customDrawers = [];
                if (col.customDrawers && col.customDrawers.trim() !== "") {
                    customDrawers = col.customDrawers.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
                }
                let drawerCurrentY = baseH + thick;
                for (let stack = 0; stack < col.drawerQty; stack++) {
                    let drawerH = 185; 
                    if (customDrawers[stack]) drawerH = customDrawers[stack];
                    const drW = modW - 4; 
                    const drX = currentModX + (modW / 2);
                    const drY = drawerCurrentY + (drawerH / 2) + 2; 
                    const drZ = (d / 2) + 2; 
                    cabinetGroup.add(createPanel(drW, drawerH, thick, drX, drY, drZ, true));
                    drawerCurrentY += drawerH + 4;
                }
                drawerTotalH = col.drawerQty * 185 + (col.drawerQty * 4); 
            }
            
            if (col.doorQty > 0 && col.stackQty > 0) {
                const innerGapsH = (col.stackQty - 1) * 4;
                const usableH = innerH - drawerTotalH - innerGapsH - 4; 
                const doorH = usableH / col.stackQty;
                const doorW = col.doorQty === 2 ? (modW - 8) / 2 : modW - 4;
                let currentDoorY = baseH + thick + drawerTotalH + 2; 
                for (let stack = 0; stack < col.stackQty; stack++) {
                    const dY = currentDoorY + (doorH / 2);
                    const dZ = (d / 2) + 2;
                    if (col.doorQty === 2) {
                        const dXLeft = currentModX + (doorW / 2) + 2;
                        const dXRight = currentModX + modW - (doorW / 2) - 2;
                        cabinetGroup.add(createPanel(doorW, doorH, thick, dXLeft, dY, dZ, true));
                        cabinetGroup.add(createPanel(doorW, doorH, thick, dXRight, dY, dZ, true));
                    } else {
                        const dX = currentModX + (modW / 2);
                        cabinetGroup.add(createPanel(doorW, doorH, thick, dX, dY, dZ, true));
                    }
                    currentDoorY += doorH + 4;
                }
            }
            currentModX += modW + thick;
        });
    } else {
        sections.forEach((sec, index) => {

        let netH;
        let currentInnerY;
        
        if (index === 0) {
            netH = sec.h - (2 * thick);
            currentInnerY = currentOuterY + thick; 
        } else {
            netH = sec.h - thick;
            currentInnerY = currentOuterY; 
        }
        
        // Sütun Genişliklerini (colW) Hesaplama
        const availableW = innerW - ((sec.colsCount - 1) * thick);
        let customWTotal = 0;
        let customCols = 0;
        
        sec.columns.forEach(col => {
            if (col.customW && !isNaN(parseFloat(col.customW))) {
                customWTotal += parseFloat(col.customW);
                customCols++;
            }
        });
        
        const remainingW = availableW - customWTotal;
        const defaultColW = remainingW / (sec.colsCount - customCols);

        // X ekseninde başlangıç noktaları
        let currentColX = -(innerW / 2); // İçeriden başlangıç (Raflar ve Dikmeler için)
        let currentOuterColX = -(w / 2); // Dışarıdan başlangıç (Kapaklar için)
        
        // Dikey boşluk (Bölüm dış sınırları) akıllı hesaplama
        const prevSec = index > 0 ? sections[index - 1] : null;
        const nextSec = index < sections.length - 1 ? sections[index + 1] : null;
        
        const prevSecHasDoors = prevSec ? prevSec.columns.some(c => c.doorQty > 0 && c.stackQty > 0) : false;
        const nextSecHasDoors = nextSec ? nextSec.columns.some(c => c.doorQty > 0 && c.stackQty > 0) : false;

        let bottomGap = 0;
        let topGap = 0;
        let sectionDoorTotalH = sec.h;
        let sectionDoorAreaStart = currentOuterY;

        if (index > 0) {
            if (prevSecHasDoors) {
                sectionDoorTotalH += (thick / 2);
                sectionDoorAreaStart -= (thick / 2);
                bottomGap = 2;
            } else {
                sectionDoorTotalH += thick;
                sectionDoorAreaStart -= thick;
                bottomGap = 0;
            }
        }

        if (index < sections.length - 1) {
            if (nextSecHasDoors) {
                sectionDoorTotalH -= (thick / 2);
                topGap = 2;
            } else {
                topGap = 0;
            }
        } else {
            const addCrownTemp = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;
            if (addCrownTemp) {
                topGap = 4;
                sectionDoorTotalH -= 4;
            }
        }


        sec.columns.forEach((col, cIdx) => {
            let colW = defaultColW;
            if (col.customW && !isNaN(parseFloat(col.customW))) {
                colW = parseFloat(col.customW);
            }
            
            // 1. RAFLARIN MERKEZ KOORDİNATLARINI HESAPLA
            let customShelves = [];
            if (col.customShelves.trim() !== "") {
                customShelves = col.customShelves.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
            }
            
            const totalShelfThick = col.shelfQty * thick;
            const netEmptySpace = netH - totalShelfThick;
            const defaultShelfGap = netEmptySpace / (col.shelfQty + 1);
            
            let localShelfCurrentY = 0;
            let shelfCenters = [];
            
            for (let i = 0; i < col.shelfQty; i++) {
                let thisGap = customShelves[i] ? customShelves[i] : defaultShelfGap;
                localShelfCurrentY += thisGap;
                shelfCenters.push(localShelfCurrentY + (thick / 2));
                localShelfCurrentY += thick;
            }

            // 2. KAPAK SINIR (ÇARPIŞMA) NOKTALARINI VE YÜKSEKLİKLERİNİ HESAPLA
            let doorBoundaries = [];
            let doorHeights = [];
            
            let doorTotalH = sectionDoorTotalH;
            const innerGapsH = (col.stackQty - 1) * 4;
            const usableH = doorTotalH - bottomGap - topGap - innerGapsH;
            const defaultDoorH = usableH / col.stackQty;

            if (col.doorQty > 0 && col.stackQty > 0) {
                let doorStartLocalY = 0;
                if (index > 0) {
                    doorStartLocalY = prevSecHasDoors ? (-thick / 2) : -thick;
                } else {
                    doorStartLocalY = -thick; 
                }
                doorStartLocalY += bottomGap;
                
                let customDrawers = [];
                if (col.customDrawers && col.customDrawers.trim() !== "") {
                    customDrawers = col.customDrawers.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
                }
                
                let doorShelfDist = [];
                if (col.doorShelfDist && col.doorShelfDist.trim() !== "") {
                    doorShelfDist = col.doorShelfDist.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                }
                
                let currentY = doorStartLocalY;
                let accumulatedSpaces = 0;
                
                for (let stack = 0; stack < col.stackQty; stack++) {
                    let doorH = defaultDoorH;
                    
                    if (customDrawers[stack]) {
                        doorH = customDrawers[stack];
                    } else if (doorShelfDist.length === col.stackQty && col.shelfQty > 0) {
                        let spaces = doorShelfDist[stack];
                        accumulatedSpaces += spaces;
                        
                        if (stack < col.stackQty - 1) {
                            let targetShelfIndex = accumulatedSpaces - 1;
                            if (targetShelfIndex >= 0 && targetShelfIndex < shelfCenters.length) {
                                let targetBoundary = shelfCenters[targetShelfIndex];
                                doorH = targetBoundary - currentY - 2; 
                            }
                        } else {
                            doorH = doorStartLocalY + doorTotalH - topGap - currentY;
                        }
                    }
                    
                    doorHeights.push(doorH);
                    currentY += doorH;
                    if (stack < col.stackQty - 1) {
                        doorBoundaries.push(currentY + 2); 
                        currentY += 4;
                    }
                }
            }
            
            // 3. RAFLARI ÇİZ VE KAPAK BASIYORSA TAM BOY YAP
            if (col.shelfQty > 0) {
                let shelfCurrentY = currentInnerY;
                const shelfCenterX = currentColX + (colW / 2);
                let localY = 0;
                
                for (let i = 0; i < col.shelfQty; i++) {
                    let thisGap = customShelves[i] ? customShelves[i] : defaultShelfGap;
                    shelfCurrentY += thisGap;
                    localY += thisGap;
                    
                    const yPos = shelfCurrentY + (thick / 2);
                    const localCenterY = localY + (thick / 2);
                    
                    let isDoorBoundary = false;
                    for (let b of doorBoundaries) {
                        if (Math.abs(localCenterY - b) <= (thick / 2) + 4) {
                            isDoorBoundary = true;
                            break;
                        }
                    }
                    
                    const actualGap = isDoorBoundary ? 0 : col.gap;
                    const shelfD = d - actualGap;
                    const shelfZ = -(d / 2) + (shelfD / 2);
                    
                    cabinetGroup.add(createPanel(colW, thick, shelfD, shelfCenterX, yPos, shelfZ));
                    
                    shelfCurrentY += thick; 
                    localY += thick;
                }
            }

            // 4. KAPAKLARI ÇİZ
            const doorTotalW = (w * (colW / availableW)); 
            
            if (col.doorQty > 0 && col.stackQty > 0) {
                const doorThick = 18; 
                const doorZ = (d / 2) + (doorThick / 2); 
                
                const isLeftCol = (cIdx === 0);
                const isRightCol = (cIdx === sec.colsCount - 1);
                const leftGap = isLeftCol ? 0 : 2;
                const rightGap = isRightCol ? 0 : 2;
                
                const innerGapsW = (col.doorQty - 1) * 4;
                const usableW = doorTotalW - leftGap - rightGap - innerGapsW;
                
                let doorWDist = [];
                if (col.doorWDist && col.doorWDist.trim() !== "") {
                    doorWDist = col.doorWDist.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);
                }
                
                let doorWidths = [];
                if (doorWDist.length === col.doorQty) {
                    const totalDist = doorWDist.reduce((a, b) => a + b, 0);
                    doorWidths = doorWDist.map(dist => usableW * (dist / totalDist));
                } else {
                    const defaultDoorW = usableW / col.doorQty;
                    for(let i=0; i<col.doorQty; i++) doorWidths.push(defaultDoorW);
                }

                let doorCurrentY = sectionDoorAreaStart + bottomGap;

                for (let stack = 0; stack < col.stackQty; stack++) {
                    let doorH = doorHeights[stack];
                    
                    let doorCurrentX = currentOuterColX + leftGap;
                    
                    // Çekmece kontrolü
                    const bottomIndex = col.stackQty - stack;
                    let isDrawer = false;
                    const startStr = String(col.drawerStart || "1");
                    const positions = startStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                    if (startStr.includes(',') || positions.length > 1) {
                        isDrawer = positions.includes(bottomIndex);
                    } else {
                        const start = positions[0] || 1;
                        isDrawer = bottomIndex >= start && bottomIndex < start + col.drawerQty;
                    }
                    
                    for (let dIdx = 0; dIdx < col.doorQty; dIdx++) {
                        let doorW = doorWidths[dIdx];
                        
                        const dCenterX = doorCurrentX + (doorW / 2);
                        const dCenterY = doorCurrentY + (doorH / 2);
                        
                        // Klapayı Çiz
                        cabinetGroup.add(createPanel(doorW, doorH, doorThick, dCenterX, dCenterY, doorZ, true));
                        
                        // Kulp Çizimi
                        const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 });
                        const handleD = 20; const handleW = 120; const handleH = 10;
                        let handleX = dCenterX;
                        let handleY = dCenterY;
                        let handleZ = doorZ + (doorThick / 2) + (handleD / 2);
                        
                        if (isDrawer) {
                            handleY = dCenterY + (doorH * 0.1); 
                            const handleGeo = new THREE.BoxGeometry(handleW, handleH, handleD);
                            const handleMesh = new THREE.Mesh(handleGeo, handleMaterial);
                            handleMesh.position.set(handleX, handleY, handleZ);
                            cabinetGroup.add(handleMesh);
                        } else {
                            if (col.doorQty === 1) {
                                if (sec.colsCount > 1 && cIdx >= sec.colsCount / 2) {
                                    handleX = dCenterX - (doorW / 2) + 40; 
                                } else {
                                    handleX = dCenterX + (doorW / 2) - 40; 
                                }
                            } else {
                                if (dIdx < col.doorQty / 2) {
                                    handleX = dCenterX + (doorW / 2) - 40; 
                                } else {
                                    handleX = dCenterX - (doorW / 2) + 40; 
                                }
                            }
                            const handleGeo = new THREE.BoxGeometry(handleH, handleW, handleD);
                            const handleMesh = new THREE.Mesh(handleGeo, handleMaterial);
                            handleMesh.position.set(handleX, handleY, handleZ);
                            cabinetGroup.add(handleMesh);
                        }
                        
                        // Eğer çekmece ise İç Kasayı Çiz
                        if (isDrawer) {
                            const boxDepth = d - 50;
                            const boxHeight = doorH - 35;
                            
                            const innerOpeningW = colW / col.doorQty;
                            const boxOuterWidth = innerOpeningW - 25;
                            const boxInnerWidth = boxOuterWidth - (2 * thick);
                            
                            // Kasa Y ekseni (Klapanın merkezinden 35mm/2 kadar aşağıda)
                            const boxCenterY = dCenterY - (35 / 2);
                            
                            // Kasa X başlangıcı (sütun içinden)
                            const colStartX = currentColX + (innerOpeningW * dIdx);
                            const boxCenterX = colStartX + (innerOpeningW / 2);
                            
                            // Z Ekseni (Klapanın hemen arkasından başlar)
                            const klapaInnerZ = d / 2;
                            const sideZ = klapaInnerZ - (boxDepth / 2);
                            const frontZ = klapaInnerZ - (thick / 2);
                            const backZ = klapaInnerZ - boxDepth + (thick / 2);
                            
                            // Sol Yan
                            const leftSideX = boxCenterX - (boxOuterWidth / 2) + (thick / 2);
                            cabinetGroup.add(createPanel(thick, boxHeight, boxDepth, leftSideX, boxCenterY, sideZ));
                            
                            // Sağ Yan
                            const rightSideX = boxCenterX + (boxOuterWidth / 2) - (thick / 2);
                            cabinetGroup.add(createPanel(thick, boxHeight, boxDepth, rightSideX, boxCenterY, sideZ));
                            
                            // Ön 
                            cabinetGroup.add(createPanel(boxInnerWidth, boxHeight, thick, boxCenterX, boxCenterY, frontZ));
                            
                            // Arka
                            cabinetGroup.add(createPanel(boxInnerWidth, boxHeight, thick, boxCenterX, boxCenterY, backZ));
                            
                            // Dip (Alt Taban)
                            const bottomY = boxCenterY - (boxHeight / 2) + (thick / 2);
                            cabinetGroup.add(createPanel(boxOuterWidth, thick, boxDepth, boxCenterX, bottomY, sideZ));
                        }
                        
                        doorCurrentX += doorW + 4;
                    }
                    doorCurrentY += doorH + 4;
                }
            }

            // İlerlet
            currentColX += colW;
            currentOuterColX += doorTotalW;
            
            // ORTA DİKME (Eğer son sütun değilse)
            if (cIdx < sec.colsCount - 1) {
                const dikmeX = currentColX + (thick / 2);
                const dikmeY = currentInnerY + (netH / 2);
                cabinetGroup.add(createPanel(thick, netH, d, dikmeX, dikmeY, 0));
                
                currentColX += thick; 
            }
        });
        
        // --- Bölüm Üst Tablası (veya Sabit Ara Raf) ---
        const topY = currentOuterY + sec.h - (thick / 2);
        const anaTavanY = baseH + sideH - (thick / 2);
        if (topY < anaTavanY - 2) {
            cabinetGroup.add(createPanel(innerW, thick, d, 0, topY, 0));
        }
        
        currentOuterY += sec.h;
    });
    }

    // --- TAÇ (ÜST ÇIKINTI) ---
    const addCrown = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;
    if (addCrown) {
        const sideH = overallH - baseH;
        const crownY = baseH + sideH + (thick / 2);
        // Taç ön tarafa doğru 25mm taşacak. 
        // Derinlik d+25. Arka yüzü dolap arkasıyla sıfır (z = -d/2). 
        // Dolayısıyla Z merkezi = -d/2 + (d+25)/2 = 12.5 olur.
        const crownZ = 12.5; 
        cabinetGroup.add(createPanel(w, thick, d + 25, 0, crownY, crownZ));
    }

    // Kamerayı yeni boyuta göre hedefe kilitle
    controls.target.set(0, overallH/2, 0);
    
    // Yalnızca ilk yüklemede kamerayı hizala
    if (!camera.userData.initialized) {
        camera.position.set(w * 1.5, overallH * 1.5, Math.max(w, d) * 2.5);
        camera.userData.initialized = true;
    } else {
        const maxDim = Math.max(w, overallH, d);
        const minDistance = maxDim * 1.8;
        const currentDistance = camera.position.distanceTo(controls.target);
        
        if (currentDistance < minDistance) {
            const ratio = minDistance / (currentDistance || 1); 
            camera.position.sub(controls.target).multiplyScalar(ratio).add(controls.target);
        }
    }
    
    controls.update();
}

// Modül sihirbazı butonu tıklandığında 3D'yi başlat
document.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('open-module-wizard-btn');
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            // Animasyon veya modalın görünür hale gelmesi için ufak gecikme
            setTimeout(() => {
                if (!renderer) {
                    init3DViewer();
                } else {
                    onWindowResize();
                }
            }, 50);
        });
    }
});
