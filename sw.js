const CACHE_NAME = 'mdfkesim-v13';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './icon.jpg',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@700;800&display=swap'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Yeni versiyonu anında kur
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache); // Eski önbellekleri sil
                    }
                })
            );
        }).then(() => {
            return self.clients.claim(); // Anında kontrolü ele al
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // Önbellekte varsa ver, yoksa ağdan çek
            return response || fetch(event.request);
        })
    );
});
