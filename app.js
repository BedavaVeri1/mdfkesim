// --- TEMEL SINIFLAR VE ALGORİTMA ---

class Packer {
    constructor(w, h) {
        this.root = { x: 0, y: 0, w: w, h: h };
    }

    fit(blocks) {
        let n, node, block;
        // Önce büyük parçaları yerleştirmek verimi artırır
        blocks.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));

        for (n = 0; n < blocks.length; n++) {
            block = blocks[n];
            if (node = this.findNode(this.root, block.w, block.h))
                block.fit = this.splitNode(node, block.w, block.h);
        }
    }

    findNode(root, w, h) {
        if (root.used)
            return this.findNode(root.right, w, h) || this.findNode(root.down, w, h);
        else if ((w <= root.w) && (h <= root.h))
            return root;
        else
            return null;
    }

    splitNode(node, w, h) {
        node.used = true;
        node.down = { x: node.x, y: node.y + h, w: node.w, h: node.h - h };
        node.right = { x: node.x + w, y: node.y, w: node.w - w, h: h };
        return node;
    }
}

// --- DOM ELEMENTLERİ VE OLAYLAR ---

const partsList = document.getElementById('parts-list');
const addPartBtn = document.getElementById('add-part-btn');
const calculateBtn = document.getElementById('calculate-btn');
const canvas = document.getElementById('cutCanvas');
const ctx = canvas.getContext('2d');

// Varsayılan olarak bir satır ekle
addPartRow();

// Olay Dinleyicileri
addPartBtn.addEventListener('click', addPartRow);
calculateBtn.addEventListener('click', runOptimization);

function addPartRow() {
    const row = document.createElement('div');
    row.className = 'part-row';
    row.innerHTML = `
        <input type="number" placeholder="G" class="p-w">
        <input type="number" placeholder="Y" class="p-h">
        <input type="number" value="1" class="p-q">
        <button class="btn-del" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
    `;
    partsList.appendChild(row);
}

// --- HESAPLAMA VE ÇİZİM ---

function runOptimization() {
    // 1. Girdileri Al
    const stockW = parseFloat(document.getElementById('stockW').value);
    const stockH = parseFloat(document.getElementById('stockH').value);
    const kerf = parseFloat(document.getElementById('kerf').value) || 0;

    let blocks = [];

    // Parçaları listeye dök (Adet sayısınca çoğalt)
    document.querySelectorAll('.part-row').forEach(row => {
        const w = parseFloat(row.querySelector('.p-w').value);
        const h = parseFloat(row.querySelector('.p-h').value);
        const q = parseInt(row.querySelector('.p-q').value);

        if (w && h && q) {
            for (let i = 0; i < q; i++) {
                // Bıçak payını (kerf) parçaya ekliyoruz hesaplama için
                blocks.push({ w: w + kerf, h: h + kerf, realW: w, realH: h });
            }
        }
    });

    if (blocks.length === 0) {
        alert("Lütfen en az bir parça ekleyin!");
        return;
    }

    // 2. Optimizasyon (Packer Class)
    // Gerçek uygulamalarda birden çok plaka gerekir, burada basitlik için
    // parçalar sığdığı sürece tek plakaya, sığmazsa "sığmadı" olarak işaretlenir.
    // (Gelişmiş versiyonda loop ile yeni packer oluşturulur).

    const packer = new Packer(stockW, stockH);
    packer.fit(blocks);

    // 3. İstatistikler
    let usedArea = 0;
    let placedCount = 0;
    blocks.forEach(block => {
        if (block.fit) {
            usedArea += block.realW * block.realH;
            placedCount++;
        }
    });

    const totalArea = stockW * stockH;
    const efficiency = (usedArea / totalArea) * 100;

    document.getElementById('total-sheets').innerText = "1"; // Şimdilik tek plaka demo
    document.getElementById('efficiency-rate').innerText = "%" + efficiency.toFixed(1);
    document.getElementById('waste-rate').innerText = "%" + (100 - efficiency).toFixed(1);

    // 4. Çizim (Canvas)
    drawResult(stockW, stockH, blocks);
}

function drawResult(stockW, stockH, blocks) {
    // Canvas boyutunu ekrana göre ayarla (Zoom fit)
    const wrapper = document.querySelector('.canvas-wrapper');
    const margin = 40;

    // En boy oranını koruyarak ölçekle
    const scale = Math.min(
        (wrapper.clientWidth - margin) / stockW,
        (wrapper.clientHeight - margin) / stockH
    );

    canvas.width = stockW * scale;
    canvas.height = stockH * scale;

    // Temizle
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ana Plakayı Çiz (MDF Rengi)
    ctx.fillStyle = '#e2c799';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#8d5a2a';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Parçaları Çiz
    blocks.forEach(block => {
        if (block.fit) {
            const x = block.fit.x * scale;
            const y = block.fit.y * scale;
            // Bıçak payını düşerek gerçek boyutu çiz
            const w = block.realW * scale;
            const h = block.realH * scale;

            // Rastgele pastel renk
            ctx.fillStyle = getRandomColor();
            ctx.fillRect(x, y, w, h);

            // Çerçeve
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, w, h);

            // Ölçü Yazısı (Sığıyorsa)
            if (w > 20 && h > 20) {
                ctx.fillStyle = '#000';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${block.realW}x${block.realH}`, x + w / 2, y + h / 2);
            }
        }
    });
}

function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 80%)`;
}