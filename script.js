document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENTLERİ ---
    const partsList = document.getElementById('parts-list');
    const addPartBtn = document.getElementById('add-part-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const canvas = document.getElementById('cutCanvas');
    const ctx = canvas.getContext('2d');
    const stdStockSelect = document.getElementById('stdStockSelect');
    const stockWInput = document.getElementById('stockW');
    const stockHInput = document.getElementById('stockH');

    // Renk Haritası (Boyut -> Renk)
    let colorMap = {};

    // Başlangıç
    addPartRow();

    // --- EVENT LISTENERS ---
    if (addPartBtn) addPartBtn.addEventListener('click', () => addPartRow());
    if (calculateBtn) calculateBtn.addEventListener('click', runOptimization);

    // Standart Ölçü Seçimi Mantığı
    if (stdStockSelect) {
        stdStockSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'custom') {
                stockWInput.readOnly = false;
                stockHInput.readOnly = false;
                stockWInput.focus();
            } else {
                const [w, h] = val.split('-');
                stockWInput.value = w;
                stockHInput.value = h;
                // Kullanıcı değiştiremesin diye kilitleyebiliriz veya serbest bırakabiliriz
                // Ben kolaylık olsun diye serbest bırakıyorum ama değerleri atadım.
            }
        });
    }

    function addPartRow() {
        const row = document.createElement('div');
        row.className = 'part-row';
        row.innerHTML = `
            <input type="number" placeholder="G" class="p-w">
            <input type="number" placeholder="Y" class="p-h">
            <input type="number" value="1" class="p-q">
            <button class="btn-del"><i class="fas fa-trash"></i></button>
        `;
        row.querySelector('.btn-del').addEventListener('click', function () { row.remove(); });
        partsList.appendChild(row);
    }

    // --- GUILLOTINE PACKER CLASS ---
    class GuillotinePacker {
        constructor(width, height) {
            this.binWidth = width;
            this.binHeight = height;
            this.freeRectangles = [{ x: 0, y: 0, w: width, h: height }];
            this.placedBlocks = [];
        }

        fit(blocks) {
            // Sadece bu plakaya sığabilecekleri dene
            // Henüz yerleşmemiş (fit: null) olanları al
            const remainingBlocks = blocks.filter(b => !b.fit);

            // Strateji: Uzun kenarı büyük olan öncelikli
            remainingBlocks.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));

            remainingBlocks.forEach(block => {
                const node = this.findPositionForNewNode(block);
                if (node) {
                    // Blok yerleşti, işaretle
                    block.fit = node;
                    // Bu packer'ın yerleştirdiği bloklar listesine ekle
                    this.placedBlocks.push(block);
                    this.splitFreeRectangles(node);
                }
            });
        }

        findPositionForNewNode(block) {
            let bestNode = null;
            let bestScore = Number.MAX_VALUE;

            for (let i = 0; i < this.freeRectangles.length; i++) {
                const freeRect = this.freeRectangles[i];

                // Normal
                if (block.w <= freeRect.w && block.h <= freeRect.h) {
                    const score = this.calculateScore(freeRect, block.w, block.h);
                    if (score < bestScore) {
                        bestNode = { x: freeRect.x, y: freeRect.y, w: block.w, h: block.h, rotated: false, freeRectIndex: i };
                        bestScore = score;
                    }
                }
                // Döndürülmüş
                if (block.h <= freeRect.w && block.w <= freeRect.h) {
                    const score = this.calculateScore(freeRect, block.h, block.w);
                    if (score < bestScore) {
                        bestNode = { x: freeRect.x, y: freeRect.y, w: block.h, h: block.w, rotated: true, freeRectIndex: i };
                        bestScore = score;
                    }
                }
            }
            return bestNode;
        }

        calculateScore(freeRect, width, height) {
            const leftoverHoriz = Math.abs(freeRect.w - width);
            const leftoverVert = Math.abs(freeRect.h - height);
            return Math.min(leftoverHoriz, leftoverVert);
        }

        splitFreeRectangles(placedNode) {
            const freeRect = this.freeRectangles[placedNode.freeRectIndex];
            this.freeRectangles.splice(placedNode.freeRectIndex, 1);

            const w = placedNode.w;
            const h = placedNode.h;

            // Kalan alanları hesapla
            const rightW = freeRect.w - w;
            const bottomH = freeRect.h - h;

            // Short Axis Split
            if (rightW > bottomH) {
                if (rightW > 0) this.freeRectangles.push({ x: freeRect.x + w, y: freeRect.y, w: rightW, h: h });
                if (bottomH > 0) this.freeRectangles.push({ x: freeRect.x, y: freeRect.y + h, w: freeRect.w, h: bottomH }); // bottom full width
            } else {
                if (rightW > 0) this.freeRectangles.push({ x: freeRect.x + w, y: freeRect.y, w: rightW, h: freeRect.h }); // right full height
                if (bottomH > 0) this.freeRectangles.push({ x: freeRect.x, y: freeRect.y + h, w: w, h: bottomH });
            }

            // Temizlik (çok küçük parçaları sil)
            this.freeRectangles = this.freeRectangles.filter(r => r.w > 0 && r.h > 0);
        }
    }

    // --- ÇOKLU PLAKA YÖNETİMİ ---
    function runOptimization() {
        // Renk haritasını sıfırla (İstersen sıfırlamayabilirsin, renkler sabit kalsın diye)
        // colorMap = {}; 

        const stockW = parseFloat(document.getElementById('stockW').value) || 0;
        const stockH = parseFloat(document.getElementById('stockH').value) || 0;
        const kerf = parseFloat(document.getElementById('kerf').value) || 0;

        let allBlocks = [];

        // Girdileri Al
        document.querySelectorAll('.part-row').forEach(row => {
            const w = parseFloat(row.querySelector('.p-w').value);
            const h = parseFloat(row.querySelector('.p-h').value);
            const q = parseInt(row.querySelector('.p-q').value);

            if (w && h && q) {
                for (let i = 0; i < q; i++) {
                    allBlocks.push({
                        w: w + kerf,
                        h: h + kerf,
                        realW: w,
                        realH: h,
                        fit: null,
                        id: i // unique id gerekebilir
                    });
                }
            }
        });

        if (allBlocks.length === 0 || stockW === 0 || stockH === 0) {
            alert("Lütfen bilgileri eksiksiz girin.");
            return;
        }

        // --- MULTI-BIN PACKING LOOP ---
        let sheets = []; // Kullanılan plakaları burada tutacağız
        let safetyLoop = 0;

        // Tüm parçalar yerleşene kadar yeni plaka aç
        while (allBlocks.some(b => !b.fit) && safetyLoop < 100) {
            const packer = new GuillotinePacker(stockW, stockH);
            packer.fit(allBlocks);

            // Bu plakaya yerleşen oldu mu?
            if (packer.placedBlocks.length > 0) {
                sheets.push(packer);
            } else {
                // Eğer hiç parça yerleşmediyse ve hala yerleşmemiş parça varsa,
                // demek ki kalan parçalar plaka boyutundan BÜYÜK. Döngüyü kır.
                break;
            }
            safetyLoop++;
        }

        // İstatistikler (Tüm plakaların ortalaması)
        let totalUsedArea = 0;
        const oneSheetArea = stockW * stockH;

        sheets.forEach(sheet => {
            sheet.placedBlocks.forEach(b => {
                totalUsedArea += b.realW * b.realH;
            });
        });

        const totalSheetArea = sheets.length * oneSheetArea;
        const efficiency = totalSheetArea > 0 ? (totalUsedArea / totalSheetArea) * 100 : 0;

        document.getElementById('total-sheets').innerText = sheets.length;
        document.getElementById('efficiency-rate').innerText = "%" + efficiency.toFixed(1);
        document.getElementById('waste-rate').innerText = "%" + (100 - efficiency).toFixed(1);

        // Hata Kontrolü
        const unplacedCount = allBlocks.filter(b => !b.fit).length;
        if (unplacedCount > 0) {
            alert(`${unplacedCount} adet parça çok büyük olduğu için hiçbir plakaya sığmadı!`);
        }

        // Çizim
        drawAllSheets(stockW, stockH, sheets);
    }

    // --- GELİŞMİŞ ÇİZİM ---
    function drawAllSheets(stockW, stockH, sheets) {
        // Ekrana sığdırma hesabı
        // Plakaları yan yana çizeceğiz, aralarında boşluk olacak
        const GAP = 50;
        const wrapper = document.querySelector('.canvas-wrapper');
        const availH = wrapper.clientHeight - 40; // Yükseklik kısıtlı

        // Ölçek, yüksekliğe göre belirlensin ki hepsi ekrana sığsın
        // (Veya genişlik çok fazlaysa scroll çıkar)
        let scale = availH / stockH;

        // Çok küçük olmasın
        if (scale < 0.1) scale = 0.1;

        // Canvas Genişliği = (Plaka Genişliği * Plaka Sayısı) + Boşluklar
        const totalW = (stockW * scale * sheets.length) + (GAP * (sheets.length - 1)) + 100; // +padding

        canvas.width = totalW;
        canvas.height = (stockH * scale) + 60; // +Başlık payı

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Her plakayı çiz
        sheets.forEach((sheet, index) => {
            const startX = index * (stockW * scale + GAP) + 20;
            const startY = 40; // Başlık için yer bırak

            // Plaka Başlığı
            ctx.fillStyle = '#333';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`${index + 1}. Plaka`, startX, 25);

            // Plaka Zemin
            ctx.fillStyle = '#e2c799';
            ctx.fillRect(startX, startY, stockW * scale, stockH * scale);
            ctx.strokeStyle = '#8d5a2a';
            ctx.lineWidth = 2;
            ctx.strokeRect(startX, startY, stockW * scale, stockH * scale);

            // Parçalar
            sheet.placedBlocks.forEach(block => {
                // Koordinatlar (Global canvas'a göre offsetle)
                const x = startX + (block.fit.x * scale);
                const y = startY + (block.fit.y * scale);

                let drawW, drawH;
                if (block.fit.rotated) {
                    drawW = block.realH * scale;
                    drawH = block.realW * scale;
                } else {
                    drawW = block.realW * scale;
                    drawH = block.realH * scale;
                }

                // RENK SEÇİMİ (Boyuta göre)
                // Boyut stringi oluştur: "200x500"
                // Döndürülmüş olsa bile standart bir key oluşturmak için küçükx büyük yap
                const dimKey = Math.min(block.realW, block.realH) + 'x' + Math.max(block.realW, block.realH);
                ctx.fillStyle = getColorForDimension(dimKey);

                ctx.fillRect(x, y, drawW, drawH);
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, drawW, drawH);

                // Metin
                if (drawW > 20 && drawH > 14) {
                    ctx.fillStyle = '#000';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const text = block.fit.rotated
                        ? `${block.realW}x${block.realH}`
                        : `${block.realW}x${block.realH}`;
                    ctx.fillText(text, x + drawW / 2, y + drawH / 2);
                }
            });
        });
    }

    // Rastgele ama tutarlı renk üretici
    function getColorForDimension(key) {
        if (!colorMap[key]) {
            // Yeni bir pastel renk üret ve kaydet
            const hue = Math.floor(Math.random() * 360);
            const sat = 60 + Math.random() * 20; // %60-80
            const lig = 75 + Math.random() * 15; // %75-90
            colorMap[key] = `hsl(${hue}, ${sat}%, ${lig}%)`;
        }
        return colorMap[key];
    }
});