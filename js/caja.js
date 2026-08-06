// 1. IMPORTAMOS TODO LO NECESARIO
import { productosRef, ventasRef, onSnapshot, addDoc } from './db.js';

// Variables globales
let carrito = [];
let productosBaseDatos = [];
let totalVentaGlobal = 0;
let metodoPagoActual = 'efectivo';

// 2. ESCUCHAR PRODUCTOS EN TIEMPO REAL
onSnapshot(productosRef, (snapshot) => {
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

    const ordenCategorias = ['Alimento', 'Bebida', 'Extra', 'Postre', 'Dulce'];
    let htmlFinal = '';

    ordenCategorias.forEach(cat => {
        const productosDeCategoria = productosAMostrar
            .filter(p => p.categoria === cat)
            .sort((a, b) => a.precio - b.precio);

        if (productosDeCategoria.length > 0) {
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
                        ${visual} 
                        <div class="card-texto">
                            <span class="nombre">${p.nombre}</span>
                            <span class="precio">$${p.precio.toFixed(2)}</span>
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

// --- FUNCIONES DE FILTRADO ---
window.filtrarMenu = function(categoria, boton) {
    document.querySelectorAll('.categorias-bar button').forEach(btn => btn.classList.remove('active'));
    boton.classList.add('active');

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
        carrito.push({ 
            id: id, 
            nombre: nombre, 
            precio: parseFloat(precio), 
            cantidad: 1 
        });
    }
    actualizarVistaCarrito();
}

window.cambiarCantidad = function(index, delta) {
    if (carrito[index]) {
        carrito[index].cantidad += delta;
        
        if (carrito[index].cantidad <= 0) {
            carrito.splice(index, 1);
        }
        actualizarVistaCarrito();
    }
}

window.eliminarDelCarrito = function(index) {
    carrito.splice(index, 1);
    actualizarVistaCarrito();
}

function actualizarVistaCarrito() {
    const lista = document.getElementById('lista-orden');
    const totalElemento = document.getElementById('total-pagar');
    let total = 0;

    if (!lista) return;

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
    carrito = [];
    actualizarVistaCarrito();
}

// --- GESTIÓN DEL MODAL Y MÉTODOS DE PAGO ---
window.finalizarVenta = function() {
    if (carrito.length === 0) return alert("El carrito está vacío");
    
    totalVentaGlobal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    document.getElementById('modal-total').innerText = `$${totalVentaGlobal.toFixed(2)}`;
    document.getElementById('monto-recibido').value = '';
    document.getElementById('modal-cambio').innerText = `$0.00`;
    
    // Reiniciar método a efectivo por defecto
    seleccionarMetodoPago('efectivo');
    
    document.getElementById('modal-cobro').style.display = 'flex';
    setTimeout(() => document.getElementById('monto-recibido').focus(), 100);
}

window.cerrarModalPago = function() {
    document.getElementById('modal-cobro').style.display = 'none';
}

function seleccionarMetodoPago(metodo) {
    metodoPagoActual = metodo;
    
    const btnEfectivo = document.getElementById('btn-efectivo');
    const btnTransferencia = document.getElementById('btn-transferencia');
    const inputRecibido = document.getElementById('monto-recibido');
    const contenedorTeclado = document.getElementById('contenedor-teclado');
    const contenedorRapidos = document.getElementById('contenedor-botones-rapidos');
    const lblCambio = document.getElementById('modal-cambio');

    if (metodo === 'transferencia') {
        btnTransferencia?.classList.add('active');
        btnEfectivo?.classList.remove('active');
        
        inputRecibido.value = totalVentaGlobal.toFixed(2);
        lblCambio.innerText = '$0.00';
        
        if (contenedorTeclado) {
            contenedorTeclado.style.opacity = '0.3';
            contenedorTeclado.style.pointerEvents = 'none';
        }
        if (contenedorRapidos) {
            contenedorRapidos.style.opacity = '0.3';
            contenedorRapidos.style.pointerEvents = 'none';
        }
    } else {
        btnEfectivo?.classList.add('active');
        btnTransferencia?.classList.remove('active');
        
        inputRecibido.value = '';
        lblCambio.innerText = '$0.00';
        
        if (contenedorTeclado) {
            contenedorTeclado.style.opacity = '1';
            contenedorTeclado.style.pointerEvents = 'auto';
        }
        if (contenedorRapidos) {
            contenedorRapidos.style.opacity = '1';
            contenedorRapidos.style.pointerEvents = 'auto';
        }
    }
}

window.agregarNumero = function(num) {
    if (metodoPagoActual === 'transferencia') return;
    const input = document.getElementById('monto-recibido');
    if (num === '.' && input.value.includes('.')) return;
    
    input.value += num;
    calcularCambioReal();
};

window.borrarMonto = function() {
    if (metodoPagoActual === 'transferencia') return;
    document.getElementById('monto-recibido').value = "";
    calcularCambioReal();
};

window.fijarMonto = function(cantidad) {
    if (metodoPagoActual === 'transferencia') return;
    document.getElementById('monto-recibido').value = cantidad;
    calcularCambioReal();
};

window.calcularCambioReal = function() {
    if (metodoPagoActual === 'transferencia') return;
    const recibido = parseFloat(document.getElementById('monto-recibido').value) || 0;
    const cambio = recibido - totalVentaGlobal;
    const elCambio = document.getElementById('modal-cambio');
    
    if (cambio < 0) {
        elCambio.innerText = `$0.00`;
        elCambio.style.color = 'var(--rojo)';
    } else {
        elCambio.innerText = `$${cambio.toFixed(2)}`;
        elCambio.style.color = 'var(--verde)';
    }
}

// --- PROCESAR Y GUARDAR VENTA EN FIREBASE ---
window.procesarVentaFinal = async function() {
    const inputRecibido = document.getElementById('monto-recibido');
    const recibido = parseFloat(inputRecibido.value) || 0;
    
    // Validar solo si el cobro es en efectivo
    if (metodoPagoActual === 'efectivo' && recibido < totalVentaGlobal) {
        inputRecibido.style.border = "3px solid red";
        setTimeout(() => { inputRecibido.style.border = ""; }, 2000);
        return; 
    }

    const cambio = metodoPagoActual === 'transferencia' ? 0 : (recibido - totalVentaGlobal);
    const detalle = carrito.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');

    const nuevaVenta = {
        fecha: new Date().toLocaleString(),
        fechaNum: Date.now(),
        detalle: detalle,
        total: totalVentaGlobal,
        pagoCon: metodoPagoActual === 'transferencia' ? totalVentaGlobal : recibido,
        cambio: cambio,
        metodoPago: metodoPagoActual // <-- REGISTRA 'efectivo' O 'transferencia'
    };

    const btnConfirmar = document.querySelector('.modal-footer .btn-cobrar');
    const textoOriginal = btnConfirmar.innerHTML;

    btnConfirmar.innerHTML = metodoPagoActual === 'transferencia' 
        ? `✅ TRANSFERENCIA EXITOSA` 
        : `✅ CAMBIO: $${cambio.toFixed(2)}`;
    btnConfirmar.style.backgroundColor = "#2ecc71";
    btnConfirmar.disabled = true;

    carrito = []; 
    actualizarVistaCarrito();

    try {
        await addDoc(ventasRef, nuevaVenta); 
        
        setTimeout(() => {
            cerrarModalPago();
            btnConfirmar.innerHTML = textoOriginal;
            btnConfirmar.style.backgroundColor = "";
            btnConfirmar.disabled = false;
        }, 1500);

    } catch (error) {
        console.error("Error al registrar venta:", error);
        btnConfirmar.innerHTML = "❌ Error al guardar";
        btnConfirmar.style.backgroundColor = "#e74c3c";
        btnConfirmar.disabled = false;
    }
}

// --- TECLADO FÍSICO ---
document.addEventListener('keydown', (event) => {
    const modalCobro = document.getElementById('modal-cobro');
    if (modalCobro && modalCobro.style.display !== 'none') {
        const tecla = event.key;

        if (tecla === 'Enter') {
            procesarVentaFinal();
            return;
        }

        if (tecla === 'Escape') {
            cerrarModalPago();
            return;
        }

        if (metodoPagoActual === 'transferencia') return;

        const input = document.getElementById('monto-recibido');

        if (!isNaN(tecla) || tecla === '.') {
            if (tecla === '.' && input.value.includes('.')) return;
            input.value += tecla;
            calcularCambioReal();
        }

        if (tecla === 'Backspace') {
            input.value = input.value.slice(0, -1);
            calcularCambioReal();
        }
    }
});

// --- MENÚ MÓVIL Y ESTADO ---
window.toggleOrden = function() {
    const ticket = document.getElementById('ticket-movil');
    ticket.classList.toggle('expandido');
    
    const texto = ticket.querySelector('.ticket-swipe-handle p');
    if (ticket.classList.contains('expandido')) {
        texto.innerText = "Cerrar orden";
    } else {
        texto.innerText = "Ver mi orden";
    }
}

window.addEventListener('offline', () => {
    alert("Te has quedado sin internet. Las ventas se guardarán localmente y se subirán al volver la conexión.");
});

window.addEventListener('online', () => {
    console.log("¡Conexión restaurada! Sincronizando datos...");
});

// Exponer función de selección globalmente
window.seleccionarMetodoPago = seleccionarMetodoPago;