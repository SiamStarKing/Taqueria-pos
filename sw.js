const CACHE_NAME = 'taqueria-v2'; // <--- Cambiamos a v2
const ASSETS = [
    './',
    'index.html',
    'admin.html',
    'menu-print.html',     // Agregamos la nueva página de impresión
    'css/styles.css',
    'css/admin.css',
    'js/db.js',
    'js/caja.js',          // Agregamos tu lógica de cobro
    'js/admin.js',         // Agregamos tu lógica de admin
    'img/taco.png'
];

// Instalación: Guardar archivos en caché
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Cacheando archivos nuevos...');
            return cache.addAll(ASSETS);
        })
    );
});

// Activación: Borrar cachés viejos (v1) para que no ocupen espacio
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
});

// Estrategia: Buscar en caché, si no está, ir a la red
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => {
            return res || fetch(e.request);
        })
    );
});