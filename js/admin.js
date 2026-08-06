// 1. IMPORTACIONES DE FIREBASE
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
    getDocs 
} from './db.js';

// Variables globales
const formulario = document.getElementById('form-producto');
const tablaCuerpo = document.getElementById('cuerpo-tabla');

// --- SECCIÓN DE PRODUCTOS ---

// Escuchar productos en tiempo real
onSnapshot(productosRef, (snapshot) => {
    const productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarTablaProductos(productos);
});

function renderizarTablaProductos(productos) {
    if (!tablaCuerpo) return;

    tablaCuerpo.innerHTML = productos.map(p => {
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
                    <button class="btn-editar" data-id="${p.id}" data-nombre="${p.nombre}" data-precio="${p.precio}" data-categoria="${p.categoria}" data-imagen="${p.imagen}">✏️</button>
                    <button class="btn-eliminar" data-id="${p.id}">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');

    asignarEventosBotones();
}

async function manejarEnvioFormulario(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value;
    const precio = parseFloat(document.getElementById('precio').value);
    const imagen = document.getElementById('imagen').value.trim();
    const categoria = document.getElementById('categoria').value;
    const editId = formulario.dataset.editId;

    if (!nombre || isNaN(precio)) return alert("Revisa los datos ingresados");

    const datosProducto = { 
        nombre, 
        precio, 
        imagen: imagen || "🌮", 
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

if (formulario) {
    formulario.addEventListener('submit', manejarEnvioFormulario);
}

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
            window.scrollTo(0, 0);
        };
    });
}

// --- SECCIÓN DE VENTAS Y CORTE DE CAJA ---

// Listener único para ventas en tiempo real
onSnapshot(ventasRef, (snapshot) => {
    const ventas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarVentas(ventas);
    calcularTotalesCaja(ventas);
});

