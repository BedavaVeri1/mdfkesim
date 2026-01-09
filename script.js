document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENTLERİ ---
    const partsList = document.getElementById('parts-list');
    const addPartBtn = document.getElementById('add-part-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const canvas = document.getElementById('cutCanvas');
    const ctx = canvas.getContext('2d');
    const statsBar = document.querySelector('.stats-bar');

    // Başlangıç satırı
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

    // --- ROBUST GUILLOTINE PACKER ---
    class GuillotinePacker {
        constructor(width, height) {
            this.binWidth = width;
            this.binHeight = height;
            this.freeRectangles = [{ x: 0, y: 0, w: width, h: height }];
        }

        fit(blocks) {
            // 1. Stratejik Sıralama: En uzun kenarı büyük olanı önce yerleştir.
            // Bu, uzun ince parçaların (75x250 gibi) yer bulmasını kolaylaştırır.
            blocks.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));

            blocks.forEach(block => {
                const node = this.findPositionForNewNode(block);
                if (node) {
                    block.fit = node;
                    this.splitFreeRectangles(node);
                }
            });
        }

        findPositionForNewNode(block) {
            let bestNode = null;
            let bestScore = Number.MAX_VALUE;

            // Tüm boş dikdörtgenleri tara
            for (let i = 0; i < this.freeRectangles.length; i++) {
                const freeRect = this.freeRectangles[i];

                // 1. Normal Yerleşim Dene
                if (block.w <= freeRect.w && block.h <= freeRect.h) {
                    const score = this.calculateScore(freeRect, block.w, block.h);
                    if (score < bestScore) {
                        bestNode = { x: freeRect.x, y: freeRect.y, w: block.w, h: block.h, rotated: false, freeRectIndex: i };
                        bestScore = score;
                    }
                }

                // 2. Döndürülmüş Yerleşim Dene
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

        // BSSF (Best Short Side Fit) Skoru: Kalan kısa kenarı en aza indiren yeri seç
        calculateScore(freeRect, width, height) {
            const leftoverHoriz = Math.abs(freeRect.w - width);
            const leftoverVert = Math.abs(freeRect.h - height);
            return Math.min(leftoverHoriz, leftoverVert);
        }

        splitFreeRectangles(placedNode) {
            // Kullanılan boş alanı listeden çıkar
            const freeRect = this.freeRectangles[placedNode.freeRectIndex];
            this.freeRectangles.splice(placedNode.freeRectIndex, 1);

            // Giyotin Kesim Mantığı (Split):
            // Kalan alanı ikiye böl: Alt ve Sağ.
            // Hangi eksenden böleceğimize karar verirken, büyük bütünlük sağlayan ekseni seçiyoruz.

            const w = placedNode.w;
            const h = placedNode.h;

            // Kalan alanlar
            const rightW = freeRect.w - w;
            const rightH = freeRect.h; // Başlangıçta tam boy

            const bottomW = freeRect.w; // Başlangıçta tam boy
            const bottomH = freeRect.h - h;

            // Strateji: "Shorter Axis Split" (Kısa ekseni böl)
            // Bu strateji, kalan dikdörtgenlerin alanını maksimize eder.

            if (rightW > bottomH) {
                // Yatay Bölme (Horizontal Split) -> Sağ tarafı parça boyunda kes, alt taraf tüm genişlikte kalsın
                if (rightW > 0)
                    this.freeRectangles.push({ x: freeRect.x + w, y: freeRect.y, w: rightW, h: h });
                if (bottomH > 0)
                    this.freeRectangles.push({ x: freeRect.x, y: freeRect.y + h, w: freeRect.w, h: bottomH });
            } else {
                // Dikey Bölme (Vertical Split) -> Alt tarafı parça eninde kes, sağ taraf tüm yükseklikte kalsın
                if (rightW > 0)
                    this.freeRectangles.push({ x: freeRect.x + w, y: freeRect.y, w: rightW, h: freeRect.h });
                if (bottomH > 0)
                    this.freeRectangles.push({ x: freeRect.x, y: freeRect.y + h, w: w, h: bottomH });
            }

            // Küçük ve işe yaramaz boşlukları temizle (temizlik)
            this.mergeFreeRectangles();
        }

        mergeFreeRectangles() {
            // Bu basit versiyonda merge yapmıyoruz, çünkü giyotin mantığında split daha kritik.
            // Sadece sıfır boyutluları temizleyelim.
            this.freeRectangles = this.freeRectangles.filter(r => r.w > 0 && r.h > 0);
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
                    // Hesaplama için bıçak payını ekle
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
            alert("Lütfen tüm alanları doldurun.");
            return;
        }

        const packer = new GuillotinePacker(stockW, stockH);
        packer.fit(blocks);

        // Sonuçları Analiz Et
        let usedArea = 0;
        let placedCount = 0;
        let unplacedParts = [];

        blocks.forEach(block => {
            if (block.fit) {
                usedArea += block.realW * block.realH;
                placedCount++;
            } else {
                unplacedParts.push(`${block.realW}x${block.realH}`);
            }
        });

        const totalArea = stockW * stockH;
        const efficiency = totalArea > 0 ? (usedArea / totalArea) * 100 : 0;

        document.getElementById('total-sheets').innerText = "1";
        document.getElementById('efficiency-rate').innerText = "%" + efficiency.toFixed(1);
        document.getElementById('waste-rate').innerText = "%" + (100 - efficiency).toFixed(1);

        // Hata Mesajı Alanı Temizle/Oluştur
        let errorDiv = document.getElementById('error-msg');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'error-msg';
            errorDiv.style.color = 'red';
            errorDiv.style.marginTop = '10px';
            errorDiv.style.fontWeight = 'bold';
            statsBar.parentElement.insertBefore(errorDiv, statsBar.nextSibling);
        }

        if (unplacedParts.length > 0) {
            errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> Sığmayan Parçalar: ${unplacedParts.join(', ')}`;
        } else {
            errorDiv.innerHTML = '';
        }

        drawResult(stockW, stockH, blocks);
    }

    // --- ÇİZİM ---
    function drawResult(stockW, stockH, blocks) {
        const wrapper = document.querySelector('.canvas-wrapper');
        const margin = 40;

        // Wrapper boyutlarını al
        const availW = wrapper.clientWidth - margin;
        const availH = wrapper.clientHeight - margin;

        // Ölçek
        const scale = Math.min(availW / stockW, availH / stockH);

        canvas.width = stockW * scale;
        canvas.height = stockH * scale;

        // Temizle
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Stok Plaka
        ctx.fillStyle = '#e2c799';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#8d5a2a';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        // Parçalar
        blocks.forEach(block => {
            if (block.fit) {
                const x = block.fit.x * scale;
                const y = block.fit.y * scale;

                // Çizilecek boyut (döndürme kontrolü)
                let drawW, drawH;
                if (block.fit.rotated) {
                    drawW = block.realH * scale;
                    drawH = block.realW * scale;
                } else {
                    drawW = block.realW * scale;
                    drawH = block.realH * scale;
                }

                // Renklendirme
                ctx.fillStyle = getRandomColor();
                ctx.fillRect(x, y, drawW, drawH);

                // Kenarlık
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, drawW, drawH);

                // Yazı
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
        return `hsl(${hue}, 70%, 85%)`;
    }
});