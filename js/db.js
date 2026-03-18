// js/db.js
const db = new Dexie("TaqueriaDB");

// Definimos las tablas: 
// 'productos' guarda el menú.
// 'ventas' guarda el histórico para el Excel.
db.version(1).stores({
    productos: '++id, nombre, precio, imagen',
    ventas: '++id, fecha, total, detalle'
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registrado con éxito', reg))
        .catch(err => console.warn('Error al registrar el Service Worker', err));
    });
}

console.log("Archivo db.js cargado correctamente")