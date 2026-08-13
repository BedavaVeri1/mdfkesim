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
        return {
            h: parseFloat(card.querySelector('.sec-h').value) || 0,
            doorQty: parseInt(card.querySelector('.sec-door-qty').value) || 0,
            shelfQty: parseInt(card.querySelector('.sec-shelf-qty').value) || 0,
            gap: parseFloat(card.querySelector('.sec-gap').value) || 20,
            customShelves: card.querySelector('.sec-custom-shelves').value || ""
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
            // 1. Bölüm: Hem Alt Tabla hem kendi Üst Tablası dahil
            netH = sec.h - (2 * thick);
            currentInnerY = currentOuterY + thick; // Alt tablanın üstünden başlar
        } else {
            // Diğer Bölümler: Altındaki tablayı paylaşıyor, sadece kendi Üst Tablası dahil
            netH = sec.h - thick;
            currentInnerY = currentOuterY; // Bir önceki bölümün üst tablanın üstünden başlar
        }
        
        // --- Raflar ---
        if (sec.shelfQty > 0) {
            const shelfD = d - sec.gap; 
            const shelfZ = -(d / 2) + (shelfD / 2);
            
            let customHeights = [];
            if (sec.customShelves.trim() !== "") {
                customHeights = sec.customShelves.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
            }
            
            let shelfCurrentY = currentInnerY;
            
            // Net Boşluk hesabı
            const totalShelfThick = sec.shelfQty * thick;
            const netEmptySpace = netH - totalShelfThick;
            const defaultGap = netEmptySpace / (sec.shelfQty + 1);
            
            for (let i = 0; i < sec.shelfQty; i++) {
                let thisGap = defaultGap;
                if (customHeights[i]) {
                    thisGap = customHeights[i];
                }
                shelfCurrentY += thisGap;
                
                const yPos = shelfCurrentY + (thick / 2);
                cabinetGroup.add(createPanel(innerW, thick, shelfD, 0, yPos, shelfZ));
                
                shelfCurrentY += thick; 
            }
        }

        // --- Kapaklar ---
        if (sec.doorQty > 0) {
            const doorGap = 3;
            // Kapak yüksekliği bölümün tüm dış yüksekliğini kapsar
            const doorH = sec.h - (doorGap * 2);
            const doorThick = 18; 
            
            const doorZ = (d / 2) + (doorThick / 2); 
            const doorW = (w - (doorGap * (sec.doorQty + 1))) / sec.doorQty;
            
            let currentX = -(w / 2) + doorGap + (doorW / 2);
            // Kapak Y ekseninde bölümün tam dış merkezine hizalanır
            const doorCenterY = currentOuterY + (sec.h / 2);
            
            for (let i = 0; i < sec.doorQty; i++) {
                cabinetGroup.add(createPanel(doorW, doorH, doorThick, currentX, doorCenterY, doorZ, true));
                currentX += doorW + doorGap;
            }
        }
        
        // --- Bölüm Üst Tablası (veya Sabit Ara Raf) ---
        // Bu tablanın üst yüzeyi tam olarak (currentOuterY + sec.h) noktasına basmalıdır.
        const topY = currentOuterY + sec.h - (thick / 2);
        cabinetGroup.add(createPanel(innerW, thick, d, 0, topY, 0));
        
        // Bir sonraki bölüm, bu bölümün bittiği dış noktadan başlar
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
