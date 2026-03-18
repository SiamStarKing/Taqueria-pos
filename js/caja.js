// 1. IMPORTAMOS TODO LO NECESARIO
import { productosRef, ventasRef, onSnapshot, addDoc } from './db.js';
// Variables del carrito
let carrito = [];
let productosLocales = []; // Aquí guardaremos la copia para filtrar

// 2. ESCUCHAR PRODUCTOS EN TIEMPO REAL
// Esto reemplaza a Dexie. Cuando cambies un precio en Admin, aquí cambia solo.
// ESCUCHAR LA NUBE
onSnapshot(productosRef, (snapshot) => {
    // Guardamos los datos en nuestra variable local
    productosLocales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Por defecto mostramos todos al cargar
    renderizarMenu(productosLocales);
});

function renderizarMenu(listaAMostrar) {
    const contenedor = document.getElementById('menu-grid');
    if (!contenedor) return;

    contenedor.innerHTML = listaAMostrar.map(p => {
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

// --- NUEVAS FUNCIONES DE FILTRADO ---

window.filtrarMenu = function(categoria, boton) {
    // 1. Quitar clase 'active' de todos los botones y ponerla en el seleccionado
    document.querySelectorAll('.categorias-bar button').forEach(btn => btn.classList.remove('active'));
    boton.classList.add('active');

    // 2. Filtrar la lista
    if (categoria === 'Todos') {
        renderizarMenu(productosLocales);
    } else {
        const filtrados = productosLocales.filter(p => p.categoria === categoria);
        renderizarMenu(filtrados);
    }
}

window.buscarProducto = function() {
    const termino = document.getElementById('buscador').value.toLowerCase();
    const filtrados = productosLocales.filter(p => 
        p.nombre.toLowerCase().includes(termino)
    );
    renderizarMenu(filtrados);
}

// ... Mantén tus funciones de carrito (agregarAlCarrito, actualizarVistaCarrito, etc.) ...

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
    const lista = document.getElementById('lista-orden');
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