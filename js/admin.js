// 1. IMPORTAMOS LAS FUNCIONES DE FIREBASE (Asegúrate que db.js esté configurado)
import { 
    db, productosRef, ventasRef, addDoc, onSnapshot, 
    doc, deleteDoc, updateDoc, writeBatch, getDocs 
} from './db.js';

// Variables globales
const formulario = document.getElementById('form-producto');
const tablaCuerpo = document.getElementById('cuerpo-tabla');

// --- SECCIÓN DE PRODUCTOS (FIREBASE) ---

// Escuchar productos en tiempo real (Sustituye al antiguo listarProductos)
onSnapshot(productosRef, (snapshot) => {
    const productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarTablaProductos(productos);
});

function renderizarTablaProductos(productos) {
    tablaCuerpo.innerHTML = productos.map(p => {
        const esImagen = p.imagen.includes('/') || p.imagen.includes('.');
        const miniatura = esImagen 
            ? `<img src="${p.imagen}" width="40" height="40" style="object-fit:cover; border-radius:4px;">` 
            : `<span style="font-size: 24px;">${p.imagen}</span>`;

        // Nota: El ID de Firebase es una cadena de texto (ej. "Jsk82Lskw")
        return `
            <tr>
                <td>${miniatura}</td>
                <td>
                    <strong>${p.nombre}</strong><br>
                    <small style="color: #666;">${p.categoria || 'Sin categoría'}</small>
                </td>
                <td>$${p.precio.toFixed(2)}</td>
                <td>
                    <button class="btn-editar" data-id="${p.id}" data-nombre="${p.nombre}" data-precio="${p.precio}" data-categoria="${p.categoria}" data-imagen="${p.imagen}">✏️</button>
                    <button class="btn-eliminar" data-id="${p.id}">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');

    // Asignar eventos a los botones generados
    asignarEventosBotones();
}

// Función para guardar o actualizar
async function manejarEnvioFormulario(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value;
    const precio = parseFloat(document.getElementById('precio').value);
    const imagen = document.getElementById('imagen').value || "🌮";
    const categoria = document.getElementById('categoria').value;
    const editId = formulario.dataset.editId;

    if (!nombre || isNaN(precio)) return alert("Llena los campos correctamente.");

    const datosProducto = { nombre, precio, imagen, categoria };

    try {
        if (editId) {
            // ACTUALIZAR EN FIREBASE
            const productoDoc = doc(db, "productos", editId);
            await updateDoc(productoDoc, datosProducto);
            delete formulario.dataset.editId;
            document.querySelector('.btn-guardar').innerText = "Guardar Producto";
        } else {
            // GUARDAR NUEVO EN FIREBASE
            await addDoc(productosRef, datosProducto);
        }
        formulario.reset();
    } catch (error) {
        console.error("Error:", error);
    }
}

// --- SECCIÓN DE VENTAS (FIREBASE) ---

onSnapshot(ventasRef, (snapshot) => {
    const ventas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarVentas(ventas);
});

function renderizarVentas(ventas) {
    const tablaVentas = document.getElementById('cuerpo-ventas');
    let ingresosTotales = 0;
    let conteoProductos = {};

    ventas.forEach(v => {
        ingresosTotales += v.total;
        const partes = v.detalle.split(', ');
        partes.forEach(p => {
            const match = p.match(/(\d+)x (.+)/);
            if (match) {
                const cant = parseInt(match[1]);
                const nombre = match[2];
                conteoProductos[nombre] = (conteoProductos[nombre] || 0) + cant;
            }
        });
    });

    let productoEstrella = "-";
    let maxVentas = 0;
    for (const [nombre, cantidad] of Object.entries(conteoProductos)) {
        if (cantidad > maxVentas) {
            maxVentas = cantidad;
            productoEstrella = nombre;
        }
    }

    document.getElementById('total-dinero').innerText = `$${ingresosTotales.toFixed(2)}`;
    document.getElementById('cantidad-ventas').innerText = ventas.length;
    document.getElementById('producto-estrella').innerText = productoEstrella;

    tablaVentas.innerHTML = ventas.sort((a,b) => b.fechaNum - a.fechaNum).map(v => `
        <tr>
            <td>${v.fecha}</td>
            <td>${v.detalle}</td>
            <td>$${v.total.toFixed(2)}</td>
        </tr>
    `).join('');
}

// --- FUNCIONES DE APOYO ---

function asignarEventosBotones() {
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.onclick = async () => {
            if (confirm("¿Eliminar producto?")) {
                await deleteDoc(doc(db, "productos", btn.dataset.id));
            }
        };
    });

    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.onclick = () => {
            document.getElementById('nombre').value = btn.dataset.nombre;
            document.getElementById('precio').value = btn.dataset.precio;
            document.getElementById('categoria').value = btn.dataset.categoria;
            document.getElementById('imagen').value = btn.dataset.imagen;
            formulario.dataset.editId = btn.dataset.id;
            document.querySelector('.btn-guardar').innerText = "Actualizar Producto";
        };
    });
}

// --- BOTONES DE CORTE DE CAJA ---

window.descargarExcel = async function() {
    try {
        const querySnapshot = await getDocs(ventasRef);
        const ventas = querySnapshot.docs.map(doc => doc.data());

        if (ventas.length === 0) return alert("No hay ventas registradas.");

        let csvContent = "\ufeffFecha,Detalle,Total\n";
        ventas.forEach(v => {
            const detalleLimpio = v.detalle.replace(/,/g, " -"); 
            csvContent += `${v.fecha},${detalleLimpio},${v.total}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Ventas_Pachuca_${new Date().toLocaleDateString()}.csv`;
        link.click();
    } catch (e) {
        console.error(e);
        alert("Error al generar Excel");
    }
};

window.borrarHistorialVentas = async function() {
    if (!confirm("¿Borrar todas las ventas?")) return;
    try {
        const querySnapshot = await getDocs(ventasRef);
        const batch = writeBatch(db);
        querySnapshot.forEach(d => batch.delete(d.ref));
        await batch.commit();
        alert("Historial limpio");
    } catch (e) {
        console.error(e);
        alert("Error al borrar");
    }
};
// Configurar el formulario
formulario.addEventListener('submit', manejarEnvioFormulario);
