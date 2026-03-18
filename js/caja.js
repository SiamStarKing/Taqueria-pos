// 1. IMPORTAMOS DESDE TU NUEVO DB.JS
import { 
    db, 
    productosRef, 
    ventasRef, 
    onSnapshot, 
    addDoc 
} from "./db.js";

// Variables del carrito
let carrito = [];

// 2. ESCUCHAR PRODUCTOS EN TIEMPO REAL
// Esto reemplaza a Dexie. Cuando cambies un precio en Admin, aquí cambia solo.
onSnapshot(productosRef, (snapshot) => {
    const productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarMenu(productos);
});

function renderizarMenu(productos) {
    const contenedor = document.getElementById('menu-grid');
    if (!contenedor) return;

    contenedor.innerHTML = productos.map(p => {
        const esImagen = p.imagen.includes('/') || p.imagen.includes('.');
        const visual = esImagen 
            ? `<img src="${p.imagen}" class="card-img">` 
            : `<div class="card-emoji">${p.imagen}</div>`;

        return `
            <div class="card" onclick="agregarAlCarrito('${p.id}', '${p.nombre}', ${p.precio})">
                ${visual}
                <div class="card-info">
                    <h3>${p.nombre}</h3>
                    <p class="precio">$${p.precio.toFixed(2)}</p>
                </div>
            </div>
        `;
    }).join('');
}

// 3. FUNCIONES DEL CARRITO (Se quedan casi igual, pero con IDs de Firebase)
window.agregarAlCarrito = function(id, nombre, precio) {
    const itemExistente = carrito.find(item => item.id === id);
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({ id, nombre, precio, cantidad: 1 });
    }
    actualizarVistaCarrito();
}

function actualizarVistaCarrito() {
    const lista = document.getElementById('lista-carrito');
    const totalElemento = document.getElementById('total-pagar');
    let total = 0;

    lista.innerHTML = carrito.map((item, index) => {
        total += item.precio * item.cantidad;
        return `
            <div class="item-carrito">
                <span>${item.cantidad}x ${item.nombre}</span>
                <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
                <button onclick="eliminarDelCarrito(${index})">❌</button>
            </div>
        `;
    }).join('');

    totalElemento.innerText = total.toFixed(2);
}

window.eliminarDelCarrito = function(index) {
    carrito.splice(index, 1);
    actualizarVistaCarrito();
}

// 4. GUARDAR LA VENTA EN LA NUBE
window.finalizarVenta = async function() {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const detalle = carrito.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');

    const nuevaVenta = {
        fecha: new Date().toLocaleString(),
        fechaNum: Date.now(), // Para ordenar por fecha fácilmente
        detalle: detalle,
        total: total
    };

    try {
        await addDoc(ventasRef, nuevaVenta);
        alert("¡Venta guardada en la nube!");
        carrito = [];
        actualizarVistaCarrito();
    } catch (error) {
        console.error("Error al vender:", error);
        alert("Error al conectar con Firebase");
    }
}