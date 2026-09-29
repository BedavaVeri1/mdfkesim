const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

let search = `                        <div class="input-group-col">
                            <label style="display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" id="mod-no-bottom"> Alt Tablayı İptal Et (Masa)
                            </label>
                        </div>`;
html = html.replace(search, "");

let search2 = `                    <div
                        style="margin-top: 15px; display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
                        <input type="checkbox" id="mod-add-crown" checked
                            style="width: 14px; height: 14px; cursor: pointer; accent-color: var(--primary);">
                        <label for="mod-add-crown"
                            style="font-weight: 600; cursor: pointer; color: var(--dark); font-size: 0.9rem; margin: 0;">Taç
                            (Üst Çıkıntı) Ekle <span style="font-weight: normal; color: var(--text-muted);">(Önden 2.5
                                cm taşar)</span></label>
                    </div>`;

let replace2 = `                    <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
                            <input type="checkbox" id="mod-add-crown" checked style="width: 14px; height: 14px; cursor: pointer; accent-color: var(--primary);">
                            <label for="mod-add-crown" style="font-weight: 600; cursor: pointer; color: var(--dark); font-size: 0.85rem; margin: 0;">Taç (Üst Çıkıntı) Ekle</label>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
                            <input type="checkbox" id="mod-no-bottom" style="width: 14px; height: 14px; cursor: pointer; accent-color: var(--primary);">
                            <label for="mod-no-bottom" style="font-weight: 600; cursor: pointer; color: var(--dark); font-size: 0.85rem; margin: 0;">Alt Tablayı İptal Et (Masa vs.)</label>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-light); grid-column: 1 / -1;">
                            <input type="checkbox" id="mod-split-sides" style="width: 14px; height: 14px; cursor: pointer; accent-color: var(--primary);">
                            <label for="mod-split-sides" style="font-weight: 600; cursor: pointer; color: var(--dark); font-size: 0.85rem; margin: 0;">Dış Dikmeleri Bölümlere Göre Parçala (L Tipi Asimetrik Kesim İçin)</label>
                        </div>
                    </div>`;

html = html.replace(search2, replace2);
fs.writeFileSync('index.html', html);
