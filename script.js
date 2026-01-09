document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENTLERİ ---
    const partsList = document.getElementById('parts-list');
    const addPartBtn = document.getElementById('add-part-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const canvas = document.getElementById('cutCanvas');
    const ctx = canvas.getContext('2d');

    // Başlangıçta 1 boş satır ekle
    addPartRow();

    // --- OLAY DİNLEYİCİLERİ ---
    if (addPartBtn) addPartBtn.addEventListener('click', () => addPartRow());
    if (calculateBtn) calculateBtn.addEventListener('click', runOptimization);

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

    // --- GÜÇLÜ ALGORİTMA: GUILLOTINE PACKER ---
    class GuillotinePacker {
        constructor(width, height) {
            this.binWidth = width;
            this.binHeight = height;
            // Başlangıçta tüm plaka tek bir boş dikdörtgendir
            this.freeRectangles = [{ x: 0, y: 0, w: width, h: height }];
        }

        fit(blocks) {
            // Parçaları yerleştirmeyi dene
            // Önce uzun kenarı, sonra kısa kenarı, sonra alanı büyük olanı dene (heuristic)
            blocks.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));

            blocks.forEach(block => {
                const node = this.findPositionForNewNode(block.w, block.h, block);

                if (node) {
                    block.fit = node;
                    this.splitFreeRectangles(node);
                }
            });
        }

        findPositionForNewNode(width, height, block) {
            let bestNode = null;
            let bestShortSideFit = Number.MAX_VALUE;
            let bestLongSideFit = Number.MAX_VALUE;

            // Tüm boş dikdörtgenleri tara
            for (let i = 0; i < this.freeRectangles.length; i++) {
                const freeRect = this.freeRectangles[i];

                // 1. Düz Deneme (Normal)
                this.tryFit(freeRect, width, height, false, block, (fit, shortSideFit, longSideFit) => {
                    if (fit && shortSideFit < bestShortSideFit) {
                        bestNode = fit;
                        bestShortSideFit = shortSideFit;
                        bestLongSideFit = longSideFit;
                    }
                });

                // 2. Döndürerek Deneme (Rotation)
                this.tryFit(freeRect, height, width, true, block, (fit, shortSideFit, longSideFit) => {
                    if (fit && shortSideFit < bestShortSideFit) {
                        bestNode = fit;
                        bestShortSideFit = shortSideFit;
                        bestLongSideFit = longSideFit;
                    }
                });
            }
            return bestNode;
        }

        tryFit(freeRect, width, height, rotated, block, callback) {
            // Sığıyor mu kontrolü
            if (freeRect.w >= width && freeRect.h >= height) {
                const shortSideFit = Math.min(freeRect.w - width, freeRect.h - height);
                const longSideFit = Math.max(freeRect.w - width, freeRect.h - height);

                callback({
                    x: freeRect.x,
                    y: freeRect.y,
                    w: width,
                    h: height,
                    rotated: rotated,
                    realW: block.realW,
                    realH: block.realH
                }, shortSideFit, longSideFit);
            }
        }

        splitFreeRectangles(placedNode) {
            // Yerleşen parçanın kapladığı alan ile çakışan tüm boş dikdörtgenleri bul ve böl
            const n = this.freeRectangles.length;
            for (let i = 0; i < n; i++) {
                if (this.intersect(this.freeRectangles[i], placedNode)) {
                    const newFreeRects = this.splitFreeRect(this.freeRectangles[i], placedNode);
                    this.freeRectangles.splice(i, 1);
                    this.freeRectangles.push(...newFreeRects);
                    i--; // Listeyi modifiye ettiğimiz için indeksi geri al
                }
            }

            // İç içe geçmiş küçük boşlukları temizle (Optimistayon)
            this.pruneFreeRectangles();
        }

        splitFreeRect(freeRect, placedNode) {
            // Giyotin mantığı: Bir dikdörtgeni diğerine göre böl ve yeni parçalar oluştur
            const result = [];

            // Üstteki boşluk
            if (placedNode.y > freeRect.y && placedNode.y < freeRect.y + freeRect.h) {
                result.push({
                    x: freeRect.x,
                    y: freeRect.y,
                    w: freeRect.w,
                    h: placedNode.y - freeRect.y
                });
            }
            // Alttaki boşluk
            if (placedNode.y + placedNode.h < freeRect.y + freeRect.h) {
                result.push({
                    x: freeRect.x,
                    y: placedNode.y + placedNode.h,
                    w: freeRect.w,
                    h: freeRect.y + freeRect.h - (placedNode.y + placedNode.h)
                });
            }
            // Soldaki boşluk
            if (placedNode.x > freeRect.x && placedNode.x < freeRect.x + freeRect.w) {
                result.push({
                    x: freeRect.x,
                    y: freeRect.y,
                    w: placedNode.x - freeRect.x,
                    h: freeRect.h
                });
            }
            // Sağdaki boşluk
            if (placedNode.x + placedNode.w < freeRect.x + freeRect.w) {
                result.push({
                    x: placedNode.x + placedNode.w,
                    y: freeRect.y,
                    w: freeRect.x + freeRect.w - (placedNode.x + placedNode.w),
                    h: freeRect.h
                });
            }
            return result;
        }

        intersect(r1, r2) {
            return !(r2.x >= r1.x + r1.w ||
                r2.x + r2.w <= r1.x ||
                r2.y >= r1.y + r1.h ||
                r2.y + r2.h <= r1.y);
        }

        pruneFreeRectangles() {
            // Gereksiz veya kapsanan boş alanları temizle
            for (let i = 0; i < this.freeRectangles.length; i++) {
                for (let j = i + 1; j < this.freeRectangles.length; j++) {
                    if (this.isContained(this.freeRectangles[i], this.freeRectangles[j])) {
                        this.freeRectangles.splice(i, 1);
                        i--;
                        break;
                    }
                    if (this.isContained(this.freeRectangles[j], this.freeRectangles[i])) {
                        this.freeRectangles.splice(j, 1);
                        j--;
                    }
                }
            }
        }

        isContained(a, b) {
            return a.x >= b.x && a.y >= b.y &&
                a.x + a.w <= b.x + b.w &&
                a.y + a.h <= b.y + b.h;
        }
    }

    // --- ANA HESAPLAMA ---
    function runOptimization() {
        const stockW = parseFloat(document.getElementById('stockW').value) || 0;
        const stockH = parseFloat(document.getElementById('stockH').value) || 0;
        const kerf = parseFloat(document.getElementById('kerf').value) || 0;

        let blocks = [];

        // Girdileri Al
        document.querySelectorAll('.part-row').forEach(row => {
            const w = parseFloat(row.querySelector('.p-w').value);
            const h = parseFloat(row.querySelector('.p-h').value);
            const q = parseInt(row.querySelector('.p-q').value);

            if (w && h && q) {
                for (let i = 0; i < q; i++) {
                    // Hesaplamaya bıçak payını ekle
                    blocks.push({
                        w: w + kerf,
                        h: h + kerf,
                        realW: w,
                        realH: h,
                        fit: null
                    });
                }
            }
        });

        if (blocks.length === 0 || stockW === 0 || stockH === 0) {
            alert("Lütfen stok ve parça ölçülerini eksiksiz girin.");
            return;
        }

        // --- OPTİMİZASYONU ÇALIŞTIR ---
        const packer = new GuillotinePacker(stockW, stockH);
        packer.fit(blocks);

        // İstatistikler
        let usedArea = 0;
        let placedCount = 0;
        blocks.forEach(block => {
            if (block.fit) {
                usedArea += block.realW * block.realH;
                placedCount++;
            }
        });

        const totalArea = stockW * stockH;
        const efficiency = totalArea > 0 ? (usedArea / totalArea) * 100 : 0;

        document.getElementById('total-sheets').innerText = "1";
        document.getElementById('efficiency-rate').innerText = "%" + efficiency.toFixed(1);
        document.getElementById('waste-rate').innerText = "%" + (100 - efficiency).toFixed(1);

        // Çizim
        drawResult(stockW, stockH, blocks);
    }

    // --- ÇİZİM FONKSİYONU ---
    function drawResult(stockW, stockH, blocks) {
        const wrapper = document.querySelector('.canvas-wrapper');
        const margin = 40;
        const availableWidth = wrapper.clientWidth - margin;
        const availableHeight = wrapper.clientHeight - margin;

        const scale = Math.min(availableWidth / stockW, availableHeight / stockH);

        canvas.width = stockW * scale;
        canvas.height = stockH * scale;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Ana Plaka
        ctx.fillStyle = '#e2c799';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#8d5a2a';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        // Yerleşen Parçalar
        blocks.forEach(block => {
            if (block.fit) {
                const x = block.fit.x * scale;
                const y = block.fit.y * scale;

                // Çizimde döndürülmüş mü kontrol et
                let drawW, drawH;
                if (block.fit.rotated) {
                    drawW = block.realH * scale;
                    drawH = block.realW * scale;
                } else {
                    drawW = block.realW * scale;
                    drawH = block.realH * scale;
                }

                ctx.fillStyle = getRandomColor();
                ctx.fillRect(x, y, drawW, drawH);

                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, drawW, drawH);

                // Metin
                if (drawW > 30 && drawH > 15) {
                    ctx.fillStyle = '#000';
                    ctx.font = '11px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const text = block.fit.rotated
                        ? `${block.realW}x${block.realH} (R)`
                        : `${block.realW}x${block.realH}`;
                    ctx.fillText(text, x + drawW / 2, y + drawH / 2);
                }
            }
        });
    }

    function getRandomColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 65%, 80%)`;
    }
});