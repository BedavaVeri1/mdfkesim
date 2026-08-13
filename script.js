document.addEventListener('DOMContentLoaded', () => {

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
        dom.calculateBtn.addEventListener('click', runOptimization);
        dom.pdfBtn.addEventListener('click', generatePDF);
        dom.labelBtn.addEventListener('click', generateLabels);

        // Toolbar
        dom.templateBtn = document.getElementById('dl-template-btn'); // DOM elementini tanımla
        dom.templateBtn.addEventListener('click', downloadExcelTemplate);
        dom.saveBtn.addEventListener('click', saveProject);
        dom.loadBtn.addEventListener('click', loadProject);
        dom.clearBtn.addEventListener('click', () => {
            if (confirm('Tüm liste silinecek?')) { dom.partsList.innerHTML = ''; addPartRow(); }
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
    }

    // --- UI FONKSİYONLARI ---

    function addPartRow(data = {}) {
        const row = document.createElement('div');
        row.className = 'part-row';

        // Varsayılan Değerler
        const name = data.name || '';
        const w = data.w || '';
        const h = data.h || '';
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

            dom.partsList.innerHTML = ''; // Listeyi temizle

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length >= 3) {
                    addPartRow({
                        name: row[0] || 'Parça ' + i,
                        h: row[1],
                        w: row[2],
                        q: row[3] || 1
                    });
                }
            }
            alert(`${rows.length - 1} parça yüklendi.`);
        };
        reader.readAsArrayBuffer(file);
        // Reset input
        dom.excelInput.value = '';
    }

    // --- PROJE KAYDET / YÜKLE (DOSYA OLARAK) ---
    async function saveProject() {
        let projectName = prompt("Lütfen projeniz için bir isim girin (Müşteri veya İş Adı):", "MdfKesim-Siparis");
        
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

        const project = {
            parts: parts,
            settings: {
                stockW: dom.inputs.stockW.value,
                stockH: dom.inputs.stockH.value,
                kerf: dom.inputs.kerf.value,
                banding: dom.inputs.banding.value
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
        
        // Sadece klasik yöntemde uyarı ver, share api kendi arayüzünü açıyor zaten
        alert('Proje "' + fileName + '" adıyla indirilmeye çalışıldı. (İnmediyse tarayıcınız veya iOS sürümünüz engelliyor olabilir).');
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

                    // Parçaları Yükle
                    dom.partsList.innerHTML = '';
                    if (project.parts && project.parts.length > 0) {
                        project.parts.forEach(p => addPartRow(p));
                    }
                    alert('Proje dosyası başarıyla yüklendi!');
                } catch (err) {
                    alert('Geçersiz dosya formatı. Lütfen MdfKesim-Proje.json dosyasını seçtiğinizden emin olun.');
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

        fit(blocks) {
            // Önce alanı en büyük, sonra uzun kenarı en büyük olanı dene
            const remaining = blocks.filter(b => !b.fit);
            remaining.sort((a, b) => Math.max(b.cw, b.ch) - Math.max(a.cw, a.ch));

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
        const sheetPrice = parseFloat(dom.inputs.sheetPrice.value);
        const cutPrice = parseFloat(dom.inputs.cutPrice.value);

        if (!stockW || !stockH) { alert('Stok ölçülerini girin!'); return; }

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

        if (blocks.length === 0) { alert('Hesaplanacak geçerli bir parça bulunamadı. Lütfen En ve Boy ölçülerini girdiğinizden emin olun!'); return; }

        // 3. Optimizasyon Döngüsü
        let sheets = [];
        let safety = 0;

        while (blocks.some(b => !b.fit) && safety < 500) {
            const packer = new GuillotinePacker(stockW, stockH);
            packer.fit(blocks);

            if (packer.placedBlocks.length > 0) {
                sheets.push(packer);
            } else {
                // Kalanlar sığmıyor demektir
                break;
            }
            safety++;
        }

        // 4. Sonuçları Kaydet
        projectState.sheets = sheets;
        projectState.blocks = blocks;
        projectState.settings = { stockW, stockH, kerf, bandThick };

        // 5. İstatistikler & Maliyet
        calculateStats(sheets, stockW, stockH, sheetPrice, cutPrice);

        // 6. Artan Parçalar
        listOffcuts(sheets);

        // 7. Butonları Aç
        dom.pdfBtn.style.display = 'inline-block';
        dom.labelBtn.style.display = 'inline-block';

        // 8. Çizim
        drawResults(stockW, stockH, sheets);
    }

    function calculateStats(sheets, sw, sh, sPrice, cPrice) {
        let totalArea = sheets.length * sw * sh;
        let usedArea = 0;
        let totalCutLength = 0; // Metre tül

        sheets.forEach(sheet => {
            sheet.placedBlocks.forEach(b => {
                usedArea += b.realCutW * b.realCutH;
                // Kesim uzunluğu (Çevre / 2 + ortak kenar mantığı karmaşık, basitçe çevre alalım)
                totalCutLength += (b.realCutW + b.realCutH) * 2;
            });
        });

        const eff = totalArea > 0 ? (usedArea / totalArea) * 100 : 0;
        const totalCutMeter = totalCutLength / 1000; // mm -> m

        // Maliyet: Plaka + Kesim
        const cost = (sheets.length * sPrice) + (totalCutMeter * cPrice);

        dom.stats.sheets.innerText = sheets.length;
        dom.stats.efficiency.innerText = '%' + eff.toFixed(1);
        dom.stats.cost.innerText = cost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
        dom.stats.cutLen.innerText = totalCutMeter.toFixed(1) + ' m';
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
                    const textName = b.name.substring(0, 10);
                    const dimText = b.fit.rotated ? `${b.finishW}x${b.finishH}(R)` : `${b.finishW}x${b.finishH}`;
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

            // Başlık
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text(`Kesim Plani - Plaka ${i + 1}`, 10, 10);

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

                // İsim ve Ölçüler
                tCtx.fillStyle = '#0f172a';
                tCtx.textAlign = 'center';
                tCtx.textBaseline = 'middle';
                
                if (w > 4 && h > 4) {
                    const textName = b.name.substring(0, 12);
                    const dimText = b.fit.rotated ? `${b.finishW}x${b.finishH}(R)` : `${b.finishW}x${b.finishH}`;
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
        // A4 Kağıda 2 sütun x 4 satır etiket varsayalım (105mm x 74mm etiket)
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

            // Etiket Çerçeve
            doc.setDrawColor(200);
            doc.rect(x + 2, y + 2, w - 4, h - 4); // Marginli

            // İçerik
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(part.name, x + 10, y + 15);

            doc.setFontSize(22);
            doc.text(`${part.finishW} x ${part.finishH}`, x + 10, y + 30);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Plaka: ${part.sheetId}`, x + 10, y + 45);

            // Bant Bilgisi
            let bands = [];
            if (part.banding[0]) bands.push('ÜST');
            if (part.banding[1]) bands.push('SAĞ');
            if (part.banding[2]) bands.push('ALT');
            if (part.banding[3]) bands.push('SOL');

            if (bands.length > 0) {
                doc.setTextColor(200, 0, 0);
                doc.text(`BANT: ${bands.join(' - ')}`, x + 10, y + 55);
                doc.setTextColor(0);
            }

            // QR Kod Yeri (Simülasyon - Kutu)
            doc.rect(x + w - 30, y + h - 30, 20, 20);
            doc.setFontSize(6);
            doc.text('QR', x + w - 23, y + h - 18);

            // Koordinat artır
            col++;
            if (col > 1) { col = 0; row++; }
        });

        window.open(doc.output('bloburl'), '_blank');
    }
});
// --- EXCEL ŞABLON İNDİR ---
function downloadExcelTemplate() {
    // 1. Şablon Verisi (Başlıklar ve Örnek Satırlar)
    const data = [
        ["Parça Adı", "En (mm)", "Boy (mm)", "Adet"], // Başlık Satırı (A1, B1, C1, D1)
        ["Mutfak Kapak", 450, 720, 2],                 // Örnek 1
        ["Çekmece Önü", 450, 180, 4],                 // Örnek 2
        ["Raf", 300, 500, 1]                          // Örnek 3
    ];

    // 2. Çalışma Kitabı Oluştur
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // 3. Sütun Genişliklerini Ayarla (Görsel Güzellik)
    ws['!cols'] = [
        { wch: 20 }, // A sütunu genişliği
        { wch: 10 }, // B
        { wch: 10 }, // C
        { wch: 10 }  // D
    ];

    // 4. Sayfayı Kitaba Ekle
    XLSX.utils.book_append_sheet(wb, ws, "Kesim Listesi");

    // 5. İndir
    XLSX.writeFile(wb, "MdfKesim_Sablon.xlsx");
}