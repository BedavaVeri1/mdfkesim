let scene, camera, renderer, controls;
let cabinetGroup;

const MATERIAL_PANEL = new THREE.MeshStandardMaterial({ 
    color: 0xdeb887, // Ahşap rengi
    roughness: 0.8,
    metalness: 0.1
});

const MATERIAL_DOOR = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    opacity: 0.4,
    transparent: true, // Yarı şeffaf cam gibi
    roughness: 0.2,
    metalness: 0.1,
    side: THREE.DoubleSide
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
    scene.background = null;

    // Kamera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 10000);
    camera.position.set(1000, 1000, 1500);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
    const inputs = ['mod-type', 'mod-w', 'mod-h', 'mod-d', 'mod-thick', 'mod-shelf-qty', 'mod-shelf-gap', 'mod-door-qty', 'mod-door-gap'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', update3DModel);
            el.addEventListener('change', update3DModel);
        }
    });

    update3DModel();
    animate();
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
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: isDoor ? 0xcccccc : 0x8b4513 }));
    mesh.add(line);
    
    return mesh;
}

function update3DModel() {
    if (!cabinetGroup) return;

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

    const sideH = overallH - baseH;
    const innerW = w - (2 * thick);
    
    // --- 0. AYAKLAR (BAZA) ---
    if (baseH > 0) {
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
    }

    // --- 1. YAN DİKMELER ---
    const sideY = baseH + (sideH / 2);
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
                    for (let dIdx = 0; dIdx < col.doorQty; dIdx++) {
                        let doorW = doorWidths[dIdx];
                        
                        const dCenterX = doorCurrentX + (doorW / 2);
                        const dCenterY = doorCurrentY + (doorH / 2);
                        
                        cabinetGroup.add(createPanel(doorW, doorH, doorThick, dCenterX, dCenterY, doorZ, true));
                        
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
        cabinetGroup.add(createPanel(innerW, thick, d, 0, topY, 0));
        
        currentOuterY += sec.h;
    });

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
