let carrito = [];

async function cargarMenu() {
    filtrarMenu('Todos');
}

async function filtrarMenu(categoriaSeleccionada, elementoBoton) {
    // Limpiar buscador si se usa categoría
    if (elementoBoton) document.getElementById('buscador').value = "";

    // Resaltar botón activo
    const botones = document.querySelectorAll('.categorias-bar button');
    botones.forEach(btn => btn.classList.remove('active'));
    
    if (elementoBoton) {
        elementoBoton.classList.add('active');
    } else {
        const btnTodos = document.querySelector('.categorias-bar button');
        if (btnTodos) btnTodos.classList.add('active');
    }

    const todos = await db.productos.toArray();
    const filtrados = categoriaSeleccionada === 'Todos' 
        ? todos 
        : todos.filter(p => p.categoria === categoriaSeleccionada);

    renderizarProductos(filtrados);
}

async function buscarProducto() {
    const texto = document.getElementById('buscador').value.toLowerCase();
    const todos = await db.productos.toArray();

    const filtrados = todos.filter(p => 
        p.nombre.toLowerCase().includes(texto) || 
        (p.categoria && p.categoria.toLowerCase().includes(texto))
    );

    if (texto.length > 0) {
        document.querySelectorAll('.categorias-bar button').forEach(btn => btn.classList.remove('active'));
    }
    renderizarProductos(filtrados);
}

function renderizarProductos(productos) {
    const menuGrid = document.getElementById('menu');
    menuGrid.innerHTML = productos.map(p => {
        const esImagen = p.imagen.includes('/') || p.imagen.includes('.');
        const imagenHTML = esImagen 
            ? `<img src="${p.imagen}">` 
            : `<div class="emoji-display">${p.imagen}</div>`;

        return `
            <div class="card" onclick="agregarAlCarrito('${p.nombre}', ${p.precio})">
                ${imagenHTML}
                <div class="info">
                    <span class="nombre">${p.nombre}</span>
                    <span class="precio">$${p.precio.toFixed(2)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function agregarAlCarrito(nombre, precio) {
    // Buscar si el producto ya está en el carrito
    const itemExistente = carrito.find(item => item.nombre === nombre);

    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        // Si es nuevo, lo agregamos con cantidad 1
        carrito.push({ 
            nombre, 
            precio, 
            cantidad: 1, 
            idTemp: Date.now() 
        });
    }
    actualizarTicket();
}

// Nueva función para reducir cantidad o quitar si llega a 0
function reducirCantidad(nombre) {
    const itemIndex = carrito.findIndex(item => item.nombre === nombre);
    
    if (itemIndex > -1) {
        carrito[itemIndex].cantidad--;
        
        // Si la cantidad llega a 0, lo eliminamos por completo
        if (carrito[itemIndex].cantidad <= 0) {
            carrito.splice(itemIndex, 1);
        }
    }
    actualizarTicket();
}

function quitarDelCarrito(idTemp) {
    carrito = carrito.filter(item => item.idTemp !== idTemp);
    actualizarTicket();
}

function actualizarTicket() {
    const lista = document.getElementById('lista-orden');
    const totalElem = document.getElementById('gran-total');
    
    lista.innerHTML = carrito.map(item => `
        <div class="item-carrito">
            <div class="item-info">
                <span class="item-nombre">${item.nombre}</span>
                <span class="item-subtotal">$${(item.precio * item.cantidad).toFixed(2)}</span>
            </div>
            <div class="item-controles">
                <button class="btn-menos" onclick="reducirCantidad('${item.nombre}')">−</button>
                <span class="item-cantidad">x${item.cantidad}</span>
                <button class="btn-mas" onclick="agregarAlCarrito('${item.nombre}', ${item.precio})">+</button>
            </div>
        </div>
    `).join('');

    // Calcular el total multiplicando precio por cantidad
    const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    totalElem.innerText = `$${total.toFixed(2)}`;
}

async function finalizarVenta() {
    if (carrito.length === 0) return alert("Carrito vacío");

    const total = carrito.reduce((acc, item) => acc + item.precio, 0);
    const resumen = carrito.reduce((acc, item) => {
        acc[item.nombre] = (acc[item.nombre] || 0) + 1;
        return acc;
    }, {});
    
    const detalle = Object.entries(resumen).map(([n, c]) => `${c}x ${n}`).join(', ');

    await db.ventas.add({
        fecha: new Date().toLocaleString(),
        total: total,
        detalle: detalle
    });

    alert("¡Venta cobrada con éxito!");
    carrito = [];
    actualizarTicket();
}

document.addEventListener('DOMContentLoaded', cargarMenu);