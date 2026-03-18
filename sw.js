const CACHE_NAME = 'taqueria-v1';
const ASSETS = [
    '/',
    'index.html',
    'admin.html',
    'css/styles.css',
    'css/admin.css',
    'js/db.js',
    'js/dexie.min.js',
    'img/taco.png'
];

// Instalación: Guardar archivos en caché
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

// Estrategia: Primero buscar en caché, si no, ir a la red
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});