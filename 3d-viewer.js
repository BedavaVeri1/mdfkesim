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

    const type = document.getElementById('mod-type').value;
    const w = parseFloat(document.getElementById('mod-w').value) || 0;
    const h = parseFloat(document.getElementById('mod-h').value) || 0;
    const d = parseFloat(document.getElementById('mod-d').value) || 0;
    const thick = parseFloat(document.getElementById('mod-thick').value) || 18;
    const shelfQty = parseInt(document.getElementById('mod-shelf-qty').value) || 0;
    const shelfGap = parseFloat(document.getElementById('mod-shelf-gap').value) || 0;
    const doorQty = parseInt(document.getElementById('mod-door-qty').value) || 0;
    const doorGap = parseFloat(document.getElementById('mod-door-gap').value) || 0;

    if (w <= 0 || h <= 0 || d <= 0) return;

    // --- 1. YAN DİKMELER ---
    const sideW = thick;
    const sideH = h;
    const sideD = d;
    
    const leftSideX = -(w / 2) + (thick / 2);
    const rightSideX = (w / 2) - (thick / 2);
    const sideY = h / 2;
    const sideZ = 0; // Derinlikte merkezlenmiş

    cabinetGroup.add(createPanel(sideW, sideH, sideD, leftSideX, sideY, sideZ));
    cabinetGroup.add(createPanel(sideW, sideH, sideD, rightSideX, sideY, sideZ));

    // --- 2. ALT VE ÜST TABLALAR ---
    const innerW = w - (2 * thick);
    const tbW = innerW;
    const tbH = thick;
    const tbD = d;
    
    const bottomY = thick / 2;
    
    // Hem Alt hem Üst dolapta 3D görsel bütünlüğü için tam plaka çiziyoruz.
    cabinetGroup.add(createPanel(tbW, tbH, tbD, 0, bottomY, 0));
    cabinetGroup.add(createPanel(tbW, tbH, tbD, 0, h - (thick / 2), 0));

    // --- 3. RAFLAR ---
    if (shelfQty > 0) {
        const shelfW = innerW;
        const shelfH = thick;
        const shelfD = d - shelfGap; // İçerlek payı (kapak çarpmasın diye önden kısa)
        
        const shelfZ = -(d / 2) + (shelfD / 2); // Arkaya sıfır daya, önden boşluk bırak
        
        const innerH = h - (2 * thick);
        const gapH = innerH / (shelfQty + 1);
        
        for (let i = 1; i <= shelfQty; i++) {
            const yPos = thick + (gapH * i);
            cabinetGroup.add(createPanel(shelfW, shelfH, shelfD, 0, yPos, shelfZ));
        }
    }

    // --- 4. KAPAKLAR ---
    if (doorQty > 0) {
        const doorH = h - (doorGap * 2);
        const doorThick = 18; // Kapak da standart 18mm olsun
        
        const doorZ = (d / 2) + (doorThick / 2); // Dolabın en ön yüzeyine yerleştir
        const doorW = (w - (doorGap * (doorQty + 1))) / doorQty;
        
        let currentX = -(w / 2) + doorGap + (doorW / 2);
        const doorY = h / 2;
        
        for (let i = 0; i < doorQty; i++) {
            cabinetGroup.add(createPanel(doorW, doorH, doorThick, currentX, doorY, doorZ, true));
            currentX += doorW + doorGap;
        }
    }
    
    // Kamerayı yeni boyuta göre hedefe kilitle
    controls.target.set(0, h/2, 0);
    
    // Yalnızca ilk yüklemede kamerayı hizala
    if (!camera.userData.initialized) {
        camera.position.set(w * 1.5, h * 1.5, Math.max(w, d) * 2.5);
        camera.userData.initialized = true;
    } else {
        // Dinamik Sığdırma (Auto-Zoom Out): Eğer kullanıcı çok büyük bir ölçü girerse kamerayı otomatik geri çek
        const maxDim = Math.max(w, h, d);
        const minDistance = maxDim * 1.8;
        const currentDistance = camera.position.distanceTo(controls.target);
        
        if (currentDistance < minDistance) {
            const ratio = minDistance / (currentDistance || 1); // Sıfıra bölme hatasını önle
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
