// 1. IMPORTAMOS TODO LO NECESARIO
import { productosRef, ventasRef, onSnapshot, addDoc } from './db.js';

// Variables globales
let carrito = [];
let productosBaseDatos = []; // <--- Esta es la clave para que el filtro funcione

// 2. ESCUCHAR PRODUCTOS EN TIEMPO REAL
onSnapshot(productosRef, (snapshot) => {
    // Guardamos los productos en la variable global para que filtrarMenu pueda verlos
    productosBaseDatos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarMenu(productosBaseDatos);
});

function renderizarMenu(productosAMostrar) {
    const contenedor = document.getElementById('menu');
    if (!contenedor) return;

    if (productosAMostrar.length === 0) {
        contenedor.innerHTML = "<p style='padding:20px;'>No hay productos en esta categoría.</p>";
        return;
    }

    contenedor.innerHTML = productosAMostrar.map(p => {
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

// --- FUNCIONES DE FILTRADO CORREGIDAS ---

window.filtrarMenu = function(categoria, boton) {
    // 1. Estética: Quitar clase 'active' y ponerla al nuevo
    document.querySelectorAll('.categorias-bar button').forEach(btn => btn.classList.remove('active'));
    boton.classList.add('active');

    // 2. Lógica: Usamos la variable global productosBaseDatos
    if (categoria === 'Todos') {
        renderizarMenu(productosBaseDatos);
    } else {
        const filtrados = productosBaseDatos.filter(p => p.categoria === categoria);
        renderizarMenu(filtrados);
    }
}

window.buscarProducto = function() {
    const termino = document.getElementById('buscador').value.toLowerCase();
    const filtrados = productosBaseDatos.filter(p => 
        p.nombre.toLowerCase().includes(termino)
    );
    renderizarMenu(filtrados);
}

// --- FUNCIONES DEL CARRITO ---

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
    const lista = document.getElementById('lista-orden');
    const totalElemento = document.getElementById('total-pagar'); // Asegúrate que este ID exista en tu HTML
    let total = 0;

    if (!lista) return;

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

    if (totalElemento) totalElemento.innerText = `$${total.toFixed(2)}`;
}

window.eliminarDelCarrito = function(index) {
    carrito.splice(index, 1);
    actualizarVistaCarrito();
}

window.limpiarCarrito = function() {
    if(confirm("¿Vaciar la orden actual?")) {
        carrito = [];
        actualizarVistaCarrito();
    }
}

// 4. GUARDAR LA VENTA EN LA NUBE
window.finalizarVenta = async function() {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const detalle = carrito.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');

    const nuevaVenta = {
        fecha: new Date().toLocaleString(),
        fechaNum: Date.now(),
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