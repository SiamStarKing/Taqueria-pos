// js/admin.js

const formulario = document.getElementById('form-producto');
const tablaCuerpo = document.getElementById('cuerpo-tabla');

// Cargar productos al abrir la página
document.addEventListener('DOMContentLoaded', listarProductos);

async function guardarProducto(e) {
    e.preventDefault(); // Evita que la página se recargue

    const formulario = document.getElementById('form-producto');
    const nombre = document.getElementById('nombre').value;
    const precio = parseFloat(document.getElementById('precio').value);
    const imagen = document.getElementById('imagen').value || "🌮"; // Si está vacío, pone un taco
    const categoria = document.getElementById('categoria').value;
    
    // Obtenemos el ID si estamos editando
    const editId = formulario.dataset.editId;

    // Validación básica
    if (!nombre || isNaN(precio)) {
        alert("Por favor, llena nombre y precio correctamente.");
        return;
    }

    try {
        if (editId) {
            // SI ESTAMOS EDITANDO: Usamos .put para actualizar el existente
            await db.productos.put({
                id: parseInt(editId),
                nombre: nombre,
                precio: precio,
                imagen: imagen,
                categoria: categoria
            });
            console.log("Producto actualizado exitosamente");
            
            // Limpiamos el modo edición
            delete formulario.dataset.editId;
            document.querySelector('.btn-guardar').innerText = "Guardar Producto";
        } else {
            // SI ES NUEVO: Usamos .add
            await db.productos.add({
                nombre: nombre,
                precio: precio,
                imagen: imagen,
                categoria: categoria
            });
            console.log("Producto guardado exitosamente");
        }

        // Limpiar el formulario y refrescar la lista
        formulario.reset();
        listarProductos(); 
        
    } catch (error) {
        console.error("Error al procesar:", error);
        alert("No se pudo guardar en la base de datos.");
    }
}

async function listarProductos() {
    const productos = await db.productos.toArray();
    
    // Es importante usar el ID correcto de tu tabla en admin.html
    const tabla = document.getElementById('cuerpo-tabla');
    
    tabla.innerHTML = productos.map(p => {
        const esImagen = p.imagen.includes('/') || p.imagen.includes('.');
        const miniatura = esImagen 
            ? `<img src="${p.imagen}" width="40" height="40" style="object-fit:cover; border-radius:4px;">` 
            : `<span style="font-size: 24px;">${p.imagen}</span>`;

        return `
            <tr>
                <td>${miniatura}</td>
                <td>
                    <strong>${p.nombre}</strong><br>
                    <small style="color: #666;">${p.categoria || 'Sin categoría'}</small>
                </td>
                <td>$${p.precio.toFixed(2)}</td>
                <td>
                    <button class="btn-editar" onclick="prepararEdicion(${p.id}, '${p.nombre}', ${p.precio}, '${p.categoria}', '${p.imagen}')">✏️</button>
                    <button class="btn-eliminar" onclick="eliminarProducto(${p.id})">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function eliminarProducto(id) {
    if (confirm("¿Eliminar este producto?")) {
        await db.productos.delete(id);
        listarProductos();
    }
}

// Al cargar la página de admin, también listamos las ventas
document.addEventListener('DOMContentLoaded', () => {
    listarProductos();
    listarVentas();
});

async function listarVentas() {
    const ventas = await db.ventas.toArray();
    const tablaVentas = document.getElementById('cuerpo-ventas');
    
    let ingresosTotales = 0;
    let conteoProductos = {};

    // Calculamos estadísticas
    ventas.forEach(v => {
        ingresosTotales += v.total;
        
        // El detalle viene como "2x Taco Bistec, 1x Coca"
        // Lo separamos para contar cuál se repite más
        const partes = v.detalle.split(', ');
        partes.forEach(p => {
            const [cant, nombre] = p.split('x ');
            conteoProductos[nombre] = (conteoProductos[nombre] || 0) + parseInt(cant);
        });
    });

    // Encontrar el producto más vendido
    let productoMasVendido = "-";
    let maxVentas = 0;
    for (const [nombre, cantidad] of Object.entries(conteoProductos)) {
        if (cantidad > maxVentas) {
            maxVentas = cantidad;
            productoMasVendido = nombre;
        }
    }

    // Mostrar en pantalla
    document.getElementById('total-dinero').innerText = `$${ingresosTotales.toFixed(2)}`;
    document.getElementById('cantidad-ventas').innerText = ventas.length;
    document.getElementById('producto-estrella').innerText = productoMasVendido;

    // Pintar la tabla (tu código actual)
    tablaVentas.innerHTML = ventas.reverse().map(v => `
        <tr>
            <td>${v.fecha}</td>
            <td>${v.detalle}</td>
            <td>$${v.total.toFixed(2)}</td>
        </tr>
    `).join('');
}

async function exportarExcel() {
    const ventas = await db.ventas.toArray();
    if (ventas.length === 0) {
        alert("No hay ventas registradas para exportar.");
        return;
    }

    // Cabecera del CSV
    let csv = "Fecha y Hora,Detalle de Productos,Total\n";
    
    // Filas
    ventas.forEach(v => {
        // Limpiamos comas en el detalle para no romper el CSV
        const detalleLimpio = v.detalle.replace(/,/g, " -");
        csv += `${v.fecha},${detalleLimpio},${v.total}\n`;
    });

    // Crear el archivo y descargarlo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Corte_Caja_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function borrarHistorial() {
    if(confirm("¿Estás seguro de borrar todas las ventas? Haz esto solo después de guardar tu Excel.")) {
        await db.ventas.clear();
        listarVentas();
    }
}

// Nueva función para cargar los datos en el formulario y poder editarlos
function prepararEdicion(id, nombre, precio, categoria, imagen) {
    document.getElementById('nombre').value = nombre;
    document.getElementById('precio').value = precio;
    document.getElementById('categoria').value = categoria;
    document.getElementById('imagen').value = imagen;

    // Cambiamos el comportamiento del botón de guardar para que sepa que estamos editando
    const btnGuardar = document.querySelector('.btn-guardar');
    btnGuardar.innerText = "Actualizar Producto";
    
    // Guardamos el ID que estamos editando en el propio formulario
    const formulario = document.getElementById('form-producto');
    formulario.dataset.editId = id;
}

function generarQR() {
    // Obtenemos la dirección actual de tu página index.html
    const urlMenu = window.location.href.replace('admin.html', 'index.html');

    // Limpiamos el contenedor por si ya había un QR
    document.getElementById("qrcode").innerHTML = "";

    // Creamos el QR
    new QRCode(document.getElementById("qrcode"), {
        text: urlMenu,
        width: 200,
        height: 200,
        colorDark : "#1d3557", // El azul que estamos usando
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}

// Llamamos a la función al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    // ... tus otras funciones (listarVentas, etc)
    generarQR();
});

function imprimirQR() {
    window.print(); // Esto abrirá el menú de impresión para que saques tu QR en papel
}