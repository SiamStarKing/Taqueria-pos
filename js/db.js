import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
    collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, writeBatch, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBeTTgusnbNnqGFtPqQoJT0sadfnMHzr3U",
    authDomain: "taqueria-4a42c.firebaseapp.com",
    projectId: "taqueria-4a42c",
    storageBucket: "taqueria-4a42c.firebasestorage.app",
    messagingSenderId: "84177217352",
    appId: "1:84177217352:web:9b73d2b96ee54b996c357d",
    measurementId: "G-JXK7PK40Z2"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const productosRef = collection(db, "productos");
const ventasRef = collection(db, "ventas");

export { db, productosRef, ventasRef, addDoc, onSnapshot, doc, deleteDoc, updateDoc, writeBatch, getDocs };