function renderizarVentas(ventas) {
    const tablaVentas = document.getElementById('cuerpo-ventas');
    const resumenGrid = document.getElementById('resumen-dias-grid');

    // 1. Agrupar las ventas por fecha (DD/MM/YYYY)
    const ventasPorDia = ventas.reduce((grupos, venta) => {
        const fechaSolo = venta.fecha.split(',')[0].trim();
        if (!grupos[fechaSolo]) {
            grupos[fechaSolo] = [];
        }
        grupos[fechaSolo].push(venta);
        return grupos;
    }, {});

    // 2. Orden cronológico para numerar los días
    const diasAsc = Object.keys(ventasPorDia).sort((a, b) => new Date(a) - new Date(b));
    const numeroDeDia = {};
    diasAsc.forEach((fecha, index) => {
        numeroDeDia[fecha] = index + 1;
    });

    // 3. TARJETAS DE RESUMEN DIARIO
    let htmlResumenTarjetas = '';
    diasAsc.forEach((fecha) => {
        const ventasDelDia = ventasPorDia[fecha];
        const numDia = numeroDeDia[fecha];
        
        let totalDelDia = 0;
        let totalEfectivoDia = 0;
        let totalTransfDia = 0;
        let conteoProductosDia = {};

        ventasDelDia.forEach(v => {
            totalDelDia += v.total;
            if (v.metodoPago === 'transferencia') {
                totalTransfDia += v.total;
            } else {
                totalEfectivoDia += v.total;
            }
            
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
                <div class="stat-card-metric" style="font-size: 0.85rem; color: #555;">
                    💵 Efec: <strong>$${totalEfectivoDia.toFixed(2)}</strong> | 🏦 Trans: <strong>$${totalTransfDia.toFixed(2)}</strong>
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

   // 4. TABLA DE HISTORIAL (Descendente: lo más reciente primero)
    const diasDesc = Object.keys(ventasPorDia).sort((a, b) => new Date(b) - new Date(a));
    let htmlTabla = '';

    diasDesc.forEach((fecha) => {
        const ventasDelDia = ventasPorDia[fecha];
        const numDia = numeroDeDia[fecha];
        const totalDelDia = ventasDelDia.reduce((sum, v) => sum + v.total, 0);

        // Fila separadora con 4 celdas explícitas para alinear perfectamente con cada columna
        htmlTabla += `
            <tr class="fila-separador-dia">
                <td class="separador-info-fecha">
                    <span class="separador-badge">Día ${numDia}</span>
                    <span class="separador-fecha">📅 ${fecha}</span>
                </td>
                <td class="separador-info-productos">
                    <span class="separador-conteo">${ventasDelDia.length} ${ventasDelDia.length === 1 ? 'venta' : 'ventas'}</span>
                </td>
                <td></td>
                <td class="separador-total">$${totalDelDia.toFixed(2)}</td>
            </tr>
        `;

        const ventasOrdenadas = ventasDelDia.sort((a, b) => (b.fechaNum || 0) - (a.fechaNum || 0));
        ventasOrdenadas.forEach(v => {
            const esTransferencia = v.metodoPago === 'transferencia';
            const claseBadge = esTransferencia ? 'badge-transferencia' : 'badge-efectivo';
            const textoBadge = esTransferencia ? '🏦 Transferencia' : '💵 Efectivo';

            htmlTabla += `
                <tr>
                    <td>${v.fecha}</td>
                    <td>${v.detalle}</td>
                    <td><span class="badge-metodo ${claseBadge}">${textoBadge}</span></td>
                    <td><strong>$${v.total.toFixed(2)}</strong></td>
                </tr>
            `;
        });
    });

    if (resumenGrid) {
        resumenGrid.innerHTML = htmlResumenTarjetas || '<p style="color:#666;">No hay ventas registradas.</p>';
    }
    if (tablaVentas) {
        tablaVentas.innerHTML = htmlTabla || '<tr><td colspan="4">No hay ventas registradas</td></tr>';
    }
}

function calcularTotalesCaja(ventas) {
    const totalEfectivo = ventas
        .filter(v => v.metodoPago !== 'transferencia')
        .reduce((sum, v) => sum + v.total, 0);

    const totalTransferencia = ventas
        .filter(v => v.metodoPago === 'transferencia')
        .reduce((sum, v) => sum + v.total, 0);

    const elEfectivo = document.getElementById('caja-efectivo');
    const elTransferencia = document.getElementById('caja-transferencia');
    const elTotal = document.getElementById('caja-total');

    if (elEfectivo) elEfectivo.innerText = `$${totalEfectivo.toFixed(2)}`;
    if (elTransferencia) elTransferencia.innerText = `$${totalTransferencia.toFixed(2)}`;
    if (elTotal) elTotal.innerText = `$${(totalEfectivo + totalTransferencia).toFixed(2)}`;
}

// --- ACCIONES EXCEL Y BORRADO ---

window.descargarExcel = async function() {
    try {
        const querySnapshot = await getDocs(ventasRef);
        const ventas = querySnapshot.docs.map(doc => doc.data());

        if (ventas.length === 0) return alert("No hay ventas registradas.");

        let csvContent = "\ufeffFecha,Detalle,Método de Pago,Total\n";
        ventas.forEach(v => {
            const detalleLimpio = v.detalle.replace(/,/g, " -"); 
            const metodo = v.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo';
            csvContent += `${v.fecha},${detalleLimpio},${metodo},${v.total}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Ventas_Reporte_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
        link.click();
    } catch (e) {
        console.error(e);
        alert("Error al generar el reporte Excel.");
    }
};

window.borrarHistorialVentas = async function() {
    if (!confirm("¿Borrar todo el historial de ventas? Esta acción no se puede deshacer.")) return;
    try {
        const querySnapshot = await getDocs(ventasRef);
        const batch = writeBatch(db);
        querySnapshot.forEach(d => batch.delete(d.ref));
        await batch.commit();
        alert("Historial borrado correctamente.");
    } catch (e) {
        console.error(e);
        alert("Error al borrar el historial.");
    }
};