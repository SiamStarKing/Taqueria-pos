// Importar las funciones necesarias de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, doc, deleteDoc, updateDoc } 
from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tu configuración de Firebase (PEGA LA TUYA AQUÍ)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBeTTgusnbNnqGFtPqQoJT0sadfnMHzr3U",
    authDomain: "taqueria-4a42c.firebaseapp.com",
    projectId: "taqueria-4a42c",
    storageBucket: "taqueria-4a42c.firebasestorage.app",
    messagingSenderId: "84177217352",
    appId: "1:84177217352:web:9b73d2b96ee54b996c357d",
    measurementId: "G-JXK7PK40Z2"
};
// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencias a las colecciones (Tablas en la nube)
const productosRef = collection(db, "productos");
const ventasRef = collection(db, "ventas"); // Agregamos ventas de una vez

// EXPORTAMOS TODO PARA QUE ADMIN.JS PUEDA USARLO
export { 
    db, 
    productosRef, 
    ventasRef, 
    addDoc, 
    getDocs, 
    onSnapshot, 
    doc, 
    deleteDoc, 
    updateDoc 
};

// 1. Guardar un producto (Mantenemos esta por si la usas directo)
export async function guardarProducto(producto) {
    try {
        await addDoc(productosRef, producto);
        console.log("Producto guardado en la nube");
    } catch (e) {
        console.error("Error al guardar: ", e);
    }
}