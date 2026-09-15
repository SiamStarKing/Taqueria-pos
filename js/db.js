import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager,
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    deleteDoc, 
    updateDoc, 
    writeBatch, 
    getDocs, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuración de la app en Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBeTTgusnbNnqGFtPqQoJT0sadfnMHzr3U",
    authDomain: "taqueria-4a42c.firebaseapp.com",
    projectId: "taqueria-4a42c",
    storageBucket: "taqueria-4a42c.firebasestorage.app",
    messagingSenderId: "84177217352",
    appId: "1:84177217352:web:9b73d2b96ee54b996c357d",
    measurementId: "G-JXK7PK40Z2"
};

// Inicialización de la App
const app = initializeApp(firebaseConfig);

// Inicialización de Firestore con Persistencia Local (Modo Offline + Soporte Multi-pestaña)
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// Referencias a Colecciones de Firestore
const productosRef = collection(db, "productos");
const ventasRef = collection(db, "ventas");

// Exportación única para consumir en app.js
export { 
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
    setDoc 
};