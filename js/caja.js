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
        contenedor.innerHTML = "<p style='padding:20px;'>No hay productos que coincidan.</p>";
        return;
    }

    // 1. Definimos el orden exacto (asegúrate que coincidan con tus datos)
    const ordenCategorias = ['Alimento', 'Bebida', 'Extra', 'Postre', 'Dulce'];
    let htmlFinal = '';

    ordenCategorias.forEach(cat => {
        // Filtramos productos por categoría
        const productosDeCategoria = productosAMostrar.filter(p => p.categoria === cat);

        if (productosDeCategoria.length > 0) {
            // Título de la categoría y contenedor de sus tarjetas
            htmlFinal += `
                <div class="categoria-bloque">
                    <h2 class="categoria-titulo">${cat}</h2>
                    <div class="productos-flex">
            `;

            htmlFinal += productosDeCategoria.map(p => {
                const esImagen = p.imagen.includes('/') || p.imagen.includes('.');
                const visual = esImagen 
                    ? `<img src="${p.imagen}" class="card-img">` 
                    : `<span class="card-emoji">${p.imagen}</span>`;

                return `
                    <div class="card" onclick="agregarAlCarrito('${p.id}', '${p.nombre}', ${p.precio})">
                        <div class="card-content">
                            ${visual}
                            <div class="card-texto">
                                <span class="nombre">${p.nombre}</span>
                                <span class="precio">$${p.precio.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            htmlFinal += `
                    </div>
                </div>
            `;
        }
    });

    contenedor.innerHTML = htmlFinal;
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
    console.log("Intentando agregar:", nombre); // Esto te avisará en la consola (F12) si funciona
    
    const itemExistente = carrito.find(item => item.id === id);
    
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({ 
            id: id, 
            nombre: nombre, 
            precio: parseFloat(precio), 
            cantidad: 1 
        });
    }
    actualizarVistaCarrito();
}

// 2. Cambiar cantidad (+ o -)
window.cambiarCantidad = function(index, delta) {
    if (carrito[index]) {
        carrito[index].cantidad += delta;
        
        // Si la cantidad es 0 o menos, lo quitamos del carrito
        if (carrito[index].cantidad <= 0) {
            carrito.splice(index, 1);
        }
        actualizarVistaCarrito();
    }
}

// 3. Eliminar por completo
window.eliminarDelCarrito = function(index) {
    carrito.splice(index, 1);
    actualizarVistaCarrito();
}

// 4. Dibujar el carrito en pantalla
function actualizarVistaCarrito() {
    const lista = document.getElementById('lista-orden');
    const totalElemento = document.getElementById('total-pagar');
    let total = 0;

    if (!lista) {
        console.error("No se encontró el elemento 'lista-orden' en el HTML");
        return;
    }

    lista.innerHTML = carrito.map((item, index) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        
        return `
            <div class="item-carrito" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #ddd;">
                <div style="flex: 1;">
                    <strong>${item.nombre}</strong><br>
                    <small>$${item.precio.toFixed(2)}</small>
                </div>
                
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button onclick="cambiarCantidad(${index}, -1)" style="width:28px; height:28px; border-radius:50%; border:none; background:#ff4d4d; color:white; cursor:pointer;">-</button>
                    <span style="font-weight:bold; width:20px; text-align:center;">${item.cantidad}</span>
                    <button onclick="cambiarCantidad(${index}, 1)" style="width:28px; height:28px; border-radius:50%; border:none; background:#2ecc71; color:white; cursor:pointer;">+</button>
                </div>

                <div style="width: 70px; text-align: right; font-weight: bold; margin-left:10px;">
                    $${subtotal.toFixed(2)}
                </div>
                
                <button onclick="eliminarDelCarrito(${index})" style="background:none; border:none; cursor:pointer; font-size:18px; margin-left:5px;">🗑️</button>
            </div>
        `;
    }).join('');

    if (totalElemento) {
        totalElemento.innerText = `$${total.toFixed(2)}`;
    }
}

window.limpiarCarrito = function() {
    if(confirm("¿Vaciar la orden actual?")) {
        carrito = [];
        actualizarVistaCarrito();
    }
}


// 4. GUARDAR LA VENTA EN LA NUBE
window.finalizarVenta = async function() {
    // 1. Verificación básica
    if (carrito.length === 0) return alert("El carrito está vacío");

    // 2. Calcular el total de la orden
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    // 3. Pedir el monto con el que paga el cliente
    const montoRecibidoStr = prompt(`Total a pagar: $${total.toFixed(2)}\n\n¿Con cuánto paga el cliente?`);

    // Si el usuario cancela el prompt
    if (montoRecibidoStr === null) return;

    const montoRecibido = parseFloat(montoRecibidoStr);

    // 4. Validar que el monto sea un número y sea suficiente
    if (isNaN(montoRecibido)) {
        alert("Por favor, ingresa una cantidad válida.");
        return;
    }

    if (montoRecibido < total) {
        alert(`Cantidad insuficiente. Faltan $${(total - montoRecibido).toFixed(2)}`);
        return;
    }

    // 5. Calcular el cambio
    const cambio = montoRecibido - total;

    // 6. Mostrar el cambio al usuario
    alert(`--------------------------\n   CAMBIO: $${cambio.toFixed(2)}\n--------------------------`);

    // 7. Guardar la venta en la nube (tu lógica original)
    const detalle = carrito.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');

    const nuevaVenta = {
        fecha: new Date().toLocaleString(),
        fechaNum: Date.now(),
        detalle: detalle,
        total: total,
        pagoCon: montoRecibido, // Guardamos también con cuánto pagó
        cambio: cambio          // Y cuánto devolvimos
    };

    try {
        await addDoc(ventasRef, nuevaVenta);
        // Limpiar carrito después del éxito
        carrito = [];
        actualizarVistaCarrito();
    } catch (error) {
        console.error("Error al vender:", error);
        alert("Error al conectar con Firebase");
    }
}