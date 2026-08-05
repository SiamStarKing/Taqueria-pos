// 1. IMPORTAMOS LAS FUNCIONES DE FIREBASE (Asegúrate que db.js esté configurado)
import { 
    db, 
    productosRef, 
    ventasRef, 
    addDoc, 
    onSnapshot, 
    doc, 
    deleteDoc, 
    updateDoc, 
    writeBatch, 
    getDocs,
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
    const imagen = document.getElementById('imagen').value.trim(); // Lee el texto o emoji
    const categoria = document.getElementById('categoria').value;
    const editId = formulario.dataset.editId;

    if (!nombre || isNaN(precio)) return alert("Revisa los datos");

    const datosProducto = { 
        nombre, 
        precio, 
        imagen: imagen || "🌮", // Si dejas vacío, pone el taco
        categoria 
    };

    try {
        if (editId) {
            await updateDoc(doc(db, "productos", editId), datosProducto);
            delete formulario.dataset.editId;
            document.querySelector('.btn-guardar').innerText = "Guardar Producto";
        } else {
            await addDoc(productosRef, datosProducto);
        }
        
        formulario.reset();
        alert("¡Producto guardado correctamente!");
    } catch (error) {
        console.error("Error:", error);
        alert("Error al guardar en la nube.");
    }
}

// --- SECCIÓN DE VENTAS (FIREBASE) ---

onSnapshot(ventasRef, (snapshot) => {
    const ventas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarVentas(ventas);
});

function renderizarVentas(ventas) {
    const tablaVentas = document.getElementById('cuerpo-ventas');
    const resumenGrid = document.getElementById('resumen-dias-grid');

    // 1. Agrupar las ventas por fecha
    const ventasPorDia = ventas.reduce((grupos, venta) => {
        const fechaSolo = venta.fecha.split(',')[0].trim();
        if (!grupos[fechaSolo]) {
            grupos[fechaSolo] = [];
        }
        grupos[fechaSolo].push(venta);
        return grupos;
    }, {});

    // 2. Calcular número de día en orden cronológico (Día 1 = fecha más antigua)
    const diasAsc = Object.keys(ventasPorDia).sort((a, b) => new Date(a) - new Date(b));
    const numeroDeDia = {};
    diasAsc.forEach((fecha, index) => {
        numeroDeDia[fecha] = index + 1;
    });

    // 3. GENERAR RESUMEN DE VENTAS (Ascendente: Día 1 -> Día 2 -> Día 3)
    let htmlResumenTarjetas = '';
    diasAsc.forEach((fecha) => {
        const ventasDelDia = ventasPorDia[fecha];
        const numDia = numeroDeDia[fecha];
        
        let totalDelDia = 0;
        let conteoProductosDia = {};

        ventasDelDia.forEach(v => {
            totalDelDia += v.total;
            
            const partes = v.detalle.split(', ');
            partes.forEach(p => {
                const match = p.match(/(\d+)x (.+)/);
                if (match) {
                    const cant = parseInt(match[1]);
                    const nombre = match[2];
                    conteoProductosDia[nombre] = (conteoProductosDia[nombre] || 0) + cant;
                }
            });
        });

        let productoEstrellaDia = "-";
        let maxVentasDia = 0;
        for (const [nombre, cantidad] of Object.entries(conteoProductosDia)) {
            if (cantidad > maxVentasDia) {
                maxVentasDia = cantidad;
                productoEstrellaDia = nombre;
            }
        }

        htmlResumenTarjetas += `
            <div class="stat-card-dia">
                <div class="stat-card-header">
                    <span class="badge-dia">Día ${numDia}</span>
                    <span class="fecha-texto">📅 ${fecha}</span>
                </div>
                <div class="stat-card-metric">
                    <span class="label">Total Vendido:</span>
                    <span class="valor-dinero">$${totalDelDia.toFixed(2)}</span>
                </div>
                <div class="stat-card-metric">
                    <span class="label">Producto Estrella:</span>
                    <span class="valor-estrella">⭐ ${productoEstrellaDia}</span>
                </div>
                <div class="stat-card-metric">
                    <span class="label">Ventas Realizadas:</span>
                    <span class="valor-conteo">${ventasDelDia.length}</span>
                </div>
            </div>
        `;
    });

    // 4. GENERAR TABLA HISTORIAL (Descendente: Lo más reciente primero)
    const diasDesc = Object.keys(ventasPorDia).sort((a, b) => new Date(b) - new Date(a));
    let htmlTabla = '';

    diasDesc.forEach((fecha) => {
        const ventasDelDia = ventasPorDia[fecha];
        const numDia = numeroDeDia[fecha]; // Mantiene su etiqueta correcta (ej. Día 2)
        const totalDelDia = ventasDelDia.reduce((sum, v) => sum + v.total, 0);

        htmlTabla += `
            <tr class="fila-separador-dia">
                <td class="separador-info-fecha">
                    <span class="separador-badge">Día ${numDia}</span>
                    <span class="separador-fecha">📅 ${fecha}</span>
                </td>
                <td class="separador-info-productos">
                    <span class="separador-conteo">${ventasDelDia.length} ${ventasDelDia.length === 1 ? 'venta' : 'ventas'}</span>
                </td>
                <td class="separador-total">
                    Total: $${totalDelDia.toFixed(2)}
                </td>
            </tr>
        `;

        // Ordenar las ventas de ese día de la más reciente a la más antigua
        const ventasOrdenadas = ventasDelDia.sort((a, b) => (b.fechaNum || 0) - (a.fechaNum || 0));
        ventasOrdenadas.forEach(v => {
            htmlTabla += `
                <tr>
                    <td style="padding-left: 20px;">${v.fecha}</td>
                    <td>${v.detalle}</td>
                    <td>$${v.total.toFixed(2)}</td>
                </tr>
            `;
        });
    });

    // Renderizar los resultados
    if (resumenGrid) {
        resumenGrid.innerHTML = htmlResumenTarjetas || '<p style="color:#666;">No hay ventas registradas.</p>';
    }
    tablaVentas.innerHTML = htmlTabla || '<tr><td colspan="3">No hay ventas registradas</td></tr>';
}

// --- FUNCIONES DE APOYO ---

function asignarEventosBotones() {
    // Evento Eliminar (Se queda igual)
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.onclick = async () => {
            if (confirm("¿Eliminar producto?")) {
                await deleteDoc(doc(db, "productos", btn.dataset.id));
            }
        };
    });

    // Evento Editar (Corregido para no dar error de NULL)
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.onclick = () => {
            document.getElementById('nombre').value = btn.dataset.nombre;
            document.getElementById('precio').value = btn.dataset.precio;
            document.getElementById('categoria').value = btn.dataset.categoria;
            document.getElementById('imagen').value = btn.dataset.imagen; // Rellena la URL/Emoji

            formulario.dataset.editId = btn.dataset.id;
            document.querySelector('.btn-guardar').innerText = "Actualizar Producto";
            window.scrollTo(0, 0);
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
