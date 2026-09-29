
document.addEventListener('DOMContentLoaded', () => {

    // --- ŞİFRE KORUMASI (GİRİŞ EKRANI) ---
    const CORRECT_PASSWORD = "123"; // Buradaki şifreyi isteğinize göre değiştirebilirsiniz
    const loginOverlay = document.getElementById('login-overlay');
    const loginPassword = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');

    // Modül Sihirbazı Modu ('horizontal' = katmanlı, 'vertical' = yan yana modüler)
    window.moduleWizardMode = 'horizontal';
    
    // Modül Sihirbazı Çoklu Proje (Sekme) State Yönetimi
    window.wizardProjects = [{ id: 1, name: "Dolap 1", data: null }];
    window.activeProjectId = 1;
    window.nextProjectId = 2;

    // Eski kalıcı hafızayı (localStorage) temizle ki eski şifrelerle girenlerin de oturumu kapansın
    localStorage.removeItem('mdfkesim_auth');

    // Daha önce bu oturumda giriş yapılmış mı kontrol et (sessionStorage)
    if (sessionStorage.getItem('mdfkesim_auth') === 'true') {
        loginOverlay.classList.add('hidden');
    }

    const checkPassword = async () => {
        const password = loginPassword.value;
        if (!password) return;

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kontrol ediliyor...';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (data.success) {
                sessionStorage.setItem('mdfkesim_auth', 'true');
                loginOverlay.classList.add('hidden');
            } else {
                showLoginError(data.error || 'Hatalı şifre!');
            }
        } catch (error) {
            console.error("Giriş hatası:", error);
            // Eğer çevrimdışıysa (PWA) ve daha önce giriş yapılmışsa diye fallback eklenebilir, 
            // ama burada zaten giriş yapılmamışsa API'ye soruyoruz.
            // API'ye ulaşılamıyorsa muhtemelen lokalde (file://) çalıştırılıyordur.
            if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                // SADECE GELİŞTİRME AŞAMASI İÇİN YEREL KONTROL (Vercel harici)
                if (password === '123') {
                    sessionStorage.setItem('mdfkesim_auth', 'true');
                    loginOverlay.classList.add('hidden');
                    return;
                }
            }
            showLoginError('Bağlantı hatası! İnternetinizi kontrol edin.');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Giriş Yap';
        }
    };

    const showLoginError = (msg) => {
        loginError.textContent = msg;
        loginError.style.display = 'block';
        loginOverlay.querySelector('.login-box').classList.remove('shake');
        void loginOverlay.querySelector('.login-box').offsetWidth; // Reflow
        loginOverlay.querySelector('.login-box').classList.add('shake');
        loginPassword.value = '';
        loginPassword.focus();
    };

    loginBtn.addEventListener('click', checkPassword);
    loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkPassword();
    });


    // --- DOM ELEMENTLERİ ---
    const dom = {
        partsList: document.getElementById('parts-list'),
        addPartBtn: document.getElementById('add-part-btn'),
        calculateBtn: document.getElementById('calculate-btn'),
        pdfBtn: document.getElementById('download-pdf-btn'),
        labelBtn: document.getElementById('print-label-btn'),
        saveBtn: document.getElementById('save-btn'),
        loadBtn: document.getElementById('load-btn'),
        templateBtn: document.getElementById('dl-template-btn'),
        clearBtn: document.getElementById('clear-btn'),
        excelInput: document.getElementById('excel-upload'),
        canvas: document.getElementById('cutCanvas'),
        ctx: document.getElementById('cutCanvas').getContext('2d'),
        stdStockSelect: document.getElementById('stdStockSelect'),
        inputs: {
            stockW: document.getElementById('stockW'),
            stockH: document.getElementById('stockH'),
            kerf: document.getElementById('kerf'),
            banding: document.getElementById('bandingThick'),
            sheetPrice: document.getElementById('sheetPrice'),
            cutPrice: document.getElementById('cutPrice')
        },
        stats: {
            sheets: document.getElementById('total-sheets'),
            efficiency: document.getElementById('efficiency-rate'),
            cost: document.getElementById('total-cost'),
            cutLen: document.getElementById('total-cut-len')
        },
        offcutsList: document.getElementById('offcuts-list')
    };

    // Global Durum
    let projectState = {
        sheets: [], // Hesaplanmış plakalar
        blocks: [], // Ham parça listesi
        settings: {}
    };

    let colorMap = {}; // Renk önbelleği

    // --- BAŞLANGIÇ ---
    addPartRow();
    setupEventListeners();

    // --- EVENT LISTENERS KURULUMU ---
    function setupEventListeners() {
        dom.addPartBtn.addEventListener('click', () => {
            addPartRow();
            setTimeout(() => {
                const rows = document.querySelectorAll('.part-row');
                if (rows.length > 0) {
                    rows[rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);
        });

        const clearAllPartsBtn = document.getElementById('clear-all-parts-btn');
        if (clearAllPartsBtn) {
            clearAllPartsBtn.addEventListener('click', () => {
                showCustomConfirm('Tüm parçaları silmek istediğinizden emin misiniz?', () => {
                    dom.partsList.innerHTML = '';
                    showToast('Tüm parçalar temizlendi.', 'info');
                });
            });
        }
        dom.calculateBtn.addEventListener('click', runOptimization);
        dom.pdfBtn.addEventListener('click', generatePDF);
        dom.labelBtn.addEventListener('click', generateLabels);

        // Toolbar
        dom.templateBtn = document.getElementById('dl-template-btn'); // DOM elementini tanımla
        dom.templateBtn.addEventListener('click', downloadExcelTemplate);
        dom.saveBtn.addEventListener('click', saveProject);
        dom.loadBtn.addEventListener('click', loadProject);
        dom.clearBtn.addEventListener('click', () => {
            if (typeof window.showCustomConfirm === 'function') {
                window.showCustomConfirm('Tüm listeyi silmek istediğinizden emin misiniz?', () => {
                    dom.partsList.innerHTML = '';
                    addPartRow();
                });
            } else {
                if (confirm('Tüm liste silinecek?')) { dom.partsList.innerHTML = ''; addPartRow(); }
            }
        });
        dom.excelInput.addEventListener('change', handleExcelUpload);

        // Stok Seçimi
        const customStockGroup = document.getElementById('custom-stock-group');
        dom.stdStockSelect.addEventListener('change', (e) => {
            if (e.target.value !== 'custom') {
                const [w, h] = e.target.value.split('-');
                dom.inputs.stockW.value = w;
                dom.inputs.stockH.value = h;
                customStockGroup.style.display = 'none';
            } else {
                customStockGroup.style.display = 'flex';
            }
        });

        // Modül Sihirbazı
        const wizardBtn = document.getElementById('open-module-wizard-btn');
        const wizardModal = document.getElementById('module-wizard-modal');
        const closeWizard = document.getElementById('close-wizard');
        const generateModuleBtn = document.getElementById('generate-module-btn');

        if (wizardBtn && wizardModal) {
            wizardBtn.addEventListener('click', () => { 
                wizardModal.style.display = 'block'; 
                if (typeof window.renderWizardTabs === 'function') window.renderWizardTabs();
                if (typeof window.update3DModel === 'function') window.update3DModel();
            });
            closeWizard.addEventListener('click', () => { wizardModal.style.display = 'none'; });
            window.addEventListener('click', (e) => {
                if (e.target === wizardModal) wizardModal.style.display = 'none';
            });
            generateModuleBtn.addEventListener('click', generateModuleParts);
        }
    }

    // --- UI FONKSİYONLARI ---

    function addPartRow(data = {}) {
        const row = document.createElement('div');
        row.className = 'part-row';

        // Varsayılan Değerler
        const name = data.name || '';
        const w = (data.w && !isNaN(data.w)) ? Math.round(Number(data.w)) : (data.w || '');
        const h = (data.h && !isNaN(data.h)) ? Math.round(Number(data.h)) : (data.h || '');
        const q = data.q || 1;
        const rot = data.rot !== undefined ? data.rot : true; // Default rotate allowed
        // Banding: [Top, Right, Bottom, Left]
        const b = data.b || [false, false, false, false];

        row.innerHTML = `
            <input type="text" placeholder="Adı" class="p-name" value="${name}" style="flex:2">
            <input type="number" placeholder="Boy" class="p-h" value="${h}" style="flex:1.5">
            <input type="number" placeholder="En" class="p-w" value="${w}" style="flex:1.5">
            <input type="number" value="${q}" class="p-q" style="flex:1">
            
            <div style="flex:0.5; text-align:center;">
                <input type="checkbox" class="rotate-chk" title="Döndürmeye İzin Ver" ${rot ? 'checked' : ''}>
            </div>

            <div class="banding-grid" style="flex:1" title="Kenar Bantlama (Üst, Sağ, Alt, Sol)">
                <input type="checkbox" class="banding-chk b-top" ${b[0] ? 'checked' : ''}>
                <input type="checkbox" class="banding-chk b-right" ${b[1] ? 'checked' : ''}>
                <input type="checkbox" class="banding-chk b-bottom" ${b[2] ? 'checked' : ''}>
                <input type="checkbox" class="banding-chk b-left" ${b[3] ? 'checked' : ''}>
            </div>

            <button class="btn-del" style="flex:0.5"><i class="fas fa-times"></i></button>
        `;

        row.querySelector('.btn-del').addEventListener('click', () => row.remove());
        dom.partsList.appendChild(row);
    }

    // --- EXCEL IMPORT ---
    function handleExcelUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            // Başlığı atla (satır 0), verileri al
            // Beklenen Format: [Ad, Boy, En, Adet]
            // Basit zeka: Eğer sayı varsa al
            // Döndürme veya Bant için yardımcı fonksiyon (X, 1, Evet vb. yakalar)
            const isTruthyExcel = (val) => {
                if (val === undefined || val === null || val === '') return false;
                const s = String(val).trim().toLowerCase();
                return ['1', 'x', 'e', 'evet', 'var', 'v', '+'].includes(s);
            };

            dom.partsList.innerHTML = ''; // Listeyi temizle

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length >= 3) {
                    
                    // Döndürme (Varsayılan: true. Eğer E sütununa bilerek bir şey girildiyse onu kullan)
                    let rot = true;
                    if (row[4] !== undefined && row[4] !== null && String(row[4]).trim() !== "") {
                        rot = isTruthyExcel(row[4]);
                    }

                    // Bantlama (Üst, Sağ, Alt, Sol)
                    const b = [
                        isTruthyExcel(row[5]), // Üst (Top)
                        isTruthyExcel(row[6]), // Sağ (Right)
                        isTruthyExcel(row[7]), // Alt (Bottom)
                        isTruthyExcel(row[8])  // Sol (Left)
                    ];

                    addPartRow({
                        name: row[0] || 'Parça ' + i,
                        h: row[1],
                        w: row[2],
                        q: row[3] || 1,
                        rot: rot,
                        b: b
                    });
                }
            }
            if (window.showCustomAlert) {
                window.showCustomAlert(`${rows.length - 1} parça başarıyla yüklendi!`, 'success');
            } else {
                showToast(`${rows.length - 1} parça başarıyla yüklendi!`, 'success');
            }
        };
        reader.readAsArrayBuffer(file);
        // Reset input
        dom.excelInput.value = '';
    }

    // --- PROJE KAYDET / YÜKLE (DOSYA OLARAK) ---
    async function saveProject() {
        let projectName = await window.showCustomPrompt("Lütfen projeniz için bir isim girin (Müşteri veya İş Adı):", "MdfKesim-Siparis");
        
        // Eğer kullanıcı İptal'e basarsa kaydetmeyi durdur
        if (projectName === null) return; 
        
        // Eğer boş bırakırsa varsayılan bir isim ver
        if (projectName.trim() === "") {
            projectName = "MdfKesim-Proje";
        }

        // Dosya isminde sorun çıkarabilecek yasadışı karakterleri temizle
        projectName = projectName.replace(/[^a-zA-Z0-9 ğüşöçİĞÜŞÖÇ_-]/g, "_");

        const parts = [];
        document.querySelectorAll('.part-row').forEach(row => {
            parts.push({
                name: row.querySelector('.p-name').value,
                w: row.querySelector('.p-w').value,
                h: row.querySelector('.p-h').value,
                q: row.querySelector('.p-q').value,
                rot: row.querySelector('.rotate-chk').checked,
                b: [
                    row.querySelector('.b-top').checked,
                    row.querySelector('.b-right').checked,
                    row.querySelector('.b-bottom').checked,
                    row.querySelector('.b-left').checked
                ]
            });
        });

        // Projeyi kaydetmeden önce aktif sekmeyi state'e at
        if (typeof window.saveCurrentProjectToState === 'function') window.saveCurrentProjectToState();
        
        const project = {
            parts: parts,
            settings: {
                stockW: dom.inputs.stockW.value,
                stockH: dom.inputs.stockH.value,
                kerf: dom.inputs.kerf.value,
                banding: dom.inputs.banding.value,
                sheetPrice: document.getElementById('sheetPrice') ? document.getElementById('sheetPrice').value : 1500,
                cutPrice: document.getElementById('cutPrice') ? document.getElementById('cutPrice').value : 50,
                bandPrice: document.getElementById('bandPrice') ? document.getElementById('bandPrice').value : 15
            },
            wizardProjects: window.wizardProjects,
            moduleWizard: {
                w: document.getElementById('mod-w').value,
                h: document.getElementById('mod-h').value,
                d: document.getElementById('mod-d').value,
                thick: document.getElementById('mod-thick').value,
                baseType: document.getElementById('mod-base-type').value,
                baseH: document.getElementById('mod-base-h').value,
                sections: Array.from(document.querySelectorAll('.section-card')).map(card => {
                    const rawCols = parseInt(card.querySelector('.sec-cols-count').value);
                    return {
                        h: parseFloat(card.querySelector('.sec-h').value) || 0,
                        colsCount: isNaN(rawCols) || rawCols < 1 ? 1 : rawCols,
                        columns: Array.from(card.querySelectorAll('.column-card')).map(col => {
                            const rawShelf = parseInt(col.querySelector('.col-shelf-qty').value);
                            const rawDoor = parseInt(col.querySelector('.col-door-qty').value);
                            const rawStack = parseInt(col.querySelector('.col-stack-qty').value);
                            const rawDrawer = parseInt(col.querySelector('.col-drawer-qty').value);
                            const doorShelfDist = col.querySelector('.col-door-shelf-dist').value;
                            const doorWDist = col.querySelector('.col-door-w-dist').value;
                            return {
                                shelfQty: isNaN(rawShelf) ? 0 : rawShelf,
                                doorQty: isNaN(rawDoor) ? 0 : rawDoor,
                                stackQty: isNaN(rawStack) ? 0 : rawStack,
                                drawerQty: isNaN(rawDrawer) ? 0 : rawDrawer,
                                railQty: col.querySelector('.col-rail-qty') ? (parseInt(col.querySelector('.col-rail-qty').value) || 0) : 0,
                                doorShelfDist: doorShelfDist,
                                doorWDist: doorWDist,
                                gap: parseFloat(col.querySelector('.col-gap').value) || 20,
                                customW: col.querySelector('.col-custom-w').value,
                                customDrawers: col.querySelector('.col-custom-drawers').value,
                                customShelves: col.querySelector('.col-custom-shelves').value
                            };
                        })
                    };
                })
            }
        };

        const jsonString = JSON.stringify(project);
        const fileName = projectName + ".json";

        // Modern Mobil/PWA Paylaşım Ekranı (Eğer destekliyorsa)
        if (navigator.share && navigator.canShare) {
            try {
                const file = new File([jsonString], fileName, { type: 'application/json' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: fileName,
                        text: 'MdfKesim Proje Dosyası',
                        files: [file]
                    });
                    return; // Başarıyla paylaşıldı/kaydedildi
                }
            } catch (err) {
                console.log("Paylaşım iptal edildi veya desteklenmiyor:", err);
            }
        }

        // Desteklemiyorsa (PC vb.) klasik indirme yöntemi
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", fileName);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        showToast('Proje "' + fileName + '" başarıyla indirildi.', 'success');
    }

    function loadProject() {
        const input = document.createElement('input');
        input.type = 'file';
        // iOS ve bazı Android cihazlarda .json uzantısı katı filtrelendiğinde 
        // indirilen dosya seçilemez (soluk) olabiliyor. Bu yüzden tüm dosyalara izin veriyoruz, 
        // arka planda sadece geçerli json'ları kabul edeceğiz.
        input.accept = '*/*'; 
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const project = JSON.parse(event.target.result);

                    // Ayarları Yükle
                    dom.inputs.stockW.value = project.settings.stockW || 2100;
                    dom.inputs.stockH.value = project.settings.stockH || 2800;
                    
                    // Ölçülerin tipine göre arayüzü güncelle
                    const standardVal = `${dom.inputs.stockW.value}-${dom.inputs.stockH.value}`;
                    const optionExists = Array.from(dom.stdStockSelect.options).some(opt => opt.value === standardVal);
                    const customStockGroup = document.getElementById('custom-stock-group');
                    
                    if (optionExists) {
                        dom.stdStockSelect.value = standardVal;
                        customStockGroup.style.display = 'none';
                    } else {
                        dom.stdStockSelect.value = 'custom';
                        customStockGroup.style.display = 'flex';
                    }
                    
                    dom.inputs.kerf.value = project.settings.kerf || 3;
                    dom.inputs.banding.value = project.settings.banding || 1;
                    
                    if(document.getElementById('sheetPrice')) document.getElementById('sheetPrice').value = project.settings.sheetPrice || 1500;
                    if(document.getElementById('cutPrice')) document.getElementById('cutPrice').value = project.settings.cutPrice || 50;
                    if(document.getElementById('bandPrice')) document.getElementById('bandPrice').value = project.settings.bandPrice || 15;

                    // Parçaları Yükle
                    dom.partsList.innerHTML = '';
                    if (project.parts && project.parts.length > 0) {
                        project.parts.forEach(p => addPartRow(p));
                    }
                    
                    // Modül Sihirbazı Verilerini Yükle
                    if (project.wizardProjects && project.wizardProjects.length > 0) {
                        window.wizardProjects = project.wizardProjects;
                        window.activeProjectId = window.wizardProjects[0].id;
                        let maxId = 1;
                        window.wizardProjects.forEach(p => { if(p.id > maxId) maxId = p.id; });
                        window.nextProjectId = maxId + 1;
                        window.loadProjectToForm(window.activeProjectId);
                    } else if (project.moduleWizard && project.moduleWizard.sections) {
                        // Eski formatı yeni formata çevir
                        window.wizardProjects = [{
                            id: 1,
                            name: "Eski Proje",
                            mode: "horizontal",
                            data: project.moduleWizard
                        }];
                        window.activeProjectId = 1;
                        window.nextProjectId = 2;
                        window.loadProjectToForm(1);
                    }
                    if (typeof window.renderWizardTabs === 'function') window.renderWizardTabs();
                    
                    // Otomatik parça oluşturma (eğer liste boşsa ve sihirbaz verisi varsa)
                    if ((!project.parts || project.parts.length === 0) && (project.wizardProjects && project.wizardProjects.length > 0 || project.moduleWizard)) {
                        if (typeof generateModuleParts === 'function') {
                            generateModuleParts();
                        }
                    }
                    
                    showToast('Proje dosyası başarıyla yüklendi!', 'success');
                } catch (err) {
                    console.error(err);
                    showToast('Geçersiz dosya formatı. Hata: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // --- HESAPLAMA MOTORU (GUILLOTINE PACKER) ---
    class GuillotinePacker {
        constructor(width, height) {
            this.binWidth = width;
            this.binHeight = height;
            this.freeRectangles = [{ x: 0, y: 0, w: width, h: height }];
            this.placedBlocks = [];
        }

        fit(blocks, strategy = 'max_side') {
            const remaining = blocks.filter(b => !b.fit);
            
            remaining.sort((a, b) => {
                const maxA = Math.max(a.cw, a.ch);
                const maxB = Math.max(b.cw, b.ch);
                const areaA = a.cw * a.ch;
                const areaB = b.cw * b.ch;
                const minA = Math.min(a.cw, a.ch);
                const minB = Math.min(b.cw, b.ch);
                
                if (strategy === 'area') {
                    return areaB - areaA || maxB - maxA;
                } else if (strategy === 'max_side') {
                    return maxB - maxA || areaB - areaA;
                } else if (strategy === 'min_side') {
                    return minB - minA || maxB - maxA;
                } else if (strategy === 'perimeter') {
                    return (b.cw + b.ch) - (a.cw + a.ch);
                } else if (strategy === 'mixed') {
                    // Yarı rastgele karma yaklaşım
                    return (areaB - areaA) * 0.7 + (Math.random() * 1000 - 500);
                }
                return maxB - maxA; // Default
            });

            remaining.forEach(block => {
                const node = this.findPosition(block);
                if (node) {
                    block.fit = node;
                    this.placedBlocks.push(block);
                    this.splitRect(node);
                }
            });
        }

        findPosition(block) {
            let bestNode = null;
            let bestScore = Number.MAX_VALUE;

            for (let i = 0; i < this.freeRectangles.length; i++) {
                const free = this.freeRectangles[i];

                // 1. Düz Yerleşim (CutWidth, CutHeight)
                if (block.cw <= free.w && block.ch <= free.h) {
                    const score = this.score(free, block.cw, block.ch);
                    if (score < bestScore) {
                        bestNode = { x: free.x, y: free.y, w: block.cw, h: block.ch, rotated: false, index: i };
                        bestScore = score;
                    }
                }

                // 2. Döndürerek Yerleşim (Eğer izin varsa)
                if (block.allowRotate && block.ch <= free.w && block.cw <= free.h) {
                    const score = this.score(free, block.ch, block.cw);
                    if (score < bestScore) {
                        bestNode = { x: free.x, y: free.y, w: block.ch, h: block.cw, rotated: true, index: i };
                        bestScore = score;
                    }
                }
            }
            return bestNode;
        }

        score(free, w, h) {
            // BSSF: Best Short Side Fit
            const sx = Math.abs(free.w - w);
            const sy = Math.abs(free.h - h);
            return Math.min(sx, sy);
        }

        splitRect(node) {
            const free = this.freeRectangles[node.index];
            this.freeRectangles.splice(node.index, 1);

            // Bölme (Split)
            const w = node.w;
            const h = node.h;

            // Kalan Alanlar
            // Öncelik: Kısa kenarı minimize et (Split along shorter axis)
            const rightW = free.w - w;
            const bottomH = free.h - h;

            if (rightW > bottomH) {
                if (rightW > 0) this.freeRectangles.push({ x: free.x + w, y: free.y, w: rightW, h: h });
                if (bottomH > 0) this.freeRectangles.push({ x: free.x, y: free.y + h, w: free.w, h: bottomH });
            } else {
                if (rightW > 0) this.freeRectangles.push({ x: free.x + w, y: free.y, w: rightW, h: free.h });
                if (bottomH > 0) this.freeRectangles.push({ x: free.x, y: free.y + h, w: w, h: bottomH });
            }
            // Çöp temizliği
            this.freeRectangles = this.freeRectangles.filter(r => r.w > 0 && r.h > 0);
        }
    }

    // --- ANA ÇALIŞTIRMA ---
    function runOptimization() {
        // 1. Ayarları Al
        let stockW = parseFloat(dom.inputs.stockW.value);
        let stockH = parseFloat(dom.inputs.stockH.value);
        
        // Çizimde uzun kenarın yatayda olması için ölçüleri çevir
        if (stockH > stockW) {
            let temp = stockW;
            stockW = stockH;
            stockH = temp;
        }
        
        const kerf = parseFloat(dom.inputs.kerf.value);
        const bandThick = parseFloat(dom.inputs.banding.value);
        const sheetPrice = parseFloat(dom.inputs.sheetPrice.value) || 0;
        const cutPrice = parseFloat(dom.inputs.cutPrice.value) || 0;
        const bandPrice = parseFloat(document.getElementById('bandPrice').value) || 0;

        if (!stockW || !stockH) { showToast('Lütfen önce Stok ölçülerini girin!', 'error'); return; }

        // 2. Parçaları Topla ve İşle (Bant Payı Düşme)
        let blocks = [];
        document.querySelectorAll('.part-row').forEach(row => {
            const name = row.querySelector('.p-name').value || '-';
            const finishW = parseFloat(row.querySelector('.p-w').value);
            const finishH = parseFloat(row.querySelector('.p-h').value);
            const q = parseInt(row.querySelector('.p-q').value);
            const allowRotate = row.querySelector('.rotate-chk').checked;

            // Bantlama Durumu: [Top, Right, Bottom, Left]
            const banding = [
                row.querySelector('.b-top').checked,
                row.querySelector('.b-right').checked,
                row.querySelector('.b-bottom').checked,
                row.querySelector('.b-left').checked
            ];

            if (finishW && finishH && q) {
                // KESİM ÖLÇÜSÜ HESABI:
                // Eğer sol tarafta bant varsa, parça kesilirken bant kalınlığı kadar kısa kesilmeli.
                // Kesim Genişliği = Bitmiş Genişlik - (Sol Bant + Sağ Bant)
                let cutW = finishW;
                if (banding[1]) cutW -= bandThick; // Sağ
                if (banding[3]) cutW -= bandThick; // Sol

                let cutH = finishH;
                if (banding[0]) cutH -= bandThick; // Üst
                if (banding[2]) cutH -= bandThick; // Alt

                for (let i = 0; i < q; i++) {
                    blocks.push({
                        name: name,
                        finishW: finishW,
                        finishH: finishH,
                        cw: cutW + kerf, // Algoritma için bıçak payı ekle
                        ch: cutH + kerf,
                        realCutW: cutW, // Çizim için net kesim ölçüsü
                        realCutH: cutH,
                        allowRotate: allowRotate,
                        banding: banding,
                        fit: null
                    });
                }
            }
        });

        if (blocks.length === 0) { showToast('Hesaplanacak geçerli bir parça bulunamadı. Lütfen En ve Boy ölçülerini girdiğinizden emin olun!', 'error'); return; }

        // Stratejiler
        const strategies = ['max_side', 'area', 'min_side', 'perimeter', 'mixed'];
        let results = [];

        strategies.forEach(strategy => {
            // Blokları kopyala (Her strateji temiz bloklarla başlasın)
            let currentBlocks = blocks.map(b => ({...b, fit: null}));
            let sheets = [];
            let safety = 0;

            while (currentBlocks.some(b => !b.fit) && safety < 500) {
                const packer = new GuillotinePacker(stockW, stockH);
                packer.fit(currentBlocks, strategy);

                if (packer.placedBlocks.length > 0) {
                    sheets.push(packer);
                } else {
                    break;
                }
                safety++;
            }
            
            // Başarı hesaplama (Plaka Sayısı düşük, fire oranı düşük olan kazanır)
            let usedArea = 0;
            sheets.forEach(s => {
                s.placedBlocks.forEach(b => { usedArea += b.cw * b.ch; });
            });
            let totalArea = sheets.length * stockW * stockH;
            let efficiency = totalArea > 0 ? (usedArea / totalArea) : 0;
            
            results.push({ strategy, sheets, blocks: currentBlocks, efficiency, sheetCount: sheets.length });
        });

        // En iyiden en kötüye sırala
        results.sort((a, b) => {
            if (a.sheetCount !== b.sheetCount) return a.sheetCount - b.sheetCount;
            return b.efficiency - a.efficiency;
        });

        // İlk 3 seçeneği al
        const topResults = results.slice(0, 3);
        
        // Butonları oluştur
        const optionsDiv = document.getElementById('layout-options');
        optionsDiv.style.display = 'flex';
        // Önce temizle, ilk label kalsın
        optionsDiv.innerHTML = '<strong style="display:flex; align-items:center; margin-right:10px; color:var(--dark);">MDF Kullanımı:</strong>';
        
        topResults.forEach((res, idx) => {
            const btn = document.createElement('button');
            btn.className = idx === 0 ? 'btn-primary' : 'btn-secondary';
            btn.style.margin = '0';
            btn.style.fontSize = '0.9rem';
            btn.innerHTML = idx === 0 ? `Seçenek 1 (En İyi)` : `Seçenek ${idx + 1}`;
            btn.title = `Plaka: ${res.sheetCount} | Verim: %${(res.efficiency * 100).toFixed(1)}`;
            
            btn.addEventListener('click', () => {
                // Diğer butonların rengini resetle
                Array.from(optionsDiv.querySelectorAll('button')).forEach(b => {
                    b.className = 'btn-secondary';
                });
                btn.className = 'btn-primary';
                
                // Seçilen sonucu yükle
                applyResult(res, stockW, stockH, sheetPrice, cutPrice, bandPrice, kerf, bandThick);
            });
            
            optionsDiv.appendChild(btn);
        });

        // Varsayılan olarak en iyiyi uygula
        applyResult(topResults[0], stockW, stockH, sheetPrice, cutPrice, bandPrice, kerf, bandThick);
    }
    
    function applyResult(result, stockW, stockH, sheetPrice, cutPrice, bandPrice, kerf, bandThick) {
        projectState.sheets = result.sheets;
        projectState.blocks = result.blocks;
        projectState.settings = { stockW, stockH, kerf, bandThick };

        calculateStats(result.sheets, stockW, stockH, sheetPrice, cutPrice, bandPrice);
        listOffcuts(result.sheets);

        dom.pdfBtn.style.display = 'inline-block';
        dom.labelBtn.style.display = 'inline-block';

        drawResults(stockW, stockH, result.sheets);
    }

    function calculateStats(sheets, sw, sh, sPrice, cPrice, bPrice) {
        let totalArea = sheets.length * sw * sh;
        let usedArea = 0;
        let totalCutLength = 0; // Metre tül
        let totalBandLength = 0; // Metre tül

        sheets.forEach(sheet => {
            sheet.placedBlocks.forEach(b => {
                usedArea += b.realCutW * b.realCutH;
                // Kesim uzunluğu (Çevre / 2 + ortak kenar mantığı karmaşık, basitçe çevre alalım)
                totalCutLength += (b.realCutW + b.realCutH) * 2;
                
                // Bant uzunluğu hesapla [Top, Right, Bottom, Left]
                if (b.banding[0]) totalBandLength += b.finishW;
                if (b.banding[1]) totalBandLength += b.finishH;
                if (b.banding[2]) totalBandLength += b.finishW;
                if (b.banding[3]) totalBandLength += b.finishH;
            });
        });

        const eff = totalArea > 0 ? (usedArea / totalArea) * 100 : 0;
        const totalCutMeter = totalCutLength / 1000; // mm -> m
        const totalBandMeter = totalBandLength / 1000; // mm -> m

        // Maliyet: (Plaka * Fiyat) + (Plaka * KesimÜcreti) + (Bant Metresi * Bant Fiyatı)
        const cost = (sheets.length * sPrice) + (sheets.length * cPrice) + (totalBandMeter * bPrice);

        dom.stats.sheets.innerText = sheets.length;
        dom.stats.efficiency.innerText = '%' + eff.toFixed(1);
        dom.stats.cost.innerText = cost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
        dom.stats.cutLen.innerText = totalCutMeter.toFixed(1) + ' m';
        
        const bandEl = document.getElementById('total-band-len');
        if(bandEl) bandEl.innerText = totalBandMeter.toFixed(1) + ' m';
    }

    function listOffcuts(sheets) {
        dom.offcutsList.innerHTML = '';
        let count = 0;
        sheets.forEach((sheet, idx) => {
            sheet.freeRectangles.forEach(r => {
                // Sadece 300x300 mm'den büyükleri göster (Filtre)
                if (r.w > 300 && r.h > 300) {
                    const tag = document.createElement('div');
                    tag.className = 'offcut-tag';
                    tag.innerText = `P${idx + 1}: ${Math.round(r.w)}x${Math.round(r.h)}`;
                    dom.offcutsList.appendChild(tag);
                    count++;
                }
            });
        });
        if (count === 0) dom.offcutsList.innerHTML = '<span>Kullanılabilir büyük parça yok.</span>';
    }

    // --- ÇİZİM ---
    function drawResults(stockW, stockH, sheets) {
        const GAP = 40;
        const wrapper = document.querySelector('.canvas-wrapper');
        const availH = wrapper.clientHeight - 60;

        let scale = availH / stockH;
        if (scale < 0.15) scale = 0.15; // Min zoom

        const totalW = (stockW * scale * sheets.length) + (GAP * sheets.length) + 100;
        dom.canvas.width = totalW;
        dom.canvas.height = (stockH * scale) + 80;

        const ctx = dom.ctx;
        ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);

        sheets.forEach((sheet, i) => {
            const startX = i * (stockW * scale + GAP) + 20;
            const startY = 50;

            // Plaka Başlık
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 14px "Outfit", Arial';
            ctx.fillText(`${i + 1}. Plaka (${stockW}x${stockH})`, startX, 30);

            // Plaka
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(startX, startY, stockW * scale, stockH * scale);
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.strokeRect(startX, startY, stockW * scale, stockH * scale);

            // Parçalar
            sheet.placedBlocks.forEach(b => {
                const x = startX + (b.fit.x * scale);
                const y = startY + (b.fit.y * scale);

                // Döndürülmüşse boyutları çevir (Çizim için)
                let dw = (b.fit.rotated ? b.realCutH : b.realCutW) * scale;
                let dh = (b.fit.rotated ? b.realCutW : b.realCutH) * scale;

                // Renk (Adına veya boyutuna göre)
                ctx.fillStyle = getColor(b.finishW, b.finishH);
                ctx.fillRect(x, y, dw, dh);
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, dw, dh);

                // Bantlama Göstergesi (Kırmızı Çizgiler)
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#dc2626'; // Kırmızı bant rengi
                ctx.beginPath();

                // Bant sıralaması [Top, Right, Bottom, Left] ama rotated ise yönler değişir!
                let bands = [...b.banding];
                if (b.fit.rotated) {
                    // 90 derece dönüşte: Top->Right, Right->Bottom, Bottom->Left, Left->Top
                    bands = [b.banding[3], b.banding[0], b.banding[1], b.banding[2]];
                }

                if (bands[0]) { ctx.moveTo(x, y); ctx.lineTo(x + dw, y); } // Top
                if (bands[1]) { ctx.moveTo(x + dw, y); ctx.lineTo(x + dw, y + dh); } // Right
                if (bands[2]) { ctx.moveTo(x, y + dh); ctx.lineTo(x + dw, y + dh); } // Bottom
                if (bands[3]) { ctx.moveTo(x, y); ctx.lineTo(x, y + dh); } // Left
                ctx.stroke();

                // Yazı
                if (dw > 4 && dh > 4) {
                    const textName = b.name; // İsim artık kısaltılmıyor
                    const dimText = b.fit.rotated ? `${b.finishH}x${b.finishW}(D)` : `${b.finishH}x${b.finishW}`;
                    const fullText = `${textName} ${dimText}`;

                    ctx.save();
                    ctx.translate(x + dw / 2, y + dh / 2);
                    
                    let maxLen = dw;
                    let maxThick = dh;
                    
                    // Dikey dikdörtgense yazıyı yatay olacak şekilde döndür
                    if (dh > dw * 1.2) {
                        ctx.rotate(-Math.PI / 2);
                        maxLen = dh;
                        maxThick = dw;
                    }

                    ctx.fillStyle = '#0f172a';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // Parça 2 satır için çok ince ise (örn. 16px altı) tek satır çiz
                    if (maxThick < 16) {
                        let fSize = 10;
                        ctx.font = `${fSize}px "Inter", Arial`;
                        while (ctx.measureText(fullText).width > maxLen - 2 && fSize > 4) {
                            fSize -= 0.5;
                            ctx.font = `${fSize}px "Inter", Arial`;
                        }
                        if (fSize > maxThick - 1) fSize = Math.max(3, maxThick - 1);
                        ctx.font = `${fSize}px "Inter", Arial`;
                        ctx.fillText(fullText, 0, 0);
                    } else {
                        // İki satır çizim
                        let fSize1 = 10;
                        ctx.font = `bold ${fSize1}px "Inter", Arial`;
                        while (ctx.measureText(textName).width > maxLen - 2 && fSize1 > 4) {
                            fSize1 -= 0.5;
                            ctx.font = `bold ${fSize1}px "Inter", Arial`;
                        }
                        let fSize2 = 10;
                        ctx.font = `${fSize2}px "Inter", Arial`;
                        while (ctx.measureText(dimText).width > maxLen - 2 && fSize2 > 4) {
                            fSize2 -= 0.5;
                            ctx.font = `${fSize2}px "Inter", Arial`;
                        }
                        
                        let totalH = fSize1 + fSize2 + 2;
                        if (totalH > maxThick) {
                             let scaleF = (maxThick - 2) / totalH;
                             fSize1 = Math.max(3, fSize1 * scaleF);
                             fSize2 = Math.max(3, fSize2 * scaleF);
                        }
                        
                        ctx.font = `bold ${fSize1}px "Inter", Arial`;
                        ctx.fillText(textName, 0, -fSize1/2);
                        ctx.font = `${fSize2}px "Inter", Arial`;
                        ctx.fillText(dimText, 0, fSize2/2 + 2);
                    }
                    ctx.restore();
                }
            });
        });
    }

    let colorIndex = 0;
    // Renklerin birbirine karışmaması için zıt renk tonları (Gökkuşağı dağılımı)
    const distinctHues = [0, 200, 60, 280, 120, 30, 240, 300, 160, 330, 90, 210];
    
    function getColor(w, h) {
        const key = Math.min(w, h) + 'x' + Math.max(w, h);
        if (!colorMap[key]) {
            const hue = distinctHues[colorIndex % distinctHues.length];
            colorIndex++;
            // Renkleri ayırt edilebilir ama yazının okunmasını engellemeyecek softlukta (pastelleştirilmiş) yap
            colorMap[key] = `hsl(${hue}, 75%, 82%)`;
        }
        return colorMap[key];
    }

    // --- PDF RAPOR ---
    function generatePDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
        
        const sheets = projectState.sheets;
        const sw = projectState.settings.stockW;
        const sh = projectState.settings.stockH;

        sheets.forEach((sheet, i) => {
            if (i > 0) doc.addPage();

            // Başlık (Canvas kullanarak Türkçe ve Outfit fontu)
            const titleCan = document.createElement('canvas');
            titleCan.width = 800;
            titleCan.height = 50;
            const titleCtx = titleCan.getContext('2d');
            titleCtx.fillStyle = 'black';
            titleCtx.font = 'bold 36px Outfit, sans-serif';
            titleCtx.textBaseline = 'top';
            titleCtx.fillText(`Kesim Planı - Plaka ${i + 1}`, 0, 0);
            doc.addImage(titleCan.toDataURL('image/png'), 'PNG', 10, 8, 100, 6.25);

            // Geçici Canvas (Yüksek Kalite)
            const tCan = document.createElement('canvas');
            const scale = 0.8; // Yüksek çözünürlük için scale artırıldı
            tCan.width = sw * scale;
            tCan.height = sh * scale;
            const tCtx = tCan.getContext('2d');

            // Zemin
            tCtx.fillStyle = 'white'; tCtx.fillRect(0, 0, tCan.width, tCan.height);
            tCtx.strokeStyle = 'black'; tCtx.lineWidth = 4; tCtx.strokeRect(0, 0, tCan.width, tCan.height);

            sheet.placedBlocks.forEach(b => {
                const x = b.fit.x * scale;
                const y = b.fit.y * scale;
                const w = (b.fit.rotated ? b.realCutH : b.realCutW) * scale;
                const h = (b.fit.rotated ? b.realCutW : b.realCutH) * scale;

                // Rengi getColor fonksiyonundan çek
                tCtx.fillStyle = getColor(b.finishW, b.finishH);
                tCtx.fillRect(x, y, w, h);
                tCtx.strokeStyle = '#1e293b';
                tCtx.lineWidth = 2;
                tCtx.strokeRect(x, y, w, h);

                // Bantlama Göstergesi (Kırmızı Çizgiler)
                tCtx.lineWidth = 4;
                tCtx.strokeStyle = '#dc2626'; // Kırmızı
                tCtx.beginPath();
                let bandsForDraw = [...b.banding];
                if (b.fit.rotated) {
                    // 90 derece dönüş: Top->Right, Right->Bottom, Bottom->Left, Left->Top
                    bandsForDraw = [b.banding[3], b.banding[0], b.banding[1], b.banding[2]];
                }
                if (bandsForDraw[0]) { tCtx.moveTo(x, y); tCtx.lineTo(x + w, y); } // Top
                if (bandsForDraw[1]) { tCtx.moveTo(x + w, y); tCtx.lineTo(x + w, y + h); } // Right
                if (bandsForDraw[2]) { tCtx.moveTo(x, y + h); tCtx.lineTo(x + w, y + h); } // Bottom
                if (bandsForDraw[3]) { tCtx.moveTo(x, y); tCtx.lineTo(x, y + h); } // Left
                tCtx.stroke();

                // İsim ve Ölçüler
                tCtx.fillStyle = '#0f172a';
                tCtx.textAlign = 'center';
                tCtx.textBaseline = 'middle';
                
                if (w > 4 && h > 4) {
                    const textName = b.name;
                    const cutBoy = b.fit.rotated ? b.finishW : b.finishH;
                    const cutEn = b.fit.rotated ? b.finishH : b.finishW;
                    const dimText = b.fit.rotated ? `${cutBoy}x${cutEn}(D)` : `${cutBoy}x${cutEn}`;
                    const fullText = `${textName} ${dimText}`;
                    
                    tCtx.save();
                    tCtx.translate(x + w / 2, y + h / 2);
                    
                    let maxLen = w;
                    let maxThick = h;
                    
                    if (h > w * 1.2) {
                        tCtx.rotate(-Math.PI / 2);
                        maxLen = h;
                        maxThick = w;
                    }
                    
                    if (maxThick < 24) { // PDF çözünürlüğü yüksek olduğu için baraj daha büyük
                        let fSize = 20;
                        tCtx.font = `bold ${fSize}px "Inter", sans-serif`;
                        while (tCtx.measureText(fullText).width > maxLen - 4 && fSize > 6) {
                            fSize -= 1;
                            tCtx.font = `bold ${fSize}px "Inter", sans-serif`;
                        }
                        if (fSize > maxThick - 2) fSize = Math.max(4, maxThick - 2);
                        tCtx.font = `bold ${fSize}px "Inter", sans-serif`;
                        tCtx.fillText(fullText, 0, 0);
                    } else {
                        let fSize1 = 24;
                        tCtx.font = `bold ${fSize1}px "Inter", sans-serif`;
                        while (tCtx.measureText(textName).width > maxLen - 4 && fSize1 > 6) {
                            fSize1 -= 1;
                            tCtx.font = `bold ${fSize1}px "Inter", sans-serif`;
                        }
                        
                        let fSize2 = 20;
                        tCtx.font = `${fSize2}px "Inter", sans-serif`;
                        while (tCtx.measureText(dimText).width > maxLen - 4 && fSize2 > 6) {
                            fSize2 -= 1;
                            tCtx.font = `${fSize2}px "Inter", sans-serif`;
                        }
                        
                        let totalH = fSize1 + fSize2 + 4;
                        if (totalH > maxThick) {
                             let scaleF = (maxThick - 4) / totalH;
                             fSize1 = Math.max(5, fSize1 * scaleF);
                             fSize2 = Math.max(5, fSize2 * scaleF);
                        }
                        
                        tCtx.font = `bold ${fSize1}px "Inter", sans-serif`;
                        tCtx.fillText(textName, 0, -fSize1/2);
                        tCtx.font = `${fSize2}px "Inter", sans-serif`;
                        tCtx.fillText(dimText, 0, fSize2/2 + 2);
                    }
                    tCtx.restore();
                }
            });

            const imgData = tCan.toDataURL('image/jpeg', 0.9);
            
            // PDF'e tam sayfaya orantılı sığdırma
            const maxWidth = 277; // A4 Genişlik - kenar boşlukları
            const maxHeight = 190; // A4 Yükseklik - başlık ve boşluklar
            let drawW = maxWidth;
            let drawH = (maxWidth / sw) * sh;
            
            // Eğer hesaplanan yükseklik, sayfadan taşıyorsa yüksekliği kısıtla
            if (drawH > maxHeight) {
                drawH = maxHeight;
                drawW = (maxHeight / sh) * sw;
            }
            
            // Ortalama
            const xOffset = 10 + (maxWidth - drawW) / 2;
            doc.addImage(imgData, 'JPEG', xOffset, 15, drawW, drawH);
        });

        doc.save('MdfKesim_Plan.pdf');
    }

    // --- ETİKET YAZDIR (STICKER) ---
    function generateLabels() {
        const { jsPDF } = window.jspdf;
        // A4 Kağıda 2 sütun x 4 satır etiket (105mm x 74mm etiket) -> Toplam 8 Etiket
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        let col = 0;
        let row = 0;
        const w = 105;
        const h = 74;

        // Düzleştirilmiş parça listesi
        let flatParts = [];
        projectState.sheets.forEach((sheet, sheetIdx) => {
            sheet.placedBlocks.forEach(b => {
                flatParts.push({ ...b, sheetId: sheetIdx + 1 });
            });
        });

        flatParts.forEach((part, i) => {
            if (i > 0 && i % 8 === 0) {
                doc.addPage();
                col = 0; row = 0;
            }

            const x = col * w;
            const y = row * h;

            // Canvas kullanarak etiketi yüksek çözünürlükte çizme (Türkçe ve Font desteği için)
            const sf = 4;
            const cW = w * sf;
            const cH = h * sf;
            const can = document.createElement('canvas');
            can.width = cW;
            can.height = cH;
            const ctx = can.getContext('2d');

            // Arkaplan ve Çerçeve
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, cW, cH);
            ctx.strokeStyle = '#c8c8c8';
            ctx.lineWidth = 4;
            ctx.strokeRect(8, 8, cW - 16, cH - 16);

            // Başlık (Parça Adı)
            ctx.fillStyle = 'black';
            ctx.font = 'bold 20px Outfit, sans-serif';
            ctx.textBaseline = 'top';
            let nameToPrint = part.name || "İsimsiz Parça";
            
            // Satır kırma (basit kelime kırma mantığı)
            let words = nameToPrint.split(' ');
            let line = '';
            let lines = [];
            for (let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                let metrics = ctx.measureText(testLine);
                if (metrics.width > cW - 40 && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
            
            // Max 2 satır
            if (lines.length > 2) {
                lines = lines.slice(0, 2);
                lines[1] = lines[1].replace(/\s+$/, '') + '...';
            }
            
            lines.forEach((l, idx) => {
                ctx.fillText(l.trim(), 20, 20 + (idx * 26));
            });

            let yOffset = lines.length > 1 ? 100 : 75;

            // Ölçüler
            ctx.font = 'bold 44px Outfit, sans-serif';
            const cutBoy = part.finishH;
            const cutEn = part.finishW;
            ctx.fillText(`${cutBoy} x ${cutEn}`, 20, yOffset);

            // Plaka
            ctx.font = 'normal 18px Outfit, sans-serif';
            ctx.fillText(`Plaka: ${part.sheetId}`, 20, yOffset + 65);

            // Bant Bilgisi
            let bands = [];
            if (part.banding[0]) bands.push('ÜST');
            if (part.banding[1]) bands.push('SAĞ');
            if (part.banding[2]) bands.push('ALT');
            if (part.banding[3]) bands.push('SOL');

            if (bands.length > 0) {
                ctx.fillStyle = '#c80000';
                ctx.font = 'normal 16px Outfit, sans-serif';
                ctx.fillText(`BANT: ${bands.join(' - ')}`, 20, yOffset + 95);
                ctx.fillStyle = 'black';
            }

            // QR Kod Yeri (Simülasyon - Kutu)
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(cW - 90, cH - 90, 70, 70);
            ctx.font = 'normal 14px Outfit, sans-serif';
            ctx.fillText('QR', cW - 65, cH - 55);

            // Canvas'ı resim olarak PDF'e ekle
            doc.addImage(can.toDataURL('image/jpeg', 1.0), 'JPEG', x, y, w, h);

            // Koordinat artır
            col++;
            if (col > 1) { col = 0; row++; }
        });

        window.open(doc.output('bloburl'), '_blank');
    }

    // --- TOAST BİLDİRİM SİSTEMİ ---
    window.showToast = function(msg, type='success') {
        let toast = document.createElement('div');
        toast.className = `toast-msg toast-${type}`;
        toast.innerHTML = msg;
        document.body.appendChild(toast);
        
        setTimeout(() => { toast.classList.add('show'); }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // --- CUSTOM CONFIRM MODAL ---
    window.showCustomConfirm = function(msg, onConfirm) {
        let overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0'; overlay.style.left = '0'; overlay.style.width = '100%'; overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '99999';
        overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';
        
        let modal = document.createElement('div');
        modal.style.backgroundColor = '#fff';
        modal.style.padding = '25px';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
        modal.style.textAlign = 'center';
        modal.style.minWidth = '300px';
        modal.style.animation = 'fadeInScale 0.3s ease-out'; // Sakin animasyon

        let text = document.createElement('p');
        text.innerHTML = msg;
        text.style.marginBottom = '20px';
        text.style.fontSize = '1.1rem';
        text.style.color = '#333';
        
        let btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex'; btnContainer.style.justifyContent = 'center'; btnContainer.style.gap = '15px';
        
        let btnCancel = document.createElement('button');
        btnCancel.className = 'btn-secondary';
        btnCancel.style.width = 'auto'; btnCancel.style.margin = '0';
        btnCancel.innerHTML = 'İptal';
        
        let btnOk = document.createElement('button');
        btnOk.className = 'btn-primary';
        btnOk.style.width = 'auto'; btnOk.style.margin = '0'; btnOk.style.backgroundColor = '#d32f2f'; // Kırmızımsı
        btnOk.innerHTML = 'Evet, Temizle';
        
        btnCancel.onclick = () => overlay.remove();
        btnOk.onclick = () => { overlay.remove(); if (onConfirm) onConfirm(); };
        
        btnContainer.appendChild(btnCancel);
        btnContainer.appendChild(btnOk);
        
        modal.appendChild(text);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }
    
    window.showCustomAlert = function(msg, type = 'info') {
        let overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0'; overlay.style.left = '0'; overlay.style.width = '100%'; overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '99999';
        overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';
        
        let modal = document.createElement('div');
        modal.style.backgroundColor = '#fff';
        modal.style.padding = '25px';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
        modal.style.textAlign = 'center';
        modal.style.minWidth = '300px';
        modal.style.animation = 'fadeInScale 0.3s ease-out'; // Sakin animasyon

        let icon = document.createElement('div');
        icon.style.fontSize = '40px';
        icon.style.marginBottom = '15px';
        if (type === 'success') {
            icon.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i>';
        } else if (type === 'error') {
            icon.innerHTML = '<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>';
        } else {
            icon.innerHTML = '<i class="fas fa-info-circle" style="color: #3b82f6;"></i>';
        }
        
        let text = document.createElement('p');
        text.innerHTML = msg;
        text.style.marginBottom = '20px';
        text.style.fontSize = '1.1rem';
        text.style.color = '#333';
        
        let btnOk = document.createElement('button');
        btnOk.className = 'btn-primary';
        btnOk.style.width = '100%';
        btnOk.innerHTML = 'Tamam';
        
        btnOk.onclick = () => overlay.remove();
        
        modal.appendChild(icon);
        modal.appendChild(text);
        modal.appendChild(btnOk);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    };
    
    // --- CUSTOM PROMPT MODAL ---
    window.showCustomPrompt = function(msg, defaultVal) {
        return new Promise((resolve) => {
            let overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0'; overlay.style.left = '0'; overlay.style.width = '100%'; overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
            overlay.style.zIndex = '99999';
            overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';
            
            let modal = document.createElement('div');
            modal.style.backgroundColor = '#fff';
            modal.style.padding = '25px';
            modal.style.borderRadius = '8px';
            modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
            modal.style.textAlign = 'center';
            modal.style.minWidth = '300px';
            
            let text = document.createElement('p');
            text.innerHTML = msg;
            text.style.marginBottom = '15px';
            text.style.fontSize = '1.1rem';
            text.style.color = '#333';
            
            let input = document.createElement('input');
            input.type = 'text';
            input.value = defaultVal || '';
            input.style.width = '100%';
            input.style.padding = '10px';
            input.style.marginBottom = '20px';
            input.style.border = '1px solid #ccc';
            input.style.borderRadius = '4px';
            input.style.fontSize = '1rem';
            
            let btnContainer = document.createElement('div');
            btnContainer.style.display = 'flex'; btnContainer.style.justifyContent = 'center'; btnContainer.style.gap = '15px';
            
            let btnCancel = document.createElement('button');
            btnCancel.className = 'btn-secondary';
            btnCancel.style.width = 'auto'; btnCancel.style.margin = '0';
            btnCancel.innerHTML = 'İptal';
            
            let btnOk = document.createElement('button');
            btnOk.className = 'btn-primary';
            btnOk.style.width = 'auto'; btnOk.style.margin = '0'; 
            btnOk.innerHTML = 'Kaydet';
            
            btnCancel.onclick = () => { overlay.remove(); resolve(null); };
            btnOk.onclick = () => { overlay.remove(); resolve(input.value); };
            
            input.onkeyup = (e) => { if (e.key === 'Enter') btnOk.click(); };
            
            btnContainer.appendChild(btnCancel);
            btnContainer.appendChild(btnOk);
            
            modal.appendChild(text);
            modal.appendChild(input);
            modal.appendChild(btnContainer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            input.focus();
            input.select();
        });
    }

    // --- MODÜLER SİHİRBAZ: BÖLÜM (SECTION) MANTIĞI ---
    let sectionCount = 0;
    
    window.resetSectionCount = function() {
        sectionCount = 0;
    }

    function updateSectionLabels() {
        const isVert = window.moduleWizardMode === 'vertical';
        const labelName = isVert ? 'Modül' : 'Bölüm';
        const cards = document.querySelectorAll('.section-card');
        cards.forEach((card, index) => {
            const label = card.querySelector('.section-label');
            if (label) {
                label.innerHTML = `<i class="fas fa-chevron-down accordion-icon" style="margin-right: 8px; transition: transform 0.3s ease;"></i>${index + 1}. ${labelName}`;
            }
        });
    }

    window.updateShelfGapInfo = function() {
        const thick = parseFloat(document.getElementById('mod-thick').value) || 18;
        const cards = document.querySelectorAll('.section-card');
        
        cards.forEach((card, index) => {
            const h = parseFloat(card.querySelector('.sec-h').value) || 0;
            let netH;
            if (index === 0) {
                netH = h - (2 * thick);
            } else {
                netH = h - thick;
            }
            
            card.querySelectorAll('.column-card').forEach(col => {
                const shelfQty = parseInt(col.querySelector('.col-shelf-qty').value) || 0;
                const infoDiv = col.querySelector('.shelf-gap-info');
                
                if (!infoDiv) return;
                if (shelfQty === 0) {
                    infoDiv.textContent = '';
                    return;
                }
                
                const totalShelfThick = shelfQty * thick;
                const netEmptySpace = netH - totalShelfThick;
                const defaultGap = netEmptySpace / (shelfQty + 1);
                
                const customShelves = col.querySelector('.col-custom-shelves').value;
                if (customShelves.trim() !== "") {
                    infoDiv.textContent = 'Özel raf aralığı aktif.';
                } else {
                    infoDiv.textContent = `Net Raf Aralığı: ${defaultGap.toFixed(1)} mm`;
                }
            });
        });
    }
    
    // Ana form ölçüleri değiştiğinde de raf boşluklarını güncelle
    window.toggleSectionAccordion = function(activeSectionId) {
        const allBodies = document.querySelectorAll('.section-body');
        const allIcons = document.querySelectorAll('.accordion-icon');
        
        allBodies.forEach(body => {
            if (body.id === `section-body-${activeSectionId}`) {
                // Tıklananı aç (veya zaten açıksa kapat)
                const isCurrentlyOpen = body.style.display !== 'none';
                body.style.display = isCurrentlyOpen ? 'none' : 'block';
                
                // İkonu döndür
                const icon = body.parentElement.querySelector('.accordion-icon');
                if (icon) {
                    icon.style.transform = isCurrentlyOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
                }
            } else {
                // Diğerlerini kapat
                body.style.display = 'none';
                const icon = body.parentElement.querySelector('.accordion-icon');
                if (icon) {
                    icon.style.transform = 'rotate(-90deg)'; // Kapalı konumu (sağa dönük ok)
                }
            }
        });
    };
    
    document.getElementById('mod-thick')?.addEventListener('input', () => {
        window.updateShelfGapInfo();
        if (typeof window.update3DModel === 'function') window.update3DModel();
    });
    

    // --- PROJE SEKME (TAB) YÖNETİMİ ---
    window.saveCurrentProjectToState = function() {
        const proj = window.wizardProjects.find(p => p.id === window.activeProjectId);
        if (!proj) return;
        
        proj.name = document.getElementById('mod-cabinet-name').value || "Dolap " + proj.id;
        proj.mode = window.moduleWizardMode;
        
        const sectionsData = Array.from(document.querySelectorAll('.section-card')).map(card => {
            const rawCols = parseInt(card.querySelector('.sec-cols-count').value);
            return {
                h: parseFloat(card.querySelector('.sec-h').value) || 0,
                customD: card.querySelector('.sec-custom-d') ? card.querySelector('.sec-custom-d').value : "",
                colsCount: isNaN(rawCols) || rawCols < 1 ? 1 : rawCols,
                columns: Array.from(card.querySelectorAll('.column-card')).map(col => {
                    const rawShelf = parseInt(col.querySelector('.col-shelf-qty').value);
                    const rawDoor = parseInt(col.querySelector('.col-door-qty').value);
                    const rawStack = parseInt(col.querySelector('.col-stack-qty').value);
                    return {
                        shelfQty: isNaN(rawShelf) ? 0 : rawShelf,
                        doorQty: isNaN(rawDoor) ? 0 : rawDoor,
                        stackQty: isNaN(rawStack) ? 0 : rawStack,
                        railQty: col.querySelector('.col-rail-qty') ? (parseInt(col.querySelector('.col-rail-qty').value) || 0) : 0,
                        drawerQty: col.querySelector('.col-drawer-qty') ? (parseInt(col.querySelector('.col-drawer-qty').value) || 0) : 0,
                        drawerStart: col.querySelector('.col-drawer-start') ? col.querySelector('.col-drawer-start').value : "1",
                        baseType: col.querySelector('.col-base-type') ? col.querySelector('.col-base-type').value : "standart",
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
        
        proj.data = {
            w: document.getElementById('mod-w').value,
            h: document.getElementById('mod-h').value,
            d: document.getElementById('mod-d').value,
            thick: document.getElementById('mod-thick').value,
            baseType: document.getElementById('mod-base-type').value,
            baseH: document.getElementById('mod-base-h').value,
            noBottomBoard: document.getElementById('mod-no-bottom') ? document.getElementById('mod-no-bottom').checked : false,
            addCrown: document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true,
            sections: sectionsData
        };
    }

    window.loadProjectToForm = function(id) {
        const proj = window.wizardProjects.find(p => p.id === id);
        if (!proj) return;
        
        document.getElementById('mod-cabinet-name').value = proj.name;
        
        if (proj.mode && proj.mode !== window.moduleWizardMode) {
            window.moduleWizardMode = proj.mode;
            if (typeof updateWizardModeUI === 'function') updateWizardModeUI();
        }
        
        if (proj.data) {
            document.getElementById('mod-w').value = proj.data.w || '';
            document.getElementById('mod-h').value = proj.data.h || '';
            document.getElementById('mod-d').value = proj.data.d || '';
            document.getElementById('mod-thick').value = proj.data.thick || 18;
            document.getElementById('mod-base-type').value = proj.data.baseType || 'normal';
            document.getElementById('mod-base-h').value = proj.data.baseH || 0;
            if (document.getElementById('mod-no-bottom')) document.getElementById('mod-no-bottom').checked = proj.data.noBottomBoard || false;
            if(document.getElementById('mod-add-crown')) document.getElementById('mod-add-crown').checked = proj.data.addCrown !== false;
            
            const container = document.getElementById('sections-container');
            if (container) {
                container.innerHTML = '';
                if (typeof window.resetSectionCount === 'function') window.resetSectionCount();
                
                if (proj.data.sections && proj.data.sections.length > 0) {
                    proj.data.sections.forEach(sec => {
                        window.addSection();
                        const lastCard = container.lastElementChild;
                        if (lastCard) {
                            lastCard.querySelector('.sec-h').value = sec.h || '';
                            if (lastCard.querySelector('.sec-custom-d')) lastCard.querySelector('.sec-custom-d').value = sec.customD || '';
                            const colInput = lastCard.querySelector('.sec-cols-count');
                            colInput.value = sec.colsCount || 1;
                            colInput.dispatchEvent(new Event('input')); // Sütunları DOM'a bas
                            
                            const colCards = lastCard.querySelectorAll('.column-card');
                            if (sec.columns) {
                                sec.columns.forEach((colData, idx) => {
                                    if (idx < colCards.length) {
                                        const cCard = colCards[idx];
                                        cCard.querySelector('.col-shelf-qty').value = colData.shelfQty || 0;
                                        cCard.querySelector('.col-door-qty').value = colData.doorQty || 0;
                                        cCard.querySelector('.col-stack-qty').value = colData.stackQty || 0;
                                        if (cCard.querySelector('.col-drawer-qty')) cCard.querySelector('.col-drawer-qty').value = colData.drawerQty || 0;
                                        if (cCard.querySelector('.col-rail-qty')) cCard.querySelector('.col-rail-qty').value = colData.railQty || 0;
                                        if (cCard.querySelector('.col-drawer-start')) cCard.querySelector('.col-drawer-start').value = colData.drawerStart || "1";
                                        if (cCard.querySelector('.col-base-type')) cCard.querySelector('.col-base-type').value = colData.baseType || "standart";
                                        if (cCard.querySelector('.col-gap')) cCard.querySelector('.col-gap').value = colData.gap || 20;
                                        if (cCard.querySelector('.col-custom-w')) cCard.querySelector('.col-custom-w').value = colData.customW || "";
                                        if (cCard.querySelector('.col-custom-drawers')) cCard.querySelector('.col-custom-drawers').value = colData.customDrawers || "";
                                        if (cCard.querySelector('.col-custom-shelves')) cCard.querySelector('.col-custom-shelves').value = colData.customShelves || "";
                                        if (cCard.querySelector('.col-door-shelf-dist')) cCard.querySelector('.col-door-shelf-dist').value = colData.doorShelfDist || "";
                                        if (cCard.querySelector('.col-door-w-dist')) cCard.querySelector('.col-door-w-dist').value = colData.doorWDist || "";
                                    }
                                });
                            } else if (colCards[0]) {
                                // Eski Versiyon (v20) Uyumluluğu
                                colCards[0].querySelector('.col-shelf-qty').value = sec.shelfQty || 0;
                                colCards[0].querySelector('.col-door-qty').value = sec.doorQty || 0;
                                colCards[0].querySelector('.col-stack-qty').value = 1;
                                if (colCards[0].querySelector('.col-gap')) colCards[0].querySelector('.col-gap').value = sec.gap || 20;
                                if (colCards[0].querySelector('.col-custom-shelves')) colCards[0].querySelector('.col-custom-shelves').value = sec.customShelves || "";
                            }
                        }
                    });
                } else {
                    window.addSection();
                }
            }
        } else {
            // Veri yoksa temizle
            document.getElementById('mod-w').value = '';
            document.getElementById('mod-h').value = '';
            document.getElementById('mod-d').value = '';
            document.getElementById('sections-container').innerHTML = '';
            window.resetSectionCount();
            window.addSection();
        }
        
        window.updateShelfGapInfo();
        if (typeof window.update3DModel === 'function') window.update3DModel();
    }

    window.renderWizardTabs = function() {
        const container = document.getElementById('wizard-tabs-container');
        if (!container) return;
        
        container.innerHTML = '';
        window.wizardProjects.forEach(proj => {
            const isActive = proj.id === window.activeProjectId;
            const tabBtn = document.createElement('button');
            tabBtn.className = isActive ? 'btn-primary' : 'btn-secondary';
            tabBtn.style.padding = '4px 12px';
            tabBtn.style.margin = '0';
            tabBtn.style.fontSize = '0.9rem';
            tabBtn.style.whiteSpace = 'nowrap';
            if(!isActive) {
                tabBtn.style.background = '#e2e8f0';
                tabBtn.style.border = 'none';
                tabBtn.style.color = '#475569';
            }
            
            tabBtn.innerHTML = `<span>${proj.name}</span> <i class="fas fa-times delete-tab-btn" style="margin-left: 5px; cursor:pointer; opacity: 0.6;" data-id="${proj.id}"></i>`;
            
            tabBtn.onclick = (e) => {
                if (e.target.classList.contains('delete-tab-btn')) return;
                if (proj.id === window.activeProjectId) return;
                window.saveCurrentProjectToState();
                window.activeProjectId = proj.id;
                window.loadProjectToForm(proj.id);
                window.renderWizardTabs();
            };
            
            const delBtn = tabBtn.querySelector('.delete-tab-btn');
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (window.wizardProjects.length === 1) {
                    showToast('En az 1 dolap projesi olmak zorundadır.', 'error');
                    return;
                }
                showCustomConfirm('Bu dolabı projeden silmek istediğinize emin misiniz?', () => {
                    window.wizardProjects = window.wizardProjects.filter(p => p.id !== proj.id);
                    if (window.activeProjectId === proj.id) {
                        window.activeProjectId = window.wizardProjects[0].id;
                        window.loadProjectToForm(window.activeProjectId);
                    }
                    window.renderWizardTabs();
                });
            };
            
            container.appendChild(tabBtn);
        });
        
        const addTabBtn = document.createElement('button');
        addTabBtn.className = 'btn-secondary';
        addTabBtn.style.padding = '4px 8px';
        addTabBtn.style.margin = '0';
        addTabBtn.style.background = 'transparent';
        addTabBtn.style.border = '1px dashed var(--primary)';
        addTabBtn.style.color = 'var(--primary)';
        addTabBtn.innerHTML = '<i class="fas fa-plus"></i> Yeni';
        addTabBtn.onclick = () => {
            window.saveCurrentProjectToState();
            const newId = window.nextProjectId++;
            window.wizardProjects.push({ id: newId, name: 'Dolap ' + newId, data: null, mode: window.moduleWizardMode });
            window.activeProjectId = newId;
            window.loadProjectToForm(newId);
            window.renderWizardTabs();
        };
        container.appendChild(addTabBtn);
    }
    
    // Dolap adı değişince sekmeyi hemen güncelle
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('mod-cabinet-name')?.addEventListener('input', (e) => {
            const proj = window.wizardProjects.find(p => p.id === window.activeProjectId);
            if (proj) {
                proj.name = e.target.value || "Dolap " + proj.id;
                window.renderWizardTabs();
            }
        });
    });

    // window.addSection fonksiyonunun üzerine yerleştiriyoruz...

    window.addSection = function() {
        sectionCount++;
        const container = document.getElementById('sections-container');
        if (!container) return;
        const sectionId = sectionCount;
        
        const isVert = window.moduleWizardMode === 'vertical';
        
        // --- OTOMATİK KALAN BOŞLUK HESAPLAMA ---
        let suggestedValue = '';
        if (isVert) {
            const tempOverallW = parseFloat(document.getElementById('mod-w')?.value) || 0;
            const tempThick = parseFloat(document.getElementById('mod-thick')?.value) || 18;
            let tempInnerW = tempOverallW - (2 * tempThick);
            
            let totalSecW = 0;
            document.querySelectorAll('.section-card').forEach(card => {
                totalSecW += parseFloat(card.querySelector('.sec-h').value) || 0;
            });
            
            let dividerCount = sectionCount > 1 ? (sectionCount - 1) : 0;
            let usedW = totalSecW + (dividerCount * tempThick);
            let remaining = tempInnerW - usedW;
            
            if (remaining > 0) {
                suggestedValue = Math.round(remaining).toString();
            }
        } else {
            const tempOverallH = parseFloat(document.getElementById('mod-h')?.value) || 0;
            const tempBaseH = parseFloat(document.getElementById('mod-base-h')?.value) || 0;
            const tempThick = parseFloat(document.getElementById('mod-thick')?.value) || 18;
            const crownCheck = document.getElementById('mod-add-crown');
            const addCrownTemp = crownCheck ? crownCheck.checked : true;
            
            let tempSideH = addCrownTemp ? (tempOverallH - tempBaseH - tempThick) : (tempOverallH - tempBaseH);
            let totalSecH = 0;
            document.querySelectorAll('.section-card').forEach(card => {
                totalSecH += parseFloat(card.querySelector('.sec-h').value) || 0;
            });
            
            let remaining = tempSideH - totalSecH;
            if (remaining > 0) {
                suggestedValue = Math.round(remaining).toString();
            } else if (totalSecH === 0) {
                suggestedValue = Math.round(tempSideH).toString(); // İlk bölümse tam boyu öner
            }
        }
        // ---------------------------------------
        
        const labelName = isVert ? 'Modül' : 'Bölüm';
        const input1Label = isVert ? 'Modül İç Genişliği (mm)' : 'Bölüm Yüksekliği (mm)';
        
        // Yan Yana modda modül içini bölmeyeceğiz (sütun = 1 sabit).
        const colHtml = isVert ? `
            <div class="input-group-col" style="display: none;">
                <label>Sütun (Orta Dikme) Sayısı</label>
                <input type="number" class="sec-cols-count" value="1" min="1" max="1">
            </div>
        ` : `
            <div class="input-group-col">
                <label>Sütun (Orta Dikme) Sayısı</label>
                <input type="number" class="sec-cols-count" value="1" min="1" max="5">
            </div>
        `;
        
        const sectionHtml = `
            <div class="section-card" id="section-${sectionId}" style="transition: all 0.3s ease;">
                <div class="section-card-header" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px; margin-bottom: 5px;" onclick="toggleSectionAccordion(${sectionId})">
                    <span class="section-label" style="font-weight: 600; font-size: 1.05rem;"><i class="fas fa-chevron-down accordion-icon" style="margin-right: 8px; transition: transform 0.3s ease;"></i>${sectionId}. ${labelName}</span>
                    <button class="btn-remove-section" onclick="event.stopPropagation(); removeSection(${sectionId})"><i class="fas fa-trash"></i></button>
                </div>
                <div class="section-body" id="section-body-${sectionId}" style="padding: 5px;">
                    <div class="modal-grid" style="grid-template-columns: 1fr 1fr 1fr;">
                        <div class="input-group-col">
                            <label>${input1Label}</label>
                            <input type="number" class="sec-h" value="${suggestedValue}" placeholder="Otomatik (Kalan)">
                        </div>
                        <div class="input-group-col">
                            <label>Özel Derinlik (Masa)</label>
                            <input type="number" class="sec-custom-d" placeholder="Genel derinliği kullan">
                        </div>
                        ${colHtml}
                    </div>
                    <div class="columns-container" id="columns-container-${sectionId}" style="margin-top: 15px; display:flex; gap: 10px; flex-wrap: nowrap; overflow-x: auto;">
                        <!-- Sütunlar buraya eklenecek -->
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', sectionHtml);
        
        // Yeni eklenen bölümü aç, diğerlerini kapat
        if (typeof window.toggleSectionAccordion === 'function') {
            window.toggleSectionAccordion(sectionId);
        }
        
        const newCard = document.getElementById(`section-${sectionId}`);
        const colCountInput = newCard.querySelector('.sec-cols-count');
        const colsContainer = newCard.querySelector('.columns-container');
        
        const renderColumns = () => {
            const count = parseInt(colCountInput.value) || 1;
            colsContainer.innerHTML = '';
            for(let i=1; i<=count; i++) {
                colsContainer.insertAdjacentHTML('beforeend', `
                    <div class="column-card" style="flex: 1; min-width: 250px; background: #fff; border: 1px solid var(--border-light); padding: 10px; border-radius: 6px;">
                        <h5 style="margin-bottom: 10px; color: var(--primary); font-size: 0.9rem;">${i}. Sütun Ayarları</h5>
                        <div class="modal-grid" style="grid-template-columns: 1fr 1fr;">
                            <div class="input-group-col">
                                <label>Raf Sayısı</label>
                                <input type="number" class="col-shelf-qty" value="0">
                            </div>
                            <div class="input-group-col">
                                <label title="Bölüm içine krom askı borusu ekle">Askılık (Boru)</label>
                                <input type="number" class="col-rail-qty" value="0" min="0" max="2">
                            </div>
                        </div>
                        <div class="modal-grid" style="grid-template-columns: 1fr 1fr; margin-top: 5px;">
                            <div class="input-group-col">
                                <label title="Yan yana sağa-sola açılan kapak">Yan Yana Kapak</label>
                                <input type="number" class="col-door-qty" value="0">
                            </div>
                            <div class="input-group-col">
                                <label title="Üst üste dizilen çekmece/kapak">Üst Üste Kapak</label>
                                <input type="number" class="col-stack-qty" value="0">
                            </div>
                            <div class="input-group-col">
                                <label title="Alttan üste kaç tanesi çekmece olacak?">Çekmece Sayısı</label>
                                <input type="number" class="col-drawer-qty" value="0">
                            </div>
                            <div class="input-group-col">
                                <label title="Çekmecenin aşağıdan yukarıya kaçıncı sıradan başlayacağı">Çek. Konum</label>
                                <input type="text" class="col-drawer-start" value="1" title="Araya virgül koyarak yaz (Örn: 1,3)">
                            </div>
                        </div>
                        <div class="modal-grid" style="grid-template-columns: 1fr 1fr; margin-top: 5px;">
                            <div class="input-group-col">
                                <label>Zemin Tipi (Masa Modu)</label>
                                <select class="col-base-type">
                                    <option value="standart">Standart (Değişiklik Yok)</option>
                                    <option value="asma">Asma (Zemine inmez, boş)</option>
                                    <option value="yere_basan_ayak">Yere Basan (Normal Ayaklı)</option>
                                            <option value="yere_basan_baza">Yere Basan (Kapalı Bazalı)</option>
                                </select>
                            </div>
                            <div class="input-group-col">
                                <label title="Sadece Yere Basan seçili ise geçerlidir">Ayak/Baza Yük. (mm)</label>
                                <input type="number" class="col-base-h" value="" placeholder="Örn: 100">
                            </div>
                        </div>
                        
                        <!-- Gelişmiş Ayarlar Butonu -->
                        <button class="btn-secondary toggle-adv-btn" style="width: 100%; margin-top: 10px; font-size: 0.75rem; padding: 5px;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">Gelişmiş Ayarları (Özel Ölçü) Aç</button>
                        
                        <div class="adv-settings" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ccc;">
                            <div class="input-group-col">
                                <label>İçerlek Payı (Gap)</label>
                                <input type="number" class="col-gap" value="15">
                            </div>
                            <div class="input-group-col">
                                <label>Kapak-Raf Dağılımı (Dikey)</label>
                                <input type="text" class="col-door-shelf-dist" placeholder="Örn: 3, 2 (Toplam raf boşluğu kadar)">
                            </div>
                            <div class="input-group-col">
                                <label>Kapak Orantısı (Yatay)</label>
                                <input type="text" class="col-door-w-dist" placeholder="Örn: 1, 2 veya 40, 60">
                            </div>
                            <div class="input-group-col">
                                <label>Özel Sütun Genişliği (Boş = Eşit)</label>
                                <input type="number" class="col-custom-w" placeholder="Örn: 600">
                            </div>
                            <div class="input-group-col">
                                <label>Özel Kapak Boyları (Milimetrik)</label>
                                <input type="text" class="col-custom-drawers" placeholder="Örn: 200, 200, 400">
                            </div>
                            <div class="input-group-col">
                                <label>Özel Raf Aralıkları (Milimetrik)</label>
                                <input type="text" class="col-custom-shelves" placeholder="Örn: 300, 250">
                            </div>
                        </div>
                        <div class="shelf-gap-info" style="color: var(--success); font-size: 0.8rem; font-weight: 500; margin-top: 10px;"></div>
                    </div>
                `);
            }
            
            colsContainer.querySelectorAll('input').forEach(input => {
                input.addEventListener('input', () => {
                    if (typeof window.update3DModel === 'function') window.update3DModel();
                    window.updateShelfGapInfo();
                });
            });
            window.updateShelfGapInfo();
            if (typeof window.update3DModel === 'function') window.update3DModel();
        };

        colCountInput.addEventListener('input', renderColumns);
        newCard.querySelector('.sec-h').addEventListener('input', () => {
            if (typeof window.update3DModel === 'function') window.update3DModel();
            window.updateShelfGapInfo();
        });
        
        renderColumns(); // İlk eklemede sütunları oluştur
        updateSectionLabels();
    }
    
    window.removeSection = function(id) {
        const el = document.getElementById(`section-${id}`);
        if (el) {
            el.remove();
            if (typeof window.update3DModel === 'function') window.update3DModel();
            updateSectionLabels();
            window.updateShelfGapInfo();
        }
    }
    
    const modeBtnH = document.getElementById('mode-btn-horizontal');
    const modeBtnV = document.getElementById('mode-btn-vertical');
    
    function updateWizardModeUI() {
        if (window.moduleWizardMode === 'horizontal') {
            modeBtnH.className = 'btn-primary';
            modeBtnH.style.border = 'none';
            modeBtnH.style.background = 'var(--primary)';
            modeBtnH.style.color = '#fff';
            
            modeBtnV.className = 'btn-secondary';
            modeBtnV.style.background = 'transparent';
            modeBtnV.style.color = 'var(--dark)';
            
            addBtn.innerHTML = '<i class="fas fa-plus"></i> Yeni Bölüm Ekle';
        } else {
            modeBtnV.className = 'btn-primary';
            modeBtnV.style.border = 'none';
            modeBtnV.style.background = 'var(--primary)';
            modeBtnV.style.color = '#fff';
            
            modeBtnH.className = 'btn-secondary';
            modeBtnH.style.background = 'transparent';
            modeBtnH.style.color = 'var(--dark)';
            
            addBtn.innerHTML = '<i class="fas fa-plus"></i> Yeni Modül Ekle (Dikey)';
        }
        
        // Reset sections when mode changes
        document.getElementById('sections-container').innerHTML = '';
        window.sectionCount = 0;
        window.addSection();
    }
    
    if (modeBtnH && modeBtnV) {
        modeBtnH.addEventListener('click', () => {
            if (window.moduleWizardMode !== 'horizontal') {
                window.moduleWizardMode = 'horizontal';
                updateWizardModeUI();
            }
        });
        modeBtnV.addEventListener('click', () => {
            if (window.moduleWizardMode !== 'vertical') {
                window.moduleWizardMode = 'vertical';
                updateWizardModeUI();
            }
        });
    }

    const addBtn = document.getElementById('add-section-btn');
    if (addBtn) addBtn.addEventListener('click', window.addSection);
    
    const crownCheck = document.getElementById('mod-add-crown');
    if (crownCheck) crownCheck.addEventListener('change', () => {
        if (typeof window.update3DModel === 'function') window.update3DModel();
    });
    
    const openModBtn = document.getElementById('open-module-wizard-btn');
    if (openModBtn) {
        openModBtn.addEventListener('click', () => {
            const container = document.getElementById('sections-container');
            if (container && container.children.length === 0) {
                window.addSection();
            }
        });
    }

    function generateSingleModuleParts(projName) {
        // Geçici olarak addPartRow'u ez (isimlere prefix eklemek için)
        const originalAddPartRow = addPartRow;
        addPartRow = function(data = {}) {
            if (data.name) {
                data.name = projName + ' - ' + data.name;
            }
            originalAddPartRow(data);
        };

        const thick = parseFloat(document.getElementById('mod-thick').value) || 18;
        const w = parseFloat(document.getElementById('mod-w').value);
        const overallH = parseFloat(document.getElementById('mod-h').value);
        const d = parseFloat(document.getElementById('mod-d').value);
        const baseH = parseFloat(document.getElementById('mod-base-h').value) || 0;
        
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
                        railQty: col.querySelector('.col-rail-qty') ? (parseInt(col.querySelector('.col-rail-qty').value) || 0) : 0,
                        drawerQty: col.querySelector('.col-drawer-qty') ? (parseInt(col.querySelector('.col-drawer-qty').value) || 0) : 0,
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

        if (!w || !overallH || !d || sections.length === 0) {
            addPartRow = originalAddPartRow;
            return false;
        }

        const baseType = document.getElementById('mod-base-type') ? document.getElementById('mod-base-type').value : 'normal';
        const noBottomBoard = document.getElementById('mod-no-bottom') ? document.getElementById('mod-no-bottom').checked : false;
        
        const initialListLength = document.querySelectorAll('.part-row').length;

        const internalW = w - (2 * thick);
        let sideH;
        const isCrownAdded = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;
        
        if (baseType === 'closed') {
            sideH = overallH - 7; // 7mm takoz payı
        } else {
            sideH = overallH - baseH;
        }
        
        if (isCrownAdded) {
            sideH -= thick; // Taç kalınlığı kadar gövdeden düşüyoruz ki toplam boy aynı kalsın
        }

        // --- YAN YANA (DİKEY) MOD MANTIĞI ---
        if (window.moduleWizardMode === 'vertical') {
            // 1. Dış İskelet (Alt/Üst/Yanlar)
            addPartRow({ name: "Sağ Yan Dikme", h: sideH, w: d, q: 1, rot: true, b: [false, true, false, false] });
            addPartRow({ name: "Sol Yan Dikme", h: sideH, w: d, q: 1, rot: true, b: [false, true, false, false] });
            
            addPartRow({ name: "Alt Tabla", h: internalW, w: d, q: 1, rot: true, b: [false, true, false, false] });
        }
            addPartRow({ name: "Üst Tabla", h: internalW, w: d, q: 1, rot: true, b: [false, true, false, false] });
            
            if (baseType === 'closed' && baseH > 7) {
                addPartRow({ name: "Ön Baza", h: baseH - 7, w: internalW, q: 1, rot: true, b: [false, true, false, false] });
            }
            
            const addCrown = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;
            if (addCrown) {
                addPartRow({ name: "Taç (Üst)", h: w, w: d + 25, q: 1, rot: true, b: [true, true, false, true] });
            }

            // 2. Modüller (Sütunlar) Arası Ara Dikmeler
            const moduleCount = sections.length;
            const innerH = sideH - (2 * thick);
            if (moduleCount > 1) {
                addPartRow({ name: "Modül Ara Dikme", h: innerH, w: d, q: moduleCount - 1, rot: true, b: [false, true, false, false] });
            }

            // 3. Modül İçi Raflar ve Kapaklar
            // Genişlik hesabı
            const availableModW = internalW - ((moduleCount - 1) * thick);
            let customModWTotal = 0;
            let customModCols = 0;
            sections.forEach(sec => {
                if (sec.h && sec.h > 0) { // sec.h aslında modül genişliği oldu
                    customModWTotal += sec.h;
                    customModCols++;
                }
            });
            const remainingModW = availableModW - customModWTotal;
            const defaultModW = remainingModW / (moduleCount - customModCols);

            sections.forEach((sec, index) => {
                const modW = (sec.h && sec.h > 0) ? sec.h : defaultModW;
                const col = sec.columns[0]; // Sadece ilk sütunu alıyoruz (tek sütun kuralı)
                
                // Raflar (15mm içeride kuralı)
                if (col.shelfQty > 0) {
                    addPartRow({ name: `${index+1}. Modül İç Raf`, h: modW, w: d - 15, q: col.shelfQty, rot: true, b: [false, true, false, false] });
                }

                // Çekmeceler
                if (col.drawerQty > 0) {
                    const drawerW = modW - 50; // Kasa 50mm dar
                    const drawerD = secD - 50;
                    const drawerH = 150; // Standart çekmece kasa yüksekliği
                    
                    addPartRow({ name: `${index+1}. Modül Çekmece Klapası`, h: modW - 4, w: 185, q: col.drawerQty, rot: true, b: [true, true, true, true] });
                    addPartRow({ name: `${index+1}. Modül Çekm. Ön/Arka Kasa`, h: drawerW, w: drawerH, q: col.drawerQty * 2, rot: true, b: [true, false, false, false] });
                    addPartRow({ name: `${index+1}. Modül Çekm. Yan Kasa`, h: drawerD, w: drawerH, q: col.drawerQty * 2, rot: true, b: [true, false, false, false] });
                }

                // Kapaklar
                if (col.doorQty > 0 && col.stackQty > 0) {
                    const innerGapsH = (col.stackQty - 1) * 4;
                    const drawerTotalH = col.drawerQty * 185 + (col.drawerQty * 4);
                    const usableH = innerH - drawerTotalH - innerGapsH - 4; // Alt üst 2mm boşluk
                    const doorH = usableH / col.stackQty;
                    
                    const singleDoorW = modW; // Çift kapak yoksa
                    let actualDoorW = singleDoorW - 4; // Sağ sol 2mm derz
                    let actualDoorQty = col.doorQty * col.stackQty;
                    
                    if (col.doorQty === 2) {
                        actualDoorW = (modW - 8) / 2; // Ortadan 4mm derz
                    }
                    
                    addPartRow({ name: `${index+1}. Modül Kapak`, h: doorH, w: actualDoorW, q: actualDoorQty, rot: true, b: [true, true, true, true] });
                }
            });

            if (document.querySelectorAll('.part-row').length > initialListLength) {
                showToast("Modüler liste başarıyla oluşturuldu!", "success");
            }
            return; // Dikey mod tamamlandı, alttaki yatay koda geçme
        }

        // --- KATMANLI (YATAY) MOD MANTIĞI ---
        // 1. Yan Dikmeler
        addPartRow({ name: "Sağ Yan Dikme", h: sideH, w: d, q: 1, rot: true, b: [false, true, false, false] });
        addPartRow({ name: "Sol Yan Dikme", h: sideH, w: d, q: 1, rot: true, b: [false, true, false, false] });
        
        // 1.5. Kapalı Baza Parçası
        if (!noBottomBoard) {
        if (baseType === 'closed' && baseH > 7) {
            addPartRow({ name: "Ön Baza", h: baseH - 7, w: internalW, q: 1, rot: true, b: [false, true, false, false] });
        }

        // 2. Alt ve Üst Tablalar
        addPartRow({ name: "Alt Tabla", h: internalW, w: d, q: 1, rot: true, b: [false, true, false, false] });
        addPartRow({ name: "Üst Tabla", h: internalW, w: d, q: 1, rot: true, b: [false, true, false, false] });
        
        // 2.5 Taç (Üst Taşkınlık)
        const addCrown = document.getElementById('mod-add-crown') ? document.getElementById('mod-add-crown').checked : true;
        if (addCrown) {
            // Genişlik dolabın net genişliği (w), derinlik gövdeden 25mm fazla (d + 25)
            addPartRow({ name: "Taç (Üst)", h: w, w: d + 25, q: 1, rot: true, b: [true, true, false, true] });
        }

        // 3. Bölüm Arası Sabit Raflar (Tavana değiyorsa kesilmez)
        let cumulativeH = 0;
        let sabitRafCount = 0;
        sections.forEach((sec, idx) => {
            cumulativeH += sec.h || 0;
            if (cumulativeH < sideH - 0.1) {
                let secD = parseFloat(sec.customD) || d;
                addPartRow({ name: `${idx+1}. Sabit Raf (Ara Bölücü)`, h: internalW, w: secD, q: 1, rot: true, b: [false, true, false, false] });
            }
        });

        // 4. Raflar, Kapaklar ve Orta Dikmeler (Sütunlara Göre)
        sections.forEach((sec, index) => {
            let secD = parseFloat(sec.customD) || d;
            // Bölüm Net İç Boşluğu
            let netH;
            if (index === 0) {
                netH = sec.h - (2 * thick);
            } else {
                netH = sec.h - thick;
            }

            // Sütunlar Arası Orta Dikmeler
            if (sec.colsCount > 1) {
                const dikmeQty = sec.colsCount - 1;
                addPartRow({ name: `${index+1}. Bölüm Orta Dikme`, h: netH, w: secD, q: dikmeQty, rot: true, b: [false, true, false, false] });
            }

            // Sütun Genişlikleri Hesaplama
            const availableW = internalW - ((sec.colsCount - 1) * thick);
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
            
            // --- Dikey boşluk ve Komşu Kapak Kontrolü (Akıllı Tam Binme) ---
            const prevSec = index > 0 ? sections[index - 1] : null;
            const nextSec = index < sections.length - 1 ? sections[index + 1] : null;
            
            const prevSecHasDoors = prevSec ? prevSec.columns.some(c => c.doorQty > 0 && c.stackQty > 0) : false;
            const nextSecHasDoors = nextSec ? nextSec.columns.some(c => c.doorQty > 0 && c.stackQty > 0) : false;

            let bottomGap = 0;
            let topGap = 0;
            let sectionDoorTotalH = sec.h;

            if (index > 0) {
                if (prevSecHasDoors) {
                    sectionDoorTotalH += (thick / 2);
                    bottomGap = 2;
                } else {
                    sectionDoorTotalH += thick;
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
                    // sectionDoorTotalH'den düşmüyoruz, çünkü aşağıda 'usableH' hesaplanırken 'topGap' zaten düşülüyor!
                }
            }


            sec.columns.forEach((col, cIdx) => {
                let colW = defaultColW;
                if (col.customW && !isNaN(parseFloat(col.customW))) {
                    colW = parseFloat(col.customW);
                }
                
                // 1. RAFLARIN MERKEZ KOORDİNATLARINI HESAPLA
                
                // Yere Basan Sütun Mantığı (Masa Modu)
                if (noBottomBoard && col.baseType === 'yere_basan') {
                    // Bu sütun yere basıyorsa, kendi yanlarına ekstra boy eklememiz gerekebilir veya mini alt tabla
                    // Ancak halihazırda orta dikme "netH" olarak kesildi.
                    // Yere basan orta dikme hesaplamak için, eğer bu en alt katman (index === 0) ise:
                    if (index === 0) {
                         // Aslında en alt katmansa ve yere basan seçiliyse, o sütunun altına bir mini tabla koyalım:
                         addPartRow({ name: `${index+1}. Bölüm ${cIdx+1}. Sütun Mini Alt Tabla`, h: colW, w: secD, q: 1, rot: true, b: [false, true, false, false] });
                         // Ve eğer ortadaysa (cIdx > 0), onun sol orta dikmesini yere kadar uzatabiliriz.
                         // Ancak şimdilik sadece mini alt tabla koyalım, "Asma" durumunda ise mini alt tabla + çekmece olur, yere basmaz.
                    }
                }

                let customShelves = [];
                if (col.customShelves && col.customShelves.trim() !== "") {
                    customShelves = col.customShelves.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
                }
                
                const totalShelfThick = col.shelfQty * thick;
                const netEmptySpace = netH - totalShelfThick;
                const defaultShelfGap = netEmptySpace / (col.shelfQty + 1);
                
                let shelfCurrentY = 0;
                let shelfCenters = [];
                
                for (let i = 0; i < col.shelfQty; i++) {
                    let thisGap = customShelves[i] ? customShelves[i] : defaultShelfGap;
                    shelfCurrentY += thisGap;
                    shelfCenters.push(shelfCurrentY + (thick / 2));
                    shelfCurrentY += thick;
                }

                // 2. KAPAK SINIR (ÇARPIŞMA) NOKTALARINI VE YÜKSEKLİKLERİNİ HESAPLA
                let doorBoundaries = [];
                let doorHeights = [];
                
                let doorTotalH = sectionDoorTotalH;
                const innerGapsH = (col.stackQty - 1) * 4;
                
                // Masa Modu: Sütun ayağı (baseH) varsa kapak/çekmece alanını daralt
                let colDoorTotalH = doorTotalH;
                if (noBottomBoard && index === 0 && (col.baseType === 'yere_basan_ayak' || col.baseType === 'yere_basan_baza')) {
                    let cbh = parseFloat(col.baseH) || 0;
                    colDoorTotalH -= cbh;
                }
                const usableH = colDoorTotalH - bottomGap - topGap - innerGapsH;

                const defaultDoorH = usableH / col.stackQty;

                if (col.doorQty > 0 && col.stackQty > 0) {
                    let doorStartLocalY = 0;
                    if (index > 0) {
                        doorStartLocalY = prevSecHasDoors ? (-thick / 2) : -thick;
                    } else {
                        doorStartLocalY = -thick; // Baza üstü rafın tam altına iner
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
                                    doorH = targetBoundary - currentY - 2; // -2 for half of 4mm gap
                                }
                            } else {
                                doorH = doorStartLocalY + doorTotalH - topGap - currentY;
                            }
                        }
                        
                        doorHeights.push(doorH);
                        currentY += doorH;
                        if (stack < col.stackQty - 1) {
                            doorBoundaries.push(currentY + 2); // 4mm derzin tam ortası
                            currentY += 4;
                        }
                    }
                }

                // 3. RAFLARI LİSTEYE EKLE VE KAPAK BASIYORSA TAM BOY KES
                if (col.shelfQty > 0) {
                    let fullDepthCount = 0;
                    let recessedCount = 0;
                    
                    for (let i = 0; i < col.shelfQty; i++) {
                        let shelfCenterY = shelfCenters[i];
                        
                        let isDoorBoundary = false;
                        for (let b of doorBoundaries) {
                            if (Math.abs(shelfCenterY - b) <= (thick / 2) + 4) {
                                isDoorBoundary = true;
                                break;
                            }
                        }
                        
                        if (isDoorBoundary) {
                            fullDepthCount++;
                        } else {
                            recessedCount++;
                        }
                    }

                    if (fullDepthCount > 0) {
                        addPartRow({ name: `${index+1}. Bölüm ${cIdx+1}. Sütun Raf (Kapak Basan)`, h: colW - 1, w: d, q: fullDepthCount, rot: true, b: [false, true, false, false] });
                    }
                    if (recessedCount > 0) {
                        addPartRow({ name: `${index+1}. Bölüm ${cIdx+1}. Sütun İç Raf`, h: colW - 1, w: d - col.gap, q: recessedCount, rot: true, b: [false, true, false, false] });
                    }
                }
                
                // 4. KAPAKLARI / ÇEKMECELERİ LİSTEYE EKLE (YATAY ORANTI)
                if (col.doorQty > 0 && col.stackQty > 0) {
                    const isLeftCol = (cIdx === 0);
                    const isRightCol = (cIdx === sec.colsCount - 1);
                    const leftGap = isLeftCol ? 0 : 2;
                    const rightGap = isRightCol ? 0 : 2;
                    
                    const doorTotalW = (w * (colW / availableW)); 
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

                    for (let stack = 0; stack < col.stackQty; stack++) {
                        let doorH = doorHeights[stack];
                        
                        let wCounts = {};
                        doorWidths.forEach(dw => {
                            let key = dw.toFixed(1);
                            wCounts[key] = (wCounts[key] || 0) + 1;
                        });
                        
                        // stack = 0 en üst, stack = col.stackQty - 1 en alt
                        // Çekmeceler alttan yukarıya doğru sayılır
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
                        
                        for (let wStr in wCounts) {
                            let dw = parseFloat(wStr);
                            let qty = wCounts[wStr];
                            
                            let nameKlapa = isDrawer ? `${index+1}. Bölüm ${cIdx+1}. Sütun Çekmece Klapası` : `${index+1}. Bölüm ${cIdx+1}. Sütun Kapak`;
                            addPartRow({ name: nameKlapa, h: doorH, w: dw, q: qty, rot: true, b: [true, true, true, true] });
                            
                            if (isDrawer) {
                                // Çekmece Kasa Derinliği (Z) = Modül Derinliği - 50mm
                                const boxDepth = d - 50;
                                // Çekmece Kasa Yüksekliği = Klapa Yüksekliği - 35mm
                                const boxHeight = doorH - 35;
                                
                                // Çekmece kasanın gireceği net boşluk genişliği
                                // Eğer yan yana çok kapak varsa (doorQty > 1), colW'yi ona böleriz (aralara dikme atılacağı varsayımıyla)
                                const innerOpeningW = colW / col.doorQty;
                                const boxOuterWidth = innerOpeningW - 25; // 25mm ray boşluğu
                                const boxInnerWidth = boxOuterWidth - (2 * thick);
                                
                                // Çekmece Yanları
                                addPartRow({ name: `${index+1}. Bölüm ${cIdx+1}. Sütun Çekmece Yanı`, h: boxDepth, w: boxHeight, q: qty * 2, rot: true, b: [false, true, false, true] });
                                
                                // Çekmece Ön ve Arka
                                addPartRow({ name: `${index+1}. Bölüm ${cIdx+1}. Sütun Çekmece Ön/Arka`, h: boxInnerWidth, w: boxHeight, q: qty * 2, rot: true, b: [false, true, false, true] });
                                
                                // Çekmece Dibi (Alttan vidalama olarak kasanın dış ebatlarında)
                                addPartRow({ name: `${index+1}. Bölüm ${cIdx+1}. Sütun Çekmece Dibi`, h: boxDepth, w: boxOuterWidth, q: qty, rot: true, b: [false, false, false, false] });
                            }
                        }
                    }
                }
            });
        });

        addPartRow = originalAddPartRow;
        return true;
    }

    function generateModuleParts() {
        if (typeof window.saveCurrentProjectToState === 'function') window.saveCurrentProjectToState();
        const originalActiveId = window.activeProjectId;
        
        document.querySelectorAll('.part-row').forEach(row => {
            const n = row.querySelector('.p-name');
            const w = row.querySelector('.p-w');
            const h = row.querySelector('.p-h');
            if (n && w && h && !n.value.trim() && !w.value.trim() && !h.value.trim()) {
                row.remove();
            }
        });
        
        let successCount = 0;
        const initialListLength = document.querySelectorAll('.part-row').length;
        
        if (window.wizardProjects && window.wizardProjects.length > 0) {
            window.wizardProjects.forEach(proj => {
                if (typeof window.loadProjectToForm === 'function') window.loadProjectToForm(proj.id);
                
                const w = parseFloat(document.getElementById('mod-w').value);
                const overallH = parseFloat(document.getElementById('mod-h').value);
                const d = parseFloat(document.getElementById('mod-d').value);
                const sections = document.querySelectorAll('.section-card');
                
                if (w && overallH && d && sections.length > 0) {
                    const success = generateSingleModuleParts(proj.name);
                    if (success) successCount++;
                }
            });
            
            if (typeof window.loadProjectToForm === 'function') window.loadProjectToForm(originalActiveId);
        } else {
            const success = generateSingleModuleParts("Dolap");
            if (success) successCount++;
        }
        
        if (successCount > 0) {
            document.getElementById('module-wizard-modal').style.display = 'none';
            if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
            if (typeof updateUI === 'function') updateUI();
            const allRows = document.querySelectorAll('.part-row');
            let addedQuantity = 0;
            for (let i = initialListLength; i < allRows.length; i++) {
                const qInput = allRows[i].querySelector('.p-q');
                if (qInput) {
                    addedQuantity += parseInt(qInput.value) || 0;
                }
            }
            if (typeof showToast === 'function') showToast('<b>' + addedQuantity + ' adet ahşap parça (' + successCount + ' dolap)</b> başarıyla kesim listesine aktarıldı!', 'success');
        } else {
            if (typeof showToast === 'function') showToast('Lütfen en az bir dolabın ölçülerini tam giriniz.', 'error');
        }
    }

});

// --- EXCEL ŞABLON İNDİR ---
function downloadExcelTemplate() {
    // 1. Şablon Verisi (Başlıklar ve Örnek Satırlar)
    const data = [
        ["Parça Adı", "Boy (mm)", "En (mm)", "Adet", "Dönsün(X)", "Üst Bant(X)", "Sağ Bant(X)", "Alt Bant(X)", "Sol Bant(X)"],
        ["Mutfak Kapak", 720, 450, 2, "X", "X", "X", "X", "X"],
        ["Çekmece Önü", 180, 450, 4, "X", "", "X", "", "X"],
        ["Raf", 500, 300, 1, "", "X", "", "", ""]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!cols'] = [
        { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Kesim Listesi");
    XLSX.writeFile(wb, "MdfKesim_Sablon.xlsx");
    
    if (window.showCustomAlert) {
        window.showCustomAlert('Örnek Excel şablonu indirildi!', 'success');
    }
}// Vercel Test Push - 1.03
// Vercel Public Test Push
