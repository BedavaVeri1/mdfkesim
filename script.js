document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENTLERİ ---
    const partsList = document.getElementById('parts-list');
    const addPartBtn = document.getElementById('add-part-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const pdfBtn = document.getElementById('download-pdf-btn'); // PDF Butonu
    const canvas = document.getElementById('cutCanvas');
    const ctx = canvas.getContext('2d');
    const stdStockSelect = document.getElementById('stdStockSelect');
    const stockWInput = document.getElementById('stockW');
    const stockHInput = document.getElementById('stockH');

    // Renk Haritası
    let colorMap = {};
    // PDF için hesaplanan veriyi sakla
    let lastCalculatedSheets = [];
    let lastStockW = 0;
    let lastStockH = 0;

    // Başlangıç
    addPartRow();

    // --- EVENT LISTENERS ---
    if (addPartBtn) addPartBtn.addEventListener('click', () => addPartRow());
    if (calculateBtn) calculateBtn.addEventListener('click', runOptimization);
    if (pdfBtn) pdfBtn.addEventListener('click', generatePDF); // PDF Click

    // Standart Ölçü Seçimi
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

    // --- GUILLOTINE PACKER ALGORİTMASI ---
    class GuillotinePacker {
        constructor(width, height) {
            this.binWidth = width;
            this.binHeight = height;
            this.freeRectangles = [{ x: 0, y: 0, w: width, h: height }];
            this.placedBlocks = [];
        }

        fit(blocks) {
            const remainingBlocks = blocks.filter(b => !b.fit);
            remainingBlocks.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));

            remainingBlocks.forEach(block => {
                const node = this.findPositionForNewNode(block);
                if (node) {
                    block.fit = node;
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
            const rightW = freeRect.w - w;
            const bottomH = freeRect.h - h;

            if (rightW > bottomH) {
                if (rightW > 0) this.freeRectangles.push({ x: freeRect.x + w, y: freeRect.y, w: rightW, h: h });
                if (bottomH > 0) this.freeRectangles.push({ x: freeRect.x, y: freeRect.y + h, w: freeRect.w, h: bottomH });
            } else {
                if (rightW > 0) this.freeRectangles.push({ x: freeRect.x + w, y: freeRect.y, w: rightW, h: freeRect.h });
                if (bottomH > 0) this.freeRectangles.push({ x: freeRect.x, y: freeRect.y + h, w: w, h: bottomH });
            }
            this.freeRectangles = this.freeRectangles.filter(r => r.w > 0 && r.h > 0);
        }
    }

    // --- HESAPLAMA ---
    function runOptimization() {
        const stockW = parseFloat(document.getElementById('stockW').value) || 0;
        const stockH = parseFloat(document.getElementById('stockH').value) || 0;
        const kerf = parseFloat(document.getElementById('kerf').value) || 0;
        lastStockW = stockW;
        lastStockH = stockH;

        let allBlocks = [];
        document.querySelectorAll('.part-row').forEach(row => {
            const w = parseFloat(row.querySelector('.p-w').value);
            const h = parseFloat(row.querySelector('.p-h').value);
            const q = parseInt(row.querySelector('.p-q').value);
            if (w && h && q) {
                for (let i = 0; i < q; i++) {
                    allBlocks.push({ w: w + kerf, h: h + kerf, realW: w, realH: h, fit: null });
                }
            }
        });

        if (allBlocks.length === 0 || stockW === 0 || stockH === 0) {
            alert("Lütfen bilgileri eksiksiz girin.");
            return;
        }

        let sheets = [];
        let safetyLoop = 0;

        while (allBlocks.some(b => !b.fit) && safetyLoop < 100) {
            const packer = new GuillotinePacker(stockW, stockH);
            packer.fit(allBlocks);
            if (packer.placedBlocks.length > 0) sheets.push(packer);
            else break;
            safetyLoop++;
        }

        // Global değişkene kaydet (PDF için)
        lastCalculatedSheets = sheets;

        // İstatistik
        let totalUsedArea = 0;
        sheets.forEach(sheet => {
            sheet.placedBlocks.forEach(b => totalUsedArea += b.realW * b.realH);
        });
        const totalSheetArea = sheets.length * (stockW * stockH);
        const efficiency = totalSheetArea > 0 ? (totalUsedArea / totalSheetArea) * 100 : 0;

        document.getElementById('total-sheets').innerText = sheets.length;
        document.getElementById('efficiency-rate').innerText = "%" + efficiency.toFixed(1);
        document.getElementById('waste-rate').innerText = "%" + (100 - efficiency).toFixed(1);

        const unplacedCount = allBlocks.filter(b => !b.fit).length;
        if (unplacedCount > 0) alert(`${unplacedCount} adet parça sığmadı!`);

        // PDF Butonunu göster
        pdfBtn.style.display = 'block';

        drawAllSheets(stockW, stockH, sheets);
    }

    // --- EKRAN ÇİZİMİ ---
    function drawAllSheets(stockW, stockH, sheets) {
        const GAP = 50;
        const wrapper = document.querySelector('.canvas-wrapper');
        const availH = wrapper.clientHeight - 40;

        let scale = availH / stockH;
        if (scale < 0.1) scale = 0.1;

        const totalW = (stockW * scale * sheets.length) + (GAP * (sheets.length - 1)) + 100;

        canvas.width = totalW;
        canvas.height = (stockH * scale) + 60;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        sheets.forEach((sheet, index) => {
            const startX = index * (stockW * scale + GAP) + 20;
            const startY = 40;

            ctx.fillStyle = '#333';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`${index + 1}. Plaka (MdfKesim)`, startX, 25);

            ctx.fillStyle = '#e2c799';
            ctx.fillRect(startX, startY, stockW * scale, stockH * scale);
            ctx.strokeStyle = '#8d5a2a';
            ctx.lineWidth = 2;
            ctx.strokeRect(startX, startY, stockW * scale, stockH * scale);

            sheet.placedBlocks.forEach(block => {
                const x = startX + (block.fit.x * scale);
                const y = startY + (block.fit.y * scale);

                let drawW = (block.fit.rotated ? block.realH : block.realW) * scale;
                let drawH = (block.fit.rotated ? block.realW : block.realH) * scale;

                const dimKey = Math.min(block.realW, block.realH) + 'x' + Math.max(block.realW, block.realH);
                ctx.fillStyle = getColorForDimension(dimKey);
                ctx.fillRect(x, y, drawW, drawH);
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, drawW, drawH);

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

    // --- PDF OLUŞTURMA FONKSİYONU ---
    async function generatePDF() {
        if (!lastCalculatedSheets || lastCalculatedSheets.length === 0) return;

        const { jsPDF } = window.jspdf;
        // PDF dökümanı oluştur (Yatay - Landscape)
        const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Geçici bir canvas oluştur (Yüksek çözünürlük için)
        const tempCanvas = document.createElement('canvas');
        const tCtx = tempCanvas.getContext('2d');

        // Yüksek kalite için scale faktörü
        const renderScale = 0.5; // Pixel/mm oranı (ayarlanabilir)

        for (let i = 0; i < lastCalculatedSheets.length; i++) {
            if (i > 0) doc.addPage(); // İlk sayfa hariç yeni sayfa ekle

            const sheet = lastCalculatedSheets[i];

            // Canvas'ı plaka boyutuna ayarla (Pixel cinsinden)
            tempCanvas.width = lastStockW * renderScale;
            tempCanvas.height = lastStockH * renderScale;

            // Temizle ve Zemin Çiz
            tCtx.fillStyle = '#ffffff'; // Kağıt beyazı
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

            // Plaka Sınırları
            tCtx.fillStyle = '#eee';
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tCtx.strokeStyle = '#000';
            tCtx.lineWidth = 2;
            tCtx.strokeRect(0, 0, tempCanvas.width, tempCanvas.height);

            // Parçaları Çiz (Temp Canvas'a)
            sheet.placedBlocks.forEach(block => {
                const x = block.fit.x * renderScale;
                const y = block.fit.y * renderScale;
                const w = (block.fit.rotated ? block.realH : block.realW) * renderScale;
                const h = (block.fit.rotated ? block.realW : block.realH) * renderScale;

                // PDF'te gri tonlama daha şık durur ama renkli de olur
                // tCtx.fillStyle = '#ddd'; 
                const dimKey = Math.min(block.realW, block.realH) + 'x' + Math.max(block.realW, block.realH);
                tCtx.fillStyle = getColorForDimension(dimKey);

                tCtx.fillRect(x, y, w, h);
                tCtx.strokeStyle = '#000';
                tCtx.lineWidth = 2; // Çizgi kalınlığı
                tCtx.strokeRect(x, y, w, h);

                // Yazı
                tCtx.fillStyle = '#000';
                tCtx.font = 'bold 24px Arial'; // PDF için büyük font
                tCtx.textAlign = 'center';
                tCtx.textBaseline = 'middle';
                const text = block.fit.rotated
                    ? `${block.realW}x${block.realH} (R)`
                    : `${block.realW}x${block.realH}`;

                // Çok küçük parçalara yazma
                if (w > 40 && h > 20) {
                    tCtx.fillText(text, x + w / 2, y + h / 2);
                }
            });

            // Canvas'ı Resme Dönüştür
            const imgData = tempCanvas.toDataURL('image/jpeg', 0.8);

            // Resmi PDF'e sığdır (Aspect Ratio koruyarak)
            const ratio = Math.min((pageWidth - 20) / lastStockW, (pageHeight - 20) / lastStockH);
            const pdfW = lastStockW * ratio;
            const pdfH = lastStockH * ratio;

            const marginX = (pageWidth - pdfW) / 2;
            const marginY = (pageHeight - pdfH) / 2;

            doc.setFontSize(16);
            doc.text(`MdfKesim Planı - Plaka ${i + 1}`, 10, 10);
            doc.text(`Stok: ${lastStockW}x${lastStockH}mm`, 10, 18);

            doc.addImage(imgData, 'JPEG', marginX, marginY + 5, pdfW, pdfH);
        }

        // İndir
        doc.save('MdfKesim-Planlari.pdf');
    }

    function getColorForDimension(key) {
        if (!colorMap[key]) {
            const hue = Math.floor(Math.random() * 360);
            colorMap[key] = `hsl(${hue}, 60%, 80%)`;
        }
        return colorMap[key];
    }
